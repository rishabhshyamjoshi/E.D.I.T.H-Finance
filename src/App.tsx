import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, Send, Settings, Volume2, VolumeX, Radio, Headphones, Briefcase, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { chatWithAura, speakWithAura } from './services/gemini';
import { FinancePanel } from './components/FinancePanel';
import { useLiveAudio } from './hooks/useLiveAudio';
import { STORAGE_KEYS } from './config/constants';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("ErrorBoundary caught an error", error, errorInfo); }
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

const getFormattedTime = (date = new Date()) => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(date);
const getFormattedDate = (date = new Date()) => new Intl.DateTimeFormat('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(date);

export default function App() {
  const { messages, setMessages, isLiveMode, startLiveSession, stopLiveSession } = useLiveAudio();
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => getFormattedTime());
  const [currentDate, setCurrentDate] = useState(() => getFormattedDate());
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(getFormattedTime(now));
      setCurrentDate(getFormattedDate(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial messages if not live (or rely on useLiveAudio if we move local storage there).
  // For simplicity, we initialize messages here once on mount.
  useEffect(() => {
    if (messages.length === 0) {
      const saved = localStorage.getItem('aura_messages');
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([{ role: 'model', text: 'Aura Financial Systems online. Voice interface initialized. How can I assist you with client portfolios today?' }]);
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('aura_messages', JSON.stringify(messages));
    }
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsTyping(true);
    
    try {
      const currentHistory = messages.slice(1).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const responseText = await chatWithAura(text, currentHistory);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      
      if (voiceEnabled) {
        const audioUri = await speakWithAura(responseText);
        if (audioUri) {
          const audio = new Audio(audioUri);
          audioRef.current = audio;
          audio.play();
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Error: Could not process request." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-transparent flex flex-col font-sans">
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

      <div className="flex-1 overflow-hidden p-6 gap-6 flex">
        
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden glass-panel">
          <ErrorBoundary>
            <FinancePanel />
          </ErrorBoundary>
        </div>

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
