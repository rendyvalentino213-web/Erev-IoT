import { useState, useEffect, useRef } from 'react';
import { Power, PowerOff, Cpu, Wifi, Square, Zap, Link } from 'lucide-react';
import { motion } from 'motion/react';

interface Relay {
  id: number;
  name: string;
  pin: number;
  isOn: boolean;
}

export default function App() {
  const [relays, setRelays] = useState<Relay[]>([
    { id: 1, name: 'Lampu 1', pin: 23, isOn: false },
    { id: 2, name: 'Lampu 2', pin: 19, isOn: false },
    { id: 3, name: 'Lampu 3', pin: 18, isOn: false },
    { id: 4, name: 'Lampu 4', pin: 5, isOn: false },
  ]);

  const [variasiMode, setVariasiMode] = useState<number>(0);
  const [espIp, setEspIp] = useState<string>('192.168.1.100'); // Default IP ESP32
  const [isConnecting, setIsConnecting] = useState(false);
  const variasiStepRef = useRef(0);

  // Fungsi untuk mengirim perintah/request ke ESP32
  const sendCommand = async (path: string) => {
    if (!espIp) {
      alert("Masukkan IP ESP32 terlebih dahulu!");
      return;
    }
    
    setIsConnecting(true);
    try {
      // Mengirim HTTP GET request ke Web Server ESP32
      const response = await fetch(`http://${espIp}${path}`, {
        method: 'GET',
        mode: 'cors'
      });
      if (!response.ok) throw new Error("Gagal merespon");
    } catch (error) {
      console.error("Gagal terhubung ke ESP32:", error);
      alert(`Gagal terhubung ke ESP32 di IP http://${espIp}. \n\nPastikan:\n1. Laptop/HP dan ESP32 di jaringan WiFi yang sama.\n2. Alamat IP ESP32 sudah benar.\n3. Jika di Web URL ini menggunakan "https", fitur blokir Mixed Content (gembok) di browser harus diizinkan untuk HTTP.`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Simulation of Variation patterns (Frontend Display)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (variasiMode === 1) {
      // Variasi 1 - 1->3->2->4
      const pattern = [1, 3, 2, 4];
      interval = setInterval(() => {
        setRelays(prev => prev.map(r => ({
          ...r,
          isOn: r.id === pattern[variasiStepRef.current]
        })));
        variasiStepRef.current = (variasiStepRef.current + 1) % pattern.length;
      }, 500);
    } else if (variasiMode === 2) {
      // Variasi 2 - 1->2->3->4->3->2
      const pattern = [1, 2, 3, 4, 3, 2];
      interval = setInterval(() => {
        setRelays(prev => prev.map(r => ({
          ...r,
          isOn: r.id === pattern[variasiStepRef.current]
        })));
        variasiStepRef.current = (variasiStepRef.current + 1) % pattern.length;
      }, 500);
    }

    return () => clearInterval(interval);
  }, [variasiMode]);

  const toggleRelay = (id: number) => {
    setVariasiMode(0); // Stop variasi on manual interaction
    const relay = relays.find(r => r.id === id);
    if (!relay) return;
    
    const newState = !relay.isOn;
    setRelays(prev => prev.map(r => r.id === id ? { ...r, isOn: newState } : r));
    
    // Kirim perintah ke ESP32
    sendCommand(`/relay?id=${id}&state=${newState ? 'on' : 'off'}`);
  };

  const setAll = (state: boolean) => {
    setVariasiMode(0);
    setRelays(prev => prev.map(r => ({ ...r, isOn: state })));
    sendCommand(`/all?state=${state ? 'on' : 'off'}`);
  };

  const startVariasi = (mode: number) => {
    variasiStepRef.current = 0;
    setVariasiMode(mode);
    sendCommand(`/variasi?mode=${mode}`);
  };

  const stopVariasi = () => {
    setVariasiMode(0);
    setRelays(prev => prev.map(r => ({ ...r, isOn: false })));
    sendCommand('/stop');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-[#CD5050] selection:text-white pb-12">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#CD5050]/10 rounded-xl">
              <Cpu className="w-6 h-6 text-[#CD5050]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">ESP32 Controller</h1>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 focus-within:border-[#CD5050] focus-within:ring-2 focus-within:ring-[#CD5050]/20 transition-all">
              <Link className="w-4 h-4 text-gray-400 mr-2" />
              <input 
                type="text" 
                value={espIp}
                onChange={(e) => setEspIp(e.target.value)}
                placeholder="IP ESP32 (ex: 192.168.1.100)"
                className="bg-transparent border-none outline-none text-sm font-medium text-gray-700 w-44"
              />
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isConnecting ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${variasiMode !== 0 ? 'bg-purple-500' : 'bg-[#CD5050]'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${variasiMode !== 0 ? 'bg-purple-500' : 'bg-[#CD5050]'}`}></span>
              </span>
              <span className="text-xs font-semibold text-gray-700 tracking-wide whitespace-nowrap">
                {isConnecting ? 'MENGIRIM...' : variasiMode === 1 ? 'VARIASI 1 JALAN' : variasiMode === 2 ? 'VARIASI 2 JALAN' : 'Sistem Siap'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900">Device Overview</h2>
          <p className="text-gray-500 text-sm">Control your ESP32 GPIO pins seamlessly.</p>
        </div>

        {/* Global Controls & Variations */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Global Control</h3>
            <div className="flex gap-3">
              <button 
                onClick={() => setAll(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-[#CD5050]/10 text-[#CD5050] hover:bg-[#CD5050]/20 py-3 rounded-xl font-bold transition-colors"
                >
                <Power className="w-5 h-5" /> All ON
              </button>
              <button 
                onClick={() => setAll(false)}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-500 hover:bg-gray-200 py-3 rounded-xl font-bold transition-colors"
                >
                <PowerOff className="w-5 h-5" /> All OFF
              </button>
            </div>
          </div>
          
          <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Variations</h3>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => startVariasi(1)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-xl font-bold transition-colors border-2 ${variasiMode === 1 ? 'border-[#CD5050] bg-[#CD5050]/10 text-[#CD5050]' : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                <Zap className="w-5 h-5 mb-1" />
                <span className="text-xs">Variasi 1</span>
                <span className="text-[10px] font-normal opacity-70">1→3→2→4</span>
              </button>
              <button 
                onClick={() => startVariasi(2)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-xl font-bold transition-colors border-2 ${variasiMode === 2 ? 'border-[#CD5050] bg-[#CD5050]/10 text-[#CD5050]' : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                <Zap className="w-5 h-5 mb-1" />
                <span className="text-xs">Variasi 2</span>
                <span className="text-[10px] font-normal opacity-70">Bolak-Balik</span>
              </button>
              <button 
                onClick={stopVariasi}
                className="flex-none flex flex-col items-center justify-center gap-1 py-3 px-6 rounded-xl font-bold bg-gray-800 text-white hover:bg-gray-700 transition-colors shadow-md"
                >
                <Square className="w-5 h-5 mb-1" />
                <span className="text-xs">Stop</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {relays.map((relay, index) => (
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
                  className={`relative flex items-center justify-center h-14 px-8 rounded-2xl font-semibold transition-all duration-300 active:scale-95 group ${
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
          ))}
        </div>
      </main>
    </div>
  );
}
