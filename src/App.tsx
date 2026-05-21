import { useState } from 'react';
import { Power, PowerOff, Cpu, Wifi } from 'lucide-react';
import { motion } from 'motion/react';

interface Relay {
  id: number;
  name: string;
  pin: number;
  isOn: boolean;
}

export default function App() {
  const [relays, setRelays] = useState<Relay[]>([
    { id: 1, name: 'Relay 1', pin: 23, isOn: false },
    { id: 2, name: 'Relay 2', pin: 19, isOn: false },
    { id: 3, name: 'Relay 3', pin: 18, isOn: false },
    { id: 4, name: 'Relay 4', pin: 5, isOn: false },
  ]);

  const toggleRelay = (id: number) => {
    setRelays(prev => 
      prev.map(relay => 
        relay.id === id ? { ...relay, isOn: !relay.isOn } : relay
      )
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-[#CD5050] selection:text-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#CD5050]/10 rounded-xl">
              <Cpu className="w-6 h-6 text-[#CD5050]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">ESP32 Relay Controller</h1>
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2 mt-1">
                <Wifi className="w-4 h-4" /> 192.168.x.x (Local Network)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CD5050] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#CD5050]"></span>
            </span>
            <span className="text-sm font-semibold text-gray-700 tracking-wide">SYSTEM ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900">Device Overview</h2>
          <p className="text-gray-500 text-sm">Control your ESP32 GPIO pins seamlessly.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {relays.map((relay, index) => {
            const isVariation1 = index < 2;

            if (isVariation1) {
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
                        <span className="px-2.5 py-1 bg-gray-50 text-gray-400 rounded-md text-xs font-medium border border-gray-100">
                          Variasi 1
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
              );
            }

            // Variasi 2: Minimalist Toggle Card
            return (
              <motion.div 
                key={relay.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`relative flex flex-col justify-center overflow-hidden p-6 rounded-3xl transition-all duration-300 ${
                  relay.isOn 
                    ? 'bg-[#CD5050] shadow-lg shadow-red-200/50 text-white' 
                    : 'bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-900 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between w-full h-full">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl transition-colors duration-300 ${relay.isOn ? 'bg-white/20' : 'bg-white shadow-sm border border-gray-200'}`}>
                      <Power className={`w-7 h-7 ${relay.isOn ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <div className="flex gap-2 items-center mb-1">
                         <h3 className="text-2xl font-bold tracking-tight">{relay.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-medium ${relay.isOn ? 'text-red-100' : 'text-gray-500'}`}>
                          GPIO {relay.pin}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${relay.isOn ? 'bg-black/10 border-black/10 text-white' : 'bg-gray-200 border-gray-200 text-gray-500'}`}>
                          Variasi 2
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${relay.isOn ? 'text-red-100' : 'text-gray-400'}`}>
                      {relay.isOn ? 'ON' : 'OFF'}
                    </span>
                    <button
                      onClick={() => toggleRelay(relay.id)}
                      className={`relative w-16 h-9 rounded-full transition-colors duration-300 focus:outline-none ${
                        relay.isOn ? 'bg-white' : 'bg-gray-300'
                      }`}
                    >
                      <motion.div
                        className={`absolute top-1 left-1 w-7 h-7 rounded-full shadow-sm ${
                          relay.isOn ? 'bg-[#CD5050]' : 'bg-white'
                        }`}
                        animate={{ x: relay.isOn ? 28 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
