/*
 * === KODE ARDUINO IDE (ESP32) ===
 * Silakan copy dan paste semua kode ini ke aplikasi Arduino IDE Anda, lalu upload ke ESP32.
 * 
 * Kode ini adalah GABUNGAN dari:
 * 1. Kontrol Telegram (Bot Telegram persis seperti aslinya, /start akan berfungsi)
 * 2. Lokal Web Server (Agar Website bisa menekan tombol dan memberi perintah)
 * 3. Sensor DHT11 (Untuk mengecek Suhu & Kelembapan di Pin 4)
 * 
 * UPDATE: Menggunakan FreeRTOS (Dual Core) agar Telegram tidak mengganggu / membuat lag Website.
 * Sensor DHT11 dibaca secara non-blocking setiap 3 detik.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include "DHT.h" // Pastikan library "DHT sensor library by Adafruit" sudah diinstall

// Konfigurasi WiFi & Bot
const char* ssid = "iPhone";
const char* password = "rendyy123";
#define BOTtoken "8800775876:AAFFksNwh17FMwws13HgTn6jD4MMNp8-UdE"
#define CHAT_ID "8634626398"

// Pin Relay (Aktif LOW)
#define RELAY1 23
#define RELAY2 19
#define RELAY3 18
#define RELAY4 5

// Pin DHT11
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Inisialisasi Klien
WiFiClientSecure client;
UniversalTelegramBot bot(BOTtoken, client);
WebServer server(80); // WebServer untuk komunikasi dengan Website

int botRequestDelay = 2000; 
unsigned long lastTimeBotRan;

bool relay1State = HIGH;
bool relay2State = HIGH;
bool relay3State = HIGH;
bool relay4State = HIGH;

// Variabel Variasi
bool variasiRunning = false;
int variasiMode = 0;
unsigned long lastVariasiTime = 0;
int variasiStep = 0;
const int variasiDelay = 150;

// Variabel Asynchronous Sensor DHT11 
float currentTemp = 0.0;
float currentHum = 0.0;
unsigned long lastDhtTime = 0;

// Fungsi untuk mengizinkan akses dari website (CORS)
void enableCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS, POST, PUT");
  server.sendHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Cache-Control, Access-Control-Request-Private-Network");
  server.sendHeader("Access-Control-Allow-Private-Network", "true");
}

// Handler untuk komunikasi Website -> ESP32
void handleRelay() {
  enableCORS();
  if (server.hasArg("id") && server.hasArg("state")) {
    int id = server.arg("id").toInt();
    String stateStr = server.arg("state");
    bool state = (stateStr == "on") ? LOW : HIGH; 
    
    variasiRunning = false;
    variasiMode = 0;
    
    if (id == 1) { relay1State = state; digitalWrite(RELAY1, relay1State); }
    else if (id == 2) { relay2State = state; digitalWrite(RELAY2, relay2State); }
    else if (id == 3) { relay3State = state; digitalWrite(RELAY3, relay3State); }
    else if (id == 4) { relay4State = state; digitalWrite(RELAY4, relay4State); }
    
    server.send(204); // 204 No Content agar browser tidak menunggu body
  } else {
    server.send(400, "text/plain", "Bad Request");
  }
}

void handleAll() {
  enableCORS();
  if (server.hasArg("state")) {
    String stateStr = server.arg("state");
    bool state = (stateStr == "on") ? LOW : HIGH;
    
    variasiRunning = false;
    variasiMode = 0;
    
    relay1State = relay2State = relay3State = relay4State = state;
    digitalWrite(RELAY1, state);
    digitalWrite(RELAY2, state);
    digitalWrite(RELAY3, state);
    digitalWrite(RELAY4, state);
    server.send(204);
  } else {
    server.send(400, "text/plain", "Bad Request");
  }
}

void handleVariasi() {
  enableCORS();
  if (server.hasArg("mode")) {
    variasiMode = server.arg("mode").toInt();
    variasiRunning = true;
    variasiStep = 0;
    lastVariasiTime = millis();
    server.send(204);
  } else {
    server.send(400, "text/plain", "Bad Request");
  }
}

void handleStop() {
  enableCORS();
  variasiRunning = false;
  variasiMode = 0;
  
  relay1State = relay2State = relay3State = relay4State = HIGH;
  digitalWrite(RELAY1, HIGH);
  digitalWrite(RELAY2, HIGH);
  digitalWrite(RELAY3, HIGH);
  digitalWrite(RELAY4, HIGH);
  server.send(204);
}

void handleSync() {
  enableCORS();
  
  // Data DHT11 diambil dari variabel global secara instant (Tanpa menyebabkan blok)
  String json = "{";
  json += "\"temperature\":" + String(currentTemp) + ",";
  json += "\"humidity\":" + String(currentHum) + ",";
  json += "\"variasiMode\":" + String(variasiRunning ? variasiMode : 0) + ",";
  json += "\"r1\":" + String(relay1State == LOW ? 1 : 0) + ",";
  json += "\"r2\":" + String(relay2State == LOW ? 1 : 0) + ",";
  json += "\"r3\":" + String(relay3State == LOW ? 1 : 0) + ",";
  json += "\"r4\":" + String(relay4State == LOW ? 1 : 0);
  json += "}";
  server.send(200, "application/json", json);
}

void handleNewMessages(int numNewMessages) {
  for (int i=0; i<numNewMessages; i++) {
    String chat_id = String(bot.messages[i].chat_id);
    if (chat_id != CHAT_ID) continue;
    
    String text = bot.messages[i].text;
    String from_name = bot.messages[i].from_name;

    if (text == "/start") {
      String welcome = "Welcome, " + from_name + ".\n";
      welcome += "Gunakan perintah berikut untuk kontrol relay.\n\n";
      welcome += "/lampu1_on - Nyalakan Lampu 1\n";
      welcome += "/lampu1_off - Matikan Lampu 1\n";
      welcome += "/lampu2_on - Nyalakan Lampu 2\n";
      welcome += "/lampu2_off - Matikan Lampu 2\n";
      welcome += "/lampu3_on - Nyalakan Lampu 3\n";
      welcome += "/lampu3_off - Matikan Lampu 3\n";
      welcome += "/lampu4_on - Nyalakan Lampu 4\n";
      welcome += "/lampu4_off - Matikan Lampu 4\n";
      welcome += "/all_on - Nyalakan Semua Lampu\n";
      welcome += "/all_off - Matikan Semua Lampu\n";
      welcome += "/status - Cek Status Semua Lampu\n\n";
      welcome += "=== VARIASI ===\n";
      welcome += "/variasi1 - Running Light (1->3->2->4)\n";
      welcome += "/variasi2 - Bolak-Balik (1->2->3->4->3->2->1)\n";
      welcome += "/stop - Stop Variasi\n";
      bot.sendMessage(chat_id, welcome, "");
    }

    if (text == "/lampu1_on") { variasiRunning = false; variasiMode = 0; relay1State = LOW; digitalWrite(RELAY1, relay1State); bot.sendMessage(chat_id, "Lampu 1 NYALA", ""); }
    if (text == "/lampu1_off") { variasiRunning = false; variasiMode = 0; relay1State = HIGH; digitalWrite(RELAY1, relay1State); bot.sendMessage(chat_id, "Lampu 1 MATI", ""); }
    
    if (text == "/lampu2_on") { variasiRunning = false; variasiMode = 0; relay2State = LOW; digitalWrite(RELAY2, relay2State); bot.sendMessage(chat_id, "Lampu 2 NYALA", ""); }
    if (text == "/lampu2_off") { variasiRunning = false; variasiMode = 0; relay2State = HIGH; digitalWrite(RELAY2, relay2State); bot.sendMessage(chat_id, "Lampu 2 MATI", ""); }
    
    if (text == "/lampu3_on") { variasiRunning = false; variasiMode = 0; relay3State = LOW; digitalWrite(RELAY3, relay3State); bot.sendMessage(chat_id, "Lampu 3 NYALA", ""); }
    if (text == "/lampu3_off") { variasiRunning = false; variasiMode = 0; relay3State = HIGH; digitalWrite(RELAY3, relay3State); bot.sendMessage(chat_id, "Lampu 3 MATI", ""); }
    
    if (text == "/lampu4_on") { variasiRunning = false; variasiMode = 0; relay4State = LOW; digitalWrite(RELAY4, relay4State); bot.sendMessage(chat_id, "Lampu 4 NYALA", ""); }
    if (text == "/lampu4_off") { variasiRunning = false; variasiMode = 0; relay4State = HIGH; digitalWrite(RELAY4, relay4State); bot.sendMessage(chat_id, "Lampu 4 MATI", ""); }
    
    if (text == "/all_on") {
      variasiRunning = false; variasiMode = 0; bot.sendMessage(chat_id, "Semua Lampu NYALA", "");
      relay1State = relay2State = relay3State = relay4State = LOW;
      digitalWrite(RELAY1, LOW); digitalWrite(RELAY2, LOW); digitalWrite(RELAY3, LOW); digitalWrite(RELAY4, LOW);
    }
    if (text == "/all_off") {
      variasiRunning = false; variasiMode = 0; bot.sendMessage(chat_id, "Semua Lampu MATI", "");
      relay1State = relay2State = relay3State = relay4State = HIGH;
      digitalWrite(RELAY1, HIGH); digitalWrite(RELAY2, HIGH); digitalWrite(RELAY3, HIGH); digitalWrite(RELAY4, HIGH);
    }

    if (text == "/status") {
      String status = "Status Lampu:\n";
      status += "Lampu 1: " + String(relay1State == LOW ? "NYALA" : "MATI") + "\n";
      status += "Lampu 2: " + String(relay2State == LOW ? "NYALA" : "MATI") + "\n";
      status += "Lampu 3: " + String(relay3State == LOW ? "NYALA" : "MATI") + "\n";
      status += "Lampu 4: " + String(relay4State == LOW ? "NYALA" : "MATI") + "\n";
      status += "Variasi: " + String(variasiRunning ? "RUNNING" : "STOPPED") + "\n";
      
      status += "\n🌡️ Suhu: " + String(currentTemp) + "°C\n💧 Lembap: " + String(currentHum) + "%";
      bot.sendMessage(chat_id, status, "");
    }

    if (text == "/variasi1") {
      variasiRunning = true; variasiMode = 1; variasiStep = 0; lastVariasiTime = millis();
      bot.sendMessage(chat_id, "✅ Variasi 1 AKTIF", "");
    }
    
    if (text == "/variasi2") {
      variasiRunning = true; variasiMode = 2; variasiStep = 0; lastVariasiTime = millis();
      bot.sendMessage(chat_id, "✅ Variasi 2 AKTIF", "");
    }
    
    if (text == "/stop") {
      variasiRunning = false; variasiMode = 0; bot.sendMessage(chat_id, "⛔ Variasi DIHENTIKAN", "");
      relay1State = relay2State = relay3State = relay4State = HIGH;
      digitalWrite(RELAY1, HIGH); digitalWrite(RELAY2, HIGH); digitalWrite(RELAY3, HIGH); digitalWrite(RELAY4, HIGH);
    }
  }
}

// Logic Variasi Light 1
void runVariasi1() {
  if (millis() - lastVariasiTime >= variasiDelay) {
    lastVariasiTime = millis();
    digitalWrite(RELAY1, HIGH); digitalWrite(RELAY2, HIGH); digitalWrite(RELAY3, HIGH); digitalWrite(RELAY4, HIGH);
    switch(variasiStep) {
      case 0: digitalWrite(RELAY1, LOW); relay1State = LOW; break;
      case 1: digitalWrite(RELAY3, LOW); relay3State = LOW; break;
      case 2: digitalWrite(RELAY2, LOW); relay2State = LOW; break;
      case 3: digitalWrite(RELAY4, LOW); relay4State = LOW; break;
    }
    variasiStep++; if (variasiStep > 3) variasiStep = 0;
  }
}

// Logic Variasi Light 2
void runVariasi2() {
  if (millis() - lastVariasiTime >= variasiDelay) {
    lastVariasiTime = millis();
    digitalWrite(RELAY1, HIGH); digitalWrite(RELAY2, HIGH); digitalWrite(RELAY3, HIGH); digitalWrite(RELAY4, HIGH);
    switch(variasiStep) {
      case 0: digitalWrite(RELAY1, LOW); relay1State = LOW; break;
      case 1: digitalWrite(RELAY2, LOW); relay2State = LOW; break;
      case 2: digitalWrite(RELAY3, LOW); relay3State = LOW; break;
      case 3: digitalWrite(RELAY4, LOW); relay4State = LOW; break;
      case 4: digitalWrite(RELAY3, LOW); relay3State = LOW; break;
      case 5: digitalWrite(RELAY2, LOW); relay2State = LOW; break;
    }
    variasiStep++; if (variasiStep > 5) variasiStep = 0;
  }
}

// Task FreeRTOS Telegram di Core 0 agar tidak mengganggu Web/Variasi pada Core 1
void telegramTask(void * pvParameters) {
  for(;;) {
    if (millis() > lastTimeBotRan + botRequestDelay)  {
      int numNewMessages = bot.getUpdates(bot.last_message_received + 1);
      while(numNewMessages) {
        handleNewMessages(numNewMessages);
        numNewMessages = bot.getUpdates(bot.last_message_received + 1);
      }
      lastTimeBotRan = millis();
    }
    vTaskDelay(10 / portTICK_PERIOD_MS); // Yield ke idle task supaya watchdog tidak error
  }
}

void setup() {
  Serial.begin(115200);

  // Setup PIN
  pinMode(RELAY1, OUTPUT);
  pinMode(RELAY2, OUTPUT);
  pinMode(RELAY3, OUTPUT);
  pinMode(RELAY4, OUTPUT);
  
  digitalWrite(RELAY1, relay1State);
  digitalWrite(RELAY2, relay2State);
  digitalWrite(RELAY3, relay3State);
  digitalWrite(RELAY4, relay4State);
  
  // Setup Sensor DHT
  dht.begin();

  // Koneksi WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  client.setCACert(TELEGRAM_CERTIFICATE_ROOT);
  
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address untuk Web: ");
  Serial.println(WiFi.localIP());

  // Kirim notifikasi IP ke Telegram agar pengguna tahu
  String startupMsg = "✅ Sistem Berhasil Booting!\n";
  startupMsg += "🌐 IP Address Anda: " + WiFi.localIP().toString() + "\n";
  startupMsg += "Silakan masukkan IP ini ke kolom IP Address di Website agar tombol web berfungsi!";
  bot.sendMessage(CHAT_ID, startupMsg, "");

  // Routing URL WebServer untuk Frontend React Web ini
  server.on("/relay", handleRelay);
  server.on("/all", handleAll);
  server.on("/variasi", handleVariasi);
  server.on("/stop", handleStop);
  server.on("/sync", handleSync); 
  
  // Tangani error jika routing tidak ada
  server.onNotFound([]() {
    enableCORS();
    if(server.method() == HTTP_OPTIONS) {
      server.send(204);
    } else {
      server.send(404, "text/plain", "Not Found");
    }
  });

  server.begin();
  Serial.println("HTTP Web Server berjalan");
  
  // Memulai Polling Telegram di Thread/Core Terpisah (Core 0) !!
  xTaskCreatePinnedToCore(
    telegramTask,       // Fungsi Task
    "Telegram_Task",    // Nama Task
    8192,               // Ukuran Stack
    NULL,               // Parameter
    1,                  // Prioritas
    NULL,               // Handle Task
    0                   // Pin ke Core 0
  );
}

void loop() {
  // 1. Tangani Request dari Website secara lancar (Tanpa Lag)
  server.handleClient();
  
  // 2. Baca Sensor DHT11 tiap 3 detik tanpa memblokir
  if (millis() - lastDhtTime >= 3000) {
     lastDhtTime = millis();
     float t = dht.readTemperature();
     float h = dht.readHumidity();
     if (!isnan(t)) currentTemp = t;
     if (!isnan(h)) currentHum = h;
  }
  
  // 3. Tangani Pola Kedip Variasi
  if (variasiRunning) {
    if (variasiMode == 1) runVariasi1();
    else if (variasiMode == 2) runVariasi2();
  }
  
  // Telegram Bot dihandle oleh FreeRTOS Task (telegramTask) di latar belakang (Background)
}

