import { useState, useEffect, useRef, useCallback } from 'react';
import { Power, PowerOff, Cpu, Square, Zap, Link, Mic, MicOff, Thermometer, Droplets, Activity, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const TELEGRAM_BOT_TOKEN = "8800775876:AAFFksNwh17FMwws13HgTn6jD4MMNp8-UdE";
const TELEGRAM_CHAT_ID = "8634626398";

const notifyTelegram = async (message: string) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message }),
    });
  } catch (error) {
    console.error("Gagal mengirim notifikasi Telegram:", error);
  }
};

interface Relay {
  id: number;
  name: string;
  pin: number;
  isOn: boolean;
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
}

export default function App() {
  const [relays, setRelays] = useState<Relay[]>([
    { id: 1, name: 'Lampu 1', pin: 23, isOn: false },
    { id: 2, name: 'Lampu 2', pin: 19, isOn: false },
    { id: 3, name: 'Lampu 3', pin: 18, isOn: false },
    { id: 4, name: 'Lampu 4', pin: 5, isOn: false },
  ]);

  const [variasiMode, setVariasiMode] = useState<number>(0);
  const [espIp, setEspIp] = useState<string>('192.168.1.100');
  const [isConnecting, setIsConnecting] = useState(false);
  const isCommandingRef = useRef(false);
  const variasiStepRef = useRef(0);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [temperature, setTemperature] = useState<number>(0);
  const [humidity, setHumidity] = useState<number>(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupport, setVoiceSupport] = useState(false);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [{
      id: Date.now().toString() + Math.random().toString(),
      timestamp: new Date().toLocaleTimeString('id-ID'),
      message
    }, ...prev].slice(0, 50));
  }, []);

  const recognitionRef = useRef<any>(null);
  
  // Ref to hold the latest processVoiceCommand (to deal with stale closures in useEffect)
  const processVoiceCommandRef = useRef<(cmd: string) => void>();

  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      setVoiceSupport(true);
      recognitionRef.current = new SpeechRec();
      recognitionRef.current.lang = 'id-ID';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      let lastVoiceCmdTime = 0;
      recognitionRef.current.onresult = (event: any) => {
        setIsListening(false);
        const command = event.results[0][0].transcript.toLowerCase();
        
        const now = Date.now();
        if (now - lastVoiceCmdTime < 2000) {
            console.log("Voice command debounced:", command);
            return;
        }
        lastVoiceCmdTime = now;
        
        addLog(`🎙️ Suara: "${command}"`);
        
        // Jeda sedikit agar proses memori/mic di HP selesai sebelum mengirim perintah HTTPS/HTTP
        setTimeout(() => {
            if (processVoiceCommandRef.current) processVoiceCommandRef.current(command);
        }, 200);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech error", event.error);
        setIsListening(false);
        if (event.error === 'no-speech') {
            addLog(`❌ Tidak dapat mendengar suara.`);
        } else {
            addLog(`❌ Error Suara: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        addLog("🎙️ Mendengarkan perintah suara (coba 'nyala semua lampu')...");
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  const processVoiceCommand = (cmd: string) => {
    let handled = false;
    
    // Check for variasi first so "nyala variasi 1" doesn't trigger "nyala lampu 1"
    if (cmd.includes('variasi 1') || cmd.includes('variasi satu')) {
        startVariasi(1); handled = true;
    } else if (cmd.includes('variasi 2') || cmd.includes('variasi dua')) {
        startVariasi(2); handled = true;
    } else if (cmd.includes('stop') || cmd.includes('berhenti')) {
        stopVariasi(); handled = true;
    } 
    // Then check for regular relays
    else if (cmd.includes('nyala') || cmd.includes('hidup') || cmd.includes('on')) {
        if (cmd.includes('semua')) { setAll(true); handled = true; }
        else if (cmd.includes('satu') || cmd.includes('1')) { toggleRelay(1, true); handled = true; }
        else if (cmd.includes('dua') || cmd.includes('2')) { toggleRelay(2, true); handled = true; }
        else if (cmd.includes('tiga') || cmd.includes('3')) { toggleRelay(3, true); handled = true; }
        else if (cmd.includes('empat') || cmd.includes('4')) { toggleRelay(4, true); handled = true; }
    } else if (cmd.includes('mati') || cmd.includes('matikan') || cmd.includes('off')) {
        if (cmd.includes('semua')) { setAll(false); handled = true; }
        else if (cmd.includes('satu') || cmd.includes('1')) { toggleRelay(1, false); handled = true; }
        else if (cmd.includes('dua') || cmd.includes('2')) { toggleRelay(2, false); handled = true; }
        else if (cmd.includes('tiga') || cmd.includes('3')) { toggleRelay(3, false); handled = true; }
        else if (cmd.includes('empat') || cmd.includes('4')) { toggleRelay(4, false); handled = true; }
    }
    
    if (!handled) {
       addLog(`❓ Perintah suara tidak dipahami: "${cmd}"`);
    }
  };

  useEffect(() => {
    processVoiceCommandRef.current = processVoiceCommand;
  }, [processVoiceCommand]);

  const syncControllerRef = useRef<AbortController | null>(null);

  // Fetch Status from ESP32
  useEffect(() => {
    let isMounted = true;
    let syncTimer: NodeJS.Timeout;

    const fetchSync = async () => {
      // Jika tab tidak aktif, jangan polling untuk menghemat resource ESP32
      if (document.hidden) {
        if (isMounted) syncTimer = setTimeout(fetchSync, 3000);
        return;
      }

      // Jika sedang mengirim perintah, skip polling agar tidak tabrakan di single-thread ESP32
      if (isCommandingRef.current) {
        if (isMounted) syncTimer = setTimeout(fetchSync, 1500);
        return;
      }
        
      if (!espIp || espIp.trim() === '') {
        if (isMounted) syncTimer = setTimeout(fetchSync, 3000);
        return;
      }
      
      try {
        const controller = new AbortController();
        syncControllerRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
        
        const response = await fetch(`http://${espIp}/sync?t=${Date.now()}`, {
          method: 'GET',
          // Tidak bisa pakai no-cors untuk sync karena kita butuh baca balik JSON-nya
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok && isMounted && !isCommandingRef.current) {
          const data = await response.json();
          setTemperature(data.temperature);
          setHumidity(data.humidity);
          
          setVariasiMode(prevMode => {
            if (data.variasiMode !== prevMode) {
              if (data.variasiMode !== 0) variasiStepRef.current = 0;
              return data.variasiMode;
            }
            return prevMode;
          });

          // Sync relays if variasi is not running dynamically
          if (data.variasiMode === 0) {
            setRelays(prev => {
              const needsUpdate = 
                prev[0].isOn !== (data.r1 === 1) ||
                prev[1].isOn !== (data.r2 === 1) ||
                prev[2].isOn !== (data.r3 === 1) ||
                prev[3].isOn !== (data.r4 === 1);
                
              if (needsUpdate) {
                return [
                  { ...prev[0], isOn: data.r1 === 1 },
                  { ...prev[1], isOn: data.r2 === 1 },
                  { ...prev[2], isOn: data.r3 === 1 },
                  { ...prev[3], isOn: data.r4 === 1 },
                ];
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // Silent fail for polling errors
      } finally {
        if (isMounted) syncTimer = setTimeout(fetchSync, 4000); // Polling tiap 4 detik agar ESP32 tidak hang!
      }
    };

    fetchSync();
    
    return () => { 
      isMounted = false; 
      clearTimeout(syncTimer); 
    };
  }, [espIp]);

  const sendCommand = async (path: string, maxRetries = 3) => {
    if (!espIp || espIp.trim() === '') return false;
    
    if (isCommandingRef.current) {
        addLog(`⏳ Menunggu... Perintah lain sedang berjalan.`);
        for (let w = 0; w < 15; w++) {
            await new Promise(res => setTimeout(res, 200));
            if (!isCommandingRef.current) break;
        }
    }
    
    setIsConnecting(true);
    isCommandingRef.current = true; // Lock the network thread
    
    // Abort any ongoing sync request to free up the ESP32
    if (syncControllerRef.current) {
      syncControllerRef.current.abort();
      syncControllerRef.current = null;
      await new Promise(resolve => setTimeout(resolve, 100)); // Beri waktu singkat untuk cleanup
    }
    
    const sep = path.includes('?') ? '&' : '?';
    const url = `http://${espIp}${path}${sep}t=${Date.now()}`;

    let success = false;
    let lastError = "";

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort("timeout"), 8000); 
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors', // Mencegah browser mengirimkan OPTIONS preflight yang membebani ESP32
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        // no-cors fetch will always return type: "opaque" and status: 0 if successful (no network error)
        success = true;
    } catch (error: any) {
        const errMsg = String(error.message || error.name || error);
        success = false;
        if (errMsg.toLowerCase().includes("fetch") || errMsg.toLowerCase().includes("network") || error.name === "TypeError") {
            lastError = "Koneksi Gagal (Mungkin diblokir browser atau ESP32 Sibuk).";
        } else if (errMsg === 'timeout' || error.name === 'AbortError' || errMsg.includes('aborted')) {
            lastError = `Koneksi Timeout ke ${espIp}. (Pastikan HP dan ESP32 di jaringan WiFi yang sama!)`;
        } else {
            lastError = errMsg;
        }
    }
    
    isCommandingRef.current = false;
    setIsConnecting(false);
    
    if (!success) {
      if (lastError.includes("Mixed Content")) {
         addLog(`🔒 AKSES DIBLOKIR BROWSER ke ${espIp}. Karena web berbasis HTTPS, browser menolak akses ke IP Lokal (HTTP).`);
         addLog(`🛠️ CARA FIX KHUSUS CHROME: Klik iKON GEMBOK 🔒 di samping URL -> Site Settings -> Ubah Insecure Content menjadi Allow -> Reload halaman.`);
      } else {
         addLog(`⚠️ Gagal mengirim perintah: ${path} ke ${espIp}. (${lastError})`);
      }
    }
    return success;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (variasiMode === 1) {
      const pattern = [1, 3, 2, 4];
      interval = setInterval(() => {
        setRelays(prev => prev.map(r => ({
          ...r,
          isOn: r.id === pattern[variasiStepRef.current]
        })));
        variasiStepRef.current = (variasiStepRef.current + 1) % pattern.length;
      }, 150);
    } else if (variasiMode === 2) {
      const pattern = [1, 2, 3, 4, 3, 2];
      interval = setInterval(() => {
        setRelays(prev => prev.map(r => ({
          ...r,
          isOn: r.id === pattern[variasiStepRef.current]
        })));
        variasiStepRef.current = (variasiStepRef.current + 1) % pattern.length;
      }, 150);
    }

    return () => clearInterval(interval);
  }, [variasiMode]);

  const toggleRelay = async (id: number, forceState?: boolean) => {
    setVariasiMode(0); 
    const relay = relays.find(r => r.id === id);
    if (!relay) return;
    
    const newState = forceState !== undefined ? forceState : !relay.isOn;
    
    // Update local state temporarily
    setRelays(prev => prev.map(r => r.id === id ? { ...r, isOn: newState } : r));
    
    const success = await sendCommand(`/relay?id=${id}&state=${newState ? 'on' : 'off'}`);
    
    if (success) {
      const msg = `🌐 Notifikasi Web:\n${relay.name} diubah menjadi ${newState ? 'NYALA' : 'MATI'}`;
      notifyTelegram(msg);
      addLog(msg);
    } else {
      // Revert if failed
      setRelays(prev => prev.map(r => r.id === id ? { ...r, isOn: !newState } : r));
      addLog(`❌ Batal: ESP32 tidak bisa dihubungi, pastikan IP Address benar.`);
    }
  };

  const setAll = async (state: boolean) => {
    setVariasiMode(0);
    const oldRelays = [...relays]; // backup for reverting
    
    setRelays(prev => prev.map(r => ({ ...r, isOn: state })));
    const success = await sendCommand(`/all?state=${state ? 'on' : 'off'}`);
    
    if (success) {
      const msg = `🌐 Notifikasi Web:\nSemua Lampu diubah menjadi ${state ? 'NYALA' : 'MATI'}`;
      notifyTelegram(msg);
      addLog(msg);
    } else {
      setRelays(oldRelays);
      addLog(`❌ Batal: ESP32 tidak bisa dihubungi, pastikan IP Address benar.`);
    }
  };

  const startVariasi = async (mode: number) => {
    const backupMode = variasiMode;
    variasiStepRef.current = 0;
    setVariasiMode(mode);
    const success = await sendCommand(`/variasi?mode=${mode}`);
    
    if (success) {
      const msg = `🌐 Notifikasi Web:\nVariasi ${mode} secara manual di AKTIFKAN dari Web.`;
      notifyTelegram(msg);
      addLog(msg);
    } else {
      setVariasiMode(backupMode);
      addLog(`❌ Batal: ESP32 tidak bisa dihubungi, pastikan IP Address benar.`);
    }
  };

  const stopVariasi = async () => {
    const backupMode = variasiMode;
    const backupRelays = [...relays];
    
    setVariasiMode(0);
    setRelays(prev => prev.map(r => ({ ...r, isOn: false })));
    const success = await sendCommand('/stop');
    
    if (success) {
      const msg = `🌐 Notifikasi Web:\nVariasi DIHENTIKAN dari Web. Semua lampu MATI.`;
      notifyTelegram(msg);
      addLog(msg);
    } else {
      setVariasiMode(backupMode);
      setRelays(backupRelays);
      addLog(`❌ Batal: ESP32 tidak bisa dihubungi, pastikan IP Address benar.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-[#CD5050] selection:text-white pb-12">
      {/* Header */}
      <header className="border-b border-gray-900 bg-gray-950 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#CD5050]/20 rounded-xl">
              <Cpu className="w-6 h-6 text-[#CD5050]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Erev IoT</h1>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full md:w-auto gap-3">
            <div className="flex items-center bg-gray-900 border border-gray-800 rounded-full px-4 py-1.5 focus-within:border-[#CD5050] focus-within:ring-2 focus-within:ring-[#CD5050]/20 transition-all">
              <Link className="w-4 h-4 text-gray-500 mr-2" />
              <input 
                type="text" 
                value={espIp}
                onChange={(e) => setEspIp(e.target.value)}
                placeholder="IP ESP32 (ex: 192.168.1.100)"
                className="bg-transparent border-none outline-none text-sm font-medium text-gray-200 placeholder-gray-600 w-44"
              />
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isConnecting ? 'bg-orange-950/50 border-orange-900' : 'bg-gray-900 border-gray-800'}`}>
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${variasiMode !== 0 ? 'bg-purple-500' : 'bg-[#CD5050]'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${variasiMode !== 0 ? 'bg-purple-500' : 'bg-[#CD5050]'}`}></span>
              </span>
              <span className="text-xs font-semibold text-gray-300 tracking-wide whitespace-nowrap">
                {isConnecting ? 'MENGIRIM...' : variasiMode === 1 ? 'VARIASI 1 JALAN' : variasiMode === 2 ? 'VARIASI 2 JALAN' : 'Sistem Siap'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Left Column: UI Controls & Sensors */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Top Bar: DHT11 Sensor & Voice Control */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-xl text-orange-500">
                  <Thermometer className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Suhu PIn 4</p>
                  <p className="text-xl font-bold text-gray-900">{temperature}°C</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl text-blue-500">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kelembapan</p>
                  <p className="text-xl font-bold text-gray-900">{humidity}%</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kontrol Suara</p>
                  <p className="text-sm font-semibold text-gray-600 mt-1">
                    {voiceSupport ? (isListening ? 'Mendengarkan...' : 'Ketuk Mic') : 'Tidak Didukung'}
                  </p>
                </div>
                <button 
                  onClick={toggleListen}
                  disabled={!voiceSupport}
                  className={`p-3 rounded-full transition-all focus:outline-none ${isListening ? 'bg-[#CD5050] text-white shadow-lg shadow-red-200 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer'}`}
                >
                  {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {/* Global Controls & Variations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col gap-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Power className="w-4 h-4 text-gray-400" /> Global Control
                </h3>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setAll(true)}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#CD5050]/10 text-[#CD5050] hover:bg-[#CD5050]/20 py-3 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    All ON
                  </button>
                  <button 
                    onClick={() => setAll(false)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-500 hover:bg-gray-200 py-3 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    All OFF
                  </button>
                </div>
              </div>
              
              <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col gap-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gray-400" /> Variations
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => startVariasi(1)}
                    className={`flex-1 flex flex-col items-center justify-center py-2 px-2 rounded-xl font-bold transition-colors border-2 cursor-pointer ${variasiMode === 1 ? 'border-[#CD5050] bg-[#CD5050]/10 text-[#CD5050]' : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  >
                    <span className="text-xs">Variasi 1</span>
                  </button>
                  <button 
                    onClick={() => startVariasi(2)}
                    className={`flex-1 flex flex-col items-center justify-center py-2 px-2 rounded-xl font-bold transition-colors border-2 cursor-pointer ${variasiMode === 2 ? 'border-[#CD5050] bg-[#CD5050]/10 text-[#CD5050]' : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  >
                    <span className="text-xs">Variasi 2</span>
                  </button>
                  <button 
                    onClick={stopVariasi}
                    className="flex-none flex items-center justify-center px-4 rounded-xl font-bold bg-gray-800 text-white hover:bg-gray-700 transition-colors shadow-md cursor-pointer"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Relays Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relays.map((relay, index) => {
                return (
                  <motion.div 
                    key={relay.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className={`relative overflow-hidden p-6 rounded-3xl border-2 transition-all duration-300 ${
                      relay.isOn 
                        ? 'border-[#CD5050] bg-red-50/20 shadow-lg shadow-red-100/50' 
                        : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{relay.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-mono font-medium">
                            GPIO {relay.pin}
                          </span>
                        </div>
                      </div>
                      
                      <motion.div 
                        layout
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          relay.isOn 
                            ? 'bg-[#CD5050]/10 text-[#CD5050] border-[#CD5050]/20' 
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {relay.isOn ? 'Active' : 'Offline'}
                      </motion.div>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Status</span>
                        <span className={`text-xl font-bold ${relay.isOn ? 'text-[#CD5050]' : 'text-gray-400'}`}>
                          {relay.isOn ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => toggleRelay(relay.id)}
                        className={`relative flex items-center justify-center h-14 px-8 rounded-2xl font-semibold transition-all duration-300 active:scale-95 group cursor-pointer ${
                          relay.isOn
                            ? 'bg-white text-[#CD5050] border-2 border-[#CD5050] hover:bg-red-50'
                            : 'bg-[#CD5050] text-white hover:bg-[#b54646] hover:shadow-lg hover:shadow-red-200/50'
                        }`}
                      >
                        {relay.isOn ? (
                          <>
                            <PowerOff className="w-5 h-5 mr-2" />
                            Turn OFF
                          </>
                        ) : (
                          <>
                            <Power className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                            Turn ON
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Activity LOG */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm h-[400px] lg:h-full lg:max-h-[800px] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#CD5050]" /> Activity Log
                </h3>
                <span className="bg-[#CD5050]/10 text-[#CD5050] text-xs font-bold px-2 py-1 rounded-md">Live</span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                    <Activity className="w-10 h-10 mb-2" />
                    <p>Belum ada aktivitas.</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0 animate-in fade-in slide-in-from-left-4 duration-300">
                      <div className="text-[10px] text-gray-400 font-bold mb-1">{log.timestamp}</div>
                      <div className="text-gray-700 whitespace-pre-wrap">{log.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
