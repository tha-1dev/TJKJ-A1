import React, { useState, useRef, useEffect } from 'react';
import { 
  Cpu, 
  Activity, 
  Terminal, 
  Zap, 
  AlertTriangle, 
  Settings, 
  MessageSquare, 
  Calculator,
  Grid,
  Send,
  Wifi,
  Maximize2,
  Sun,
  Moon
} from 'lucide-react';
import { sendQuantumMessage } from './services/geminiService';
import { GenerateContentResponse } from "@google/genai";

// --- Types ---
type Tab = 'schematic' | 'calculator' | 'diagnostics' | 'ai-core';
type ChipModel = 'CS602' | 'RT6936' | 'SM4190' | 'VPMS3RT';

// --- Data Constants ---
const CHIP_DATA = {
  CS602: {
    name: 'CS602 (Standard 4K)',
    dip: ['OFF', 'ON', 'ON'],
    address: '0x69',
    package: 'QFN-48',
    features: ['3-in-1 Integration (รวม 3 ระบบ)', 'Gamma Buffer', 'Level Shifter']
  },
  RT6936: {
    name: 'RT6936 (WQFN-40)',
    dip: ['ON', 'OFF', 'ON'],
    address: '0x48/0x68',
    package: 'WQFN-40L',
    features: ['Complex Protection (ระบบป้องกัน)', 'Temp Comp (ชดเชยอุณหภูมิ)', 'Programmable Scan Driver']
  },
  SM4190: {
    name: 'SM4190 / RT6948',
    dip: ['ON', 'OFF', 'OFF'],
    address: '0x50',
    package: 'QFN-48',
    features: ['High Precision (ความแม่นยำสูง)', '2023+ Architecture', 'Silicon Mitus']
  },
  VPMS3RT: {
    name: 'VPMS3RT (Hybrid)',
    dip: ['ON', 'ON', 'OFF'],
    address: '0x42',
    package: 'Hybrid',
    features: ['Samsung Custom', 'Legacy Support (รุ่นเก่า)', 'Dual Bank']
  }
};

const LED_CODES = [
  { blink: 'Solid ON (แดงค้าง)', meaning: 'I2C Bus Fail / No Chip (ไม่พบชิป)', fix: 'Check SDA/SCL, 3.3V (เช็คไฟ/สัญญาณ)' },
  { blink: '2 Blinks (2 ครั้ง)', meaning: 'Write Fail / NACK (เขียนไม่ผ่าน)', fix: 'Check WP, Wrong DIP (เช็คสวิตช์ DIP)' },
  { blink: '3 Blinks (3 ครั้ง)', meaning: 'Panel Power Fault (ไฟจอผิดปกติ)', fix: 'VGH/VGL Short (เช็คไฟสูง/ต่ำ)' },
  { blink: '5 Blinks (5 ครั้ง)', meaning: 'OCP / Over Current (กระแสเกิน)', fix: 'Check CKV / Panel Short (เช็คจอช็อต)' },
  { blink: '7 Blinks (7 ครั้ง)', meaning: 'Over Temp / TSD (ร้อนเกิน)', fix: 'Chip >165°C, Thermal Pad (ระบายความร้อน)' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('schematic');
  const [selectedChip, setSelectedChip] = useState<ChipModel>('CS602');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Calculator State
  const [hexInput, setHexInput] = useState('4A');
  const [calcResult, setCalcResult] = useState<string>('');

  // Chat State
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize theme
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const calculateVGH = () => {
    try {
      const decimal = parseInt(hexInput, 16);
      if (isNaN(decimal)) {
        setCalcResult('Invalid Hex');
        return;
      }
      // Formula from PDF: 15V + (Hex * 0.2V)
      const voltage = 15 + (decimal * 0.2);
      setCalcResult(`${voltage.toFixed(2)} V`);
    } catch (e) {
      setCalcResult('Error');
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);

    try {
      const stream = await sendQuantumMessage(userMsg);
      let fullResponse = "";
      
      setChatHistory(prev => [...prev, { role: 'model', text: "" }]); // Placeholder

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullResponse += c.text;
          setChatHistory(prev => {
            const newHist = [...prev];
            newHist[newHist.length - 1].text = fullResponse;
            return newHist;
          });
        }
      }
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', text: "CRITICAL SYSTEM FAILURE: Link to Quantum Core severed. (การเชื่อมต่อล้มเหลว)" }]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="flex h-screen bg-quantum-bg text-quantum-text-pri overflow-hidden font-sans selection:bg-quantum-cyan selection:text-quantum-bg transition-colors duration-300">
      
      {/* Sidebar */}
      <nav className="w-20 lg:w-64 bg-quantum-panel border-r border-quantum-border flex flex-col justify-between z-20 transition-colors duration-300">
        <div>
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-quantum-border">
            <Cpu className="w-8 h-8 text-quantum-cyan animate-pulse" />
            <span className="hidden lg:block ml-3 font-mono font-bold text-quantum-cyan tracking-wider">TJKJ-A1</span>
          </div>
          
          <div className="mt-8 px-2 space-y-2">
            <button 
              onClick={() => setActiveTab('schematic')}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${activeTab === 'schematic' ? 'bg-quantum-cyan/10 text-quantum-cyan border border-quantum-cyan/30' : 'hover:bg-quantum-sub text-quantum-text-sec'}`}
            >
              <Grid className="w-6 h-6" />
              <div className="hidden lg:flex flex-col items-start ml-3">
                <span className="font-medium">Schematics</span>
                <span className="text-xs opacity-70">ผังวงจร</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('calculator')}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${activeTab === 'calculator' ? 'bg-quantum-amber/10 text-quantum-amber border border-quantum-amber/30' : 'hover:bg-quantum-sub text-quantum-text-sec'}`}
            >
              <Calculator className="w-6 h-6" />
              <div className="hidden lg:flex flex-col items-start ml-3">
                <span className="font-medium">Registers</span>
                <span className="text-xs opacity-70">คำนวณค่าไฟ</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('diagnostics')}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${activeTab === 'diagnostics' ? 'bg-quantum-red/10 text-quantum-red border border-quantum-red/30' : 'hover:bg-quantum-sub text-quantum-text-sec'}`}
            >
              <Activity className="w-6 h-6" />
              <div className="hidden lg:flex flex-col items-start ml-3">
                <span className="font-medium">Diagnostics</span>
                <span className="text-xs opacity-70">วิเคราะห์ปัญหา</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('ai-core')}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${activeTab === 'ai-core' ? 'bg-quantum-green/10 text-quantum-green border border-quantum-green/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'hover:bg-quantum-sub text-quantum-text-sec'}`}
            >
              <Terminal className="w-6 h-6" />
              <div className="hidden lg:flex flex-col items-start ml-3">
                <span className="font-medium">Quantum AI</span>
                <span className="text-xs opacity-70">ระบบอัจฉริยะ</span>
              </div>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-quantum-border">
           <div className="hidden lg:block text-xs font-mono text-quantum-text-sec">
             <div>FW: v2.5.0-QC</div>
             <div>LANG: TH/EN</div>
           </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-quantum-bg/80 backdrop-blur-md border-b border-quantum-border flex items-center justify-between px-6 z-10 transition-colors duration-300">
           <h1 className="text-xl font-light text-quantum-text-pri uppercase tracking-widest flex items-center gap-2">
             {activeTab === 'schematic' && <span>Wiring Atlas <span className="text-quantum-text-sec text-sm">| แผนผังการต่อสาย</span></span>}
             {activeTab === 'calculator' && <span>Voltage Drift <span className="text-quantum-text-sec text-sm">| คำนวณแรงดันไฟ</span></span>}
             {activeTab === 'diagnostics' && <span>Fault Matrix <span className="text-quantum-text-sec text-sm">| รหัสวิเคราะห์อาการเสีย</span></span>}
             {activeTab === 'ai-core' && <span className="text-quantum-green font-mono">Quantum_Core_Terminal_v1 (AI Chat)</span>}
           </h1>
           <div className="flex items-center space-x-4">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-quantum-sub text-quantum-text-sec hover:text-quantum-text-pri transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="flex items-center px-3 py-1 rounded-full bg-quantum-card border border-quantum-border">
                <div className="w-2 h-2 bg-quantum-green rounded-full animate-pulse mr-2"></div>
                <span className="text-xs font-mono text-quantum-green">ONLINE (ออนไลน์)</span>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide relative">
           
           {/* Background Grid Effect */}
           <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

           {/* --- SCHEMATIC TAB --- */}
           {activeTab === 'schematic' && (
             <div className="max-w-6xl mx-auto space-y-6">
               {/* Chip Selector */}
               <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
                  {(Object.keys(CHIP_DATA) as ChipModel[]).map(chip => (
                    <button
                      key={chip}
                      onClick={() => setSelectedChip(chip)}
                      className={`px-6 py-3 rounded-md font-mono text-sm border transition-all ${
                        selectedChip === chip 
                        ? 'bg-quantum-cyan/10 border-quantum-cyan text-quantum-cyan shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                        : 'bg-quantum-card border-quantum-border text-quantum-text-sec hover:border-quantum-text-sec'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
               </div>

               {/* Wiring Visualizer */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* DIP Switch Visual */}
                  <div className="bg-quantum-card/50 border border-quantum-border rounded-xl p-6 backdrop-blur-sm">
                    <h3 className="text-sm font-mono text-quantum-text-sec mb-4 uppercase flex justify-between">
                      <span>Configuration Matrix</span>
                      <span>การตั้งค่าสวิตช์ DIP</span>
                    </h3>
                    <div className="flex items-center justify-center space-x-8 h-40 bg-black/20 rounded-lg border border-quantum-border relative overflow-hidden">
                       <div className="absolute top-2 right-2 text-xs font-mono text-quantum-text-sec">ADDR: {CHIP_DATA[selectedChip].address}</div>
                       {CHIP_DATA[selectedChip].dip.map((state, i) => (
                         <div key={i} className="flex flex-col items-center group">
                           <div className="text-xs font-mono text-quantum-text-sec mb-2">SW {i+1}</div>
                           <div className={`w-12 h-20 rounded-md border-2 relative transition-all duration-300 ${
                             state === 'ON' 
                             ? 'bg-quantum-green/20 border-quantum-green shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
                             : 'bg-quantum-sub border-quantum-border'
                           }`}>
                             <div className={`absolute w-full h-1/2 bg-current opacity-80 transition-all duration-300 ${state === 'ON' ? 'top-0 bg-quantum-green' : 'bottom-0 bg-quantum-text-sec'}`}></div>
                           </div>
                           <div className={`mt-2 font-bold font-mono ${state === 'ON' ? 'text-quantum-green' : 'text-quantum-text-sec'}`}>{state}</div>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Pinout Info */}
                  <div className="bg-quantum-card/50 border border-quantum-border rounded-xl p-6 backdrop-blur-sm">
                    <h3 className="text-sm font-mono text-quantum-text-sec mb-4 uppercase flex justify-between">
                      <span>Signal Interconnects</span>
                      <span>จุดต่อสัญญาณ</span>
                    </h3>
                    <ul className="space-y-4 font-mono text-sm">
                       <li className="flex justify-between items-center p-3 bg-quantum-sub/50 rounded border-l-2 border-quantum-red">
                         <span>3.3V (VDD)</span>
                         <span className="text-quantum-red font-bold">ห้ามต่อ 12V (NO 12V)</span>
                       </li>
                       <li className="flex justify-between items-center p-3 bg-quantum-sub/50 rounded border-l-2 border-quantum-text-sec">
                         <span>GND</span>
                         <span className="text-quantum-text-sec">Ground (กราวด์)</span>
                       </li>
                       <li className="flex justify-between items-center p-3 bg-quantum-sub/50 rounded border-l-2 border-quantum-cyan">
                         <span>SDA (Data)</span>
                         <span className="text-quantum-cyan">Data (ข้อมูล)</span>
                       </li>
                       <li className="flex justify-between items-center p-3 bg-quantum-sub/50 rounded border-l-2 border-quantum-amber">
                         <span>SCL (Clock)</span>
                         <span className="text-quantum-amber">Clock (สัญญาณนาฬิกา)</span>
                       </li>
                    </ul>
                  </div>
               </div>

               <div className="bg-quantum-card/50 border border-quantum-border rounded-xl p-6">
                 <h3 className="text-sm font-mono text-quantum-text-sec mb-4 uppercase flex justify-between">
                    <span>Module Intelligence</span>
                    <span>คุณสมบัติโมดูล</span>
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {CHIP_DATA[selectedChip].features.map((feat, i) => (
                      <div key={i} className="p-3 border border-quantum-border bg-quantum-card rounded text-sm text-quantum-text-pri flex items-center">
                        <Zap className="w-4 h-4 mr-2 text-quantum-cyan" />
                        {feat}
                      </div>
                    ))}
                 </div>
               </div>
             </div>
           )}

           {/* --- CALCULATOR TAB --- */}
           {activeTab === 'calculator' && (
             <div className="max-w-2xl mx-auto mt-10">
               <div className="bg-quantum-card border border-quantum-border rounded-xl overflow-hidden shadow-2xl">
                 <div className="bg-quantum-sub p-4 border-b border-quantum-border flex justify-between items-center">
                   <h2 className="font-mono text-quantum-amber flex items-center">
                     <Calculator className="w-5 h-5 mr-2" />
                     VGH Register Decoder (RT6936)
                   </h2>
                 </div>
                 <div className="p-8 space-y-8">
                   <div>
                     <label className="block text-sm font-mono text-quantum-text-sec mb-2">
                       Register 00h Value (HEX) <span className="text-quantum-text-pri opacity-60">| ค่า Hex ที่อ่านได้</span>
                     </label>
                     <div className="flex space-x-4">
                       <input 
                         type="text" 
                         value={hexInput}
                         onChange={(e) => setHexInput(e.target.value.toUpperCase())}
                         maxLength={2}
                         className="flex-1 bg-quantum-input border border-quantum-border rounded p-4 font-mono text-2xl text-center text-quantum-text-pri focus:border-quantum-amber focus:outline-none focus:ring-1 focus:ring-quantum-amber uppercase tracking-widest placeholder-quantum-text-sec"
                         placeholder="00"
                       />
                       <button 
                         onClick={calculateVGH}
                         className="bg-quantum-amber hover:bg-amber-400 text-slate-900 font-bold px-6 rounded transition-colors"
                       >
                         CALCULATE (คำนวณ)
                       </button>
                     </div>
                   </div>

                   <div className="bg-black/10 border border-quantum-border rounded p-6 flex flex-col items-center justify-center min-h-[150px]">
                      <span className="text-quantum-text-sec font-mono text-sm mb-2">CALCULATED OUTPUT (แรงดันที่ได้)</span>
                      {calcResult && (
                        <div className="text-5xl font-mono text-quantum-green animate-in fade-in zoom-in duration-300">
                          {calcResult}
                        </div>
                      )}
                      {!calcResult && <div className="text-quantum-text-sec font-mono">WAITING FOR INPUT...</div>}
                   </div>
                   
                   <div className="text-xs text-quantum-text-sec font-mono border-t border-quantum-border pt-4">
                     Formula: VGH = 15V + (HEX_VAL * 0.2V). Applies to RT6936/RT6939 architecture.
                   </div>
                 </div>
               </div>
             </div>
           )}

           {/* --- DIAGNOSTICS TAB --- */}
           {activeTab === 'diagnostics' && (
             <div className="max-w-5xl mx-auto">
               <div className="bg-quantum-card border border-quantum-border rounded-xl overflow-hidden">
                 <table className="w-full text-left">
                   <thead className="bg-quantum-sub text-quantum-text-sec font-mono text-sm uppercase">
                     <tr>
                       <th className="p-4 border-b border-quantum-border">LED Pattern (รหัสไฟกระพริบ)</th>
                       <th className="p-4 border-b border-quantum-border">Interpretation (ความหมาย)</th>
                       <th className="p-4 border-b border-quantum-border">Resolution (แนวทางแก้ไข)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-quantum-border">
                     {LED_CODES.map((code, idx) => (
                       <tr key={idx} className="hover:bg-quantum-sub transition-colors group">
                         <td className="p-4 font-mono font-bold text-quantum-red flex items-center">
                           <AlertTriangle className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                           {code.blink}
                         </td>
                         <td className="p-4 text-quantum-text-pri">{code.meaning}</td>
                         <td className="p-4 font-mono text-sm text-quantum-cyan">{code.fix}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           )}

           {/* --- AI CORE TAB --- */}
           {activeTab === 'ai-core' && (
             <div className="h-full flex flex-col max-w-4xl mx-auto">
               <div className="flex-1 bg-quantum-card/80 border border-green-900/30 rounded-t-xl overflow-y-auto p-6 space-y-6 shadow-inner backdrop-blur-md">
                 {chatHistory.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-green-700/60 dark:text-green-900/60">
                     <Terminal className="w-24 h-24 mb-4" />
                     <p className="font-mono text-lg">QUANTUM CORE SYSTEM ONLINE</p>
                     <p className="font-mono text-sm mt-2">พร้อมรับคำสั่งทางวิศวกรรม (Ready for Query)...</p>
                   </div>
                 )}
                 {chatHistory.map((msg, idx) => (
                   <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[80%] rounded-lg p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap ${
                       msg.role === 'user' 
                       ? 'bg-quantum-sub text-quantum-text-pri border border-quantum-border' 
                       : 'bg-green-900/20 text-green-700 dark:text-green-400 border border-green-600/30 dark:border-green-900/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                     }`}>
                       {msg.role === 'model' && !msg.text ? (
                         <span className="animate-pulse">_PROCESSING_QUANTUM_DATA...</span>
                       ) : msg.text}
                     </div>
                   </div>
                 ))}
                 <div ref={chatEndRef}></div>
               </div>

               <div className="bg-quantum-card border-x border-b border-green-900/30 rounded-b-xl p-4 flex items-center space-x-3 shadow-lg">
                 <Terminal className="w-5 h-5 text-quantum-green" />
                 <input 
                   type="text" 
                   value={chatInput}
                   onChange={(e) => setChatInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && !isChatting && handleChatSend()}
                   disabled={isChatting}
                   placeholder="พิมพ์คำถามวิศวกรรม (เช่น 'คำนวณ VGH ของ 0xA2' หรือ 'ขอวิธีแปลงบอร์ด CS602')..."
                   className="flex-1 bg-transparent border-none focus:ring-0 text-quantum-green font-mono text-sm placeholder-green-700/50 dark:placeholder-green-900/50"
                 />
                 <button 
                   onClick={handleChatSend}
                   disabled={isChatting || !chatInput.trim()}
                   className="p-2 text-quantum-green hover:bg-green-900/20 rounded-full transition-colors disabled:opacity-50"
                 >
                   <Send className="w-5 h-5" />
                 </button>
               </div>
             </div>
           )}

        </div>
      </main>
    </div>
  );
};

export default App;