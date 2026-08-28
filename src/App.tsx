import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  MessageSquare, 
  Send, 
  Settings,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Headphones,
  Briefcase,
  Clock,
  ShieldCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { chatWithAura, speakWithAura, ai, SYSTEM_INSTRUCTION } from './services/gemini';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-red-500 bg-red-100 rounded-lg m-10 border border-red-300">
          <h2 className="text-2xl font-bold mb-4">UI Crashed!</h2>
          <p className="font-mono text-sm">{this.state.error?.toString()}</p>
          <pre className="mt-4 text-xs bg-black/10 p-4 rounded overflow-auto max-h-[300px]">
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Modality, Type } from "@google/genai";
import { FinancePanel } from './components/FinancePanel';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const getFormattedTime = (date = new Date()) => new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
}).format(date);

const getFormattedDate = (date = new Date()) => new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}).format(date);

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('aura_messages');
    return saved ? JSON.parse(saved) : [
      { role: 'model', text: 'Aura Financial Systems online. Voice interface initialized. How can I assist you with client portfolios today?' }
    ];
  });
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => getFormattedTime());
  const [currentDate, setCurrentDate] = useState(() => getFormattedDate());
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem('aura_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getFormattedTime());
      setCurrentDate(getFormattedDate());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startLiveSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          tools: [{
            functionDeclarations: [
              { name: 'execute_agents', description: 'Executes the AI agents to generate the interactive financial plan for the user.' },
              { name: 'change_mode', description: 'Changes the profile mode to either synthetic, manual, or parse.', parameters: { type: Type.OBJECT, properties: { mode: { type: Type.STRING } }, required: ['mode'] } },
              { name: 'generate_synthetic_profile', description: 'Generates a random synthetic profile for the user.' },
              { name: 'parse_notes', description: 'Parses the user provided raw notes into a structured profile.' }
            ]
          }]
        },
        callbacks: {
          onopen: () => setIsLiveMode(true),
          onmessage: async (message) => {
            const funcCall = message.serverContent?.modelTurn?.parts?.[0]?.functionCall;
            if (funcCall) {
              window.dispatchEvent(new CustomEvent('aura_voice_command', { detail: { name: funcCall.name, args: funcCall.args } }));
              let resultStr = `Command ${funcCall.name} dispatched to the UI successfully. Please tell the user that the UI is updating.`;
              if (funcCall.name === 'generate_synthetic_profile') {
                resultStr = `Command executed successfully. You MUST say exactly this phrase to the user and nothing else: "I have generated it and I have started the execution."`;
              }
              (session as any).sendToolResponse({
                functionResponses: [{
                  id: funcCall.id,
                  name: funcCall.name,
                  response: { result: resultStr }
                }]
              });
            }
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              playLiveAudio(message.serverContent.modelTurn.parts[0].inlineData.data);
            }
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              setMessages(prev => [...prev, { role: 'model', text: message.serverContent!.modelTurn!.parts[0].text! }]);
            }
            if (message.serverContent?.interrupted) {
              stopLiveAudio();
            }
          },
          onclose: () => stopLiveSession(),
          onerror: (err) => stopLiveSession()
        }
      });

      liveSessionRef.current = session;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = floatTo16BitPCM(inputData);
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData)));
        session.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processor);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;
      processor.connect(gainNode);
      gainNode.connect(audioContext.destination);

    } catch (err) {
      console.error("Failed to start live session:", err);
      setMessages(prev => [...prev, { role: 'model', text: 'Error: Voice link failed.' }]);
    }
  };

  const stopLiveSession = () => {
    liveSessionRef.current?.close();
    liveSessionRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    outputAudioContextRef.current?.close();
    outputAudioContextRef.current = null;
    setIsLiveMode(false);
  };

  const floatTo16BitPCM = (input: Float32Array) => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output.buffer;
  };

  const playLiveAudio = (base64Data: string) => {
    const binary = atob(base64Data);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    
    const int16Data = new Int16Array(buffer);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768;
    }

    const ctx = outputAudioContextRef.current;
    if (!ctx) return;

    const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;
  };

  const stopLiveAudio = () => {
    outputAudioContextRef.current?.close();
    outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
    nextStartTimeRef.current = 0;
  };

  const playVoice = async (text: string) => {
    if (!voiceEnabled || isLiveMode) return;
    try {
      const audioUrl = await speakWithAura(text);
      if (audioUrl) {
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        } else {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.play();
        }
      }
    } catch (err) {
      console.error("TTS Error:", err);
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const userMsg = overrideInput || input;
    if (!userMsg.trim()) return;

    if (!overrideInput) setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const responseText = await chatWithAura(userMsg, history);
      
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      playVoice(responseText);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: 'Error connecting to Aura servers.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-transparent flex flex-col font-sans">
      {/* Top Header */}
      <header className="glass-header px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Briefcase className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Aura Wealth AI</h1>
            <p className="text-xs text-slate-400">Financial Advisory Platform</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4" />
            <div className="text-sm font-medium">
              <span>{currentDate}</span> <span className="text-slate-500 mx-1">|</span> <span>{currentTime}</span>
            </div>
          </div>
          <button 
            onClick={isLiveMode ? stopLiveSession : startLiveSession}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              isLiveMode 
                ? "bg-emerald-500/20 text-emerald-400 animate-pulse border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                : "btn-secondary"
            )}
          >
            {isLiveMode ? <Radio className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
            {isLiveMode ? 'Voice Active' : 'Start Voice'}
          </button>
          <button 
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              isAssistantOpen ? "bg-slate-800 text-white border border-white/10" : "btn-secondary"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            {isAssistantOpen ? 'Hide Assistant' : 'Show Assistant'}
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex-1 overflow-hidden p-6 gap-6 flex">
        
        {/* Left/Center: Finance Dashboard (Agent flows & profile) */}
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden glass-panel">
          <ErrorBoundary>
            <FinancePanel />
          </ErrorBoundary>
        </div>

        {/* Right: Aura AI Assistant Sidebar */}
        {isAssistantOpen && (
          <div className="w-[400px] flex flex-col glass-panel rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-slate-950/40 flex justify-between items-center backdrop-blur-md">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <h2 className="font-semibold text-slate-200 text-sm">Aura Assistant</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="p-1.5 text-slate-400 hover:text-emerald-400 transition-colors">
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button onClick={() => { localStorage.removeItem('aura_messages'); setMessages([{ role: 'model', text: 'Chat history cleared. How can I assist?' }]); }} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col gap-1 max-w-[85%]",
                  m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                  {m.role === 'user' ? 'Advisor' : 'Aura AI'}
                </span>
                <div className={cn(
                  "p-3 rounded-2xl text-sm leading-relaxed",
                  m.role === 'user' 
                    ? "bg-emerald-500/90 text-slate-950 rounded-tr-sm shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                    : "bg-white/5 text-slate-200 rounded-tl-sm border border-white/10"
                )}>
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1 items-center p-3 bg-white/5 rounded-2xl rounded-tl-sm w-fit border border-white/10">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ animationDelay: '0.2s' }}></div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-slate-950/40 border-t border-white/10 backdrop-blur-md">
            <div className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Aura anything..."
                className="w-full glass-input rounded-full pl-4 pr-12 py-3 text-sm"
              />
              <button 
                onClick={() => handleSend()}
                className="absolute right-2 p-2 bg-emerald-500/90 text-slate-950 rounded-full hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        )}

      </div>
    </div>
  );
}
