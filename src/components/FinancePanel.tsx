import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, AlertTriangle, Brain, RefreshCw, ChevronRight, User, Target, Shield, Zap, Download, Terminal, CheckCircle2, FileText, Settings, Play } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import ReactMarkdown from 'react-markdown';
interface FinanceProfile {
  name: string;
  age: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  riskAppetite: string;
  goals: string[];
}

const SHOCK_EVENTS = [
  "Global Pandemic",
  "Market Crash",
  "Hyperinflation"
];

export const FinancePanel = () => {
  const [profile, setProfile] = useState<FinanceProfile | null>(null);
  const [profileMode, setProfileMode] = useState<'synthetic' | 'parse'>('synthetic');
  const [rawNotes, setRawNotes] = useState('');
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  
  const [activeAgent, setActiveAgent] = useState<'Orchestrator' | 'Explainer' | 'Verifier' | 'Challenger' | 'Complete' | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<{ id: string, text: string, type: 'info' | 'data' | 'success' | 'error' }[]>([]);
  const [reportData, setReportData] = useState<{ rawPlan: string, expl: string, verif: any, chal: string } | null>(null);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  const addTermLog = (text: string, type: 'info' | 'data' | 'success' | 'error' = 'info') => {
    setTerminalLogs(prev => [...prev, { id: Math.random().toString(36).substring(7), text, type }]);
  };

  const handleGenerateProfile = async () => {
    setIsGeneratingProfile(true);
    setTerminalLogs([]);
    setReportData(null);
    setActiveAgent(null);
    try {
      addTermLog("Requesting Profile from Backend Engine...", "info");
      
      const response = await fetch('http://localhost:8000/api/profile');
      const data = await response.json();
      addTermLog(`Raw behavioral data loaded via API.`, "data");
      
      const newProfile = {
        name: data.name,
        age: data.age,
        netWorth: data.net_worth,
        monthlyIncome: data.monthly_income,
        monthlyExpenses: data.monthly_expense,
        riskAppetite: data.actual_risk,
        goals: ["Retirement", "Wealth Accumulation"]
      };
      
      setProfile(newProfile);
      addTermLog(`Profile generated successfully for ${newProfile.name}.`, "success");
      setSelectedShocks([]);
    } catch (e) {
      addTermLog("Failed to connect to Python backend.", "error");
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  const handleParseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawNotes.trim()) return;
    setIsGeneratingProfile(true);
    setTerminalLogs([]);
    setReportData(null);
    setActiveAgent(null);
    
    try {
      addTermLog("Sending notes to AI Parse Engine...", "info");
      
      const response = await fetch('http://localhost:8000/api/profile/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawNotes })
      });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      const newProfile = {
        name: data.name,
        age: data.age,
        netWorth: data.net_worth,
        monthlyIncome: data.monthly_income,
        monthlyExpenses: data.monthly_expense,
        riskAppetite: data.actual_risk,
        goals: data.goals || ["Wealth Accumulation"]
      };
      
      setProfile(newProfile);
      addTermLog(`Profile generated successfully for ${newProfile.name}.`, "success");
    } catch (e: any) {
      addTermLog(`Failed to parse text: ${e.message}`, "error");
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  const runAgentFlow = async () => {
    if (!profile) return;
    setTerminalLogs([]);
    setReportData(null);
    setActiveAgent('Orchestrator');
    
    const ws = new WebSocket('ws://localhost:8000/ws/agent-flow');
    let currentReport: any = { rawPlan: '', expl: '', verif: null, chal: '' };
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ triggered: true }));
    };
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'status') {
        setActiveAgent(msg.agent);
      } else if (msg.type === 'info' || msg.type === 'success' || msg.type === 'error') {
        addTermLog(msg.text, msg.type);
      } else if (msg.type === 'data') {
        if (msg.agent === 'Orchestrator') currentReport.rawPlan = msg.data;
        if (msg.agent === 'Explainer') currentReport.expl = msg.data;
        if (msg.agent === 'Verifier') currentReport.verif = msg.data;
        if (msg.agent === 'Challenger') currentReport.chal = msg.data;
      } else if (msg.type === 'complete') {
        setReportData(currentReport);
        setActiveAgent('Complete');
      }
    };
    
    ws.onerror = () => {
      addTermLog("WebSocket connection error. Is backend running?", "error");
      setActiveAgent(null);
    };
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin:       0.5,
        filename:     `Wealth_Plan_${profile?.name.replace(/ /g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      // We temporarily make the report visible for PDF generation if it's hidden, 
      // but in this layout it's always rendered off-screen or inside a scroll container.
      html2pdf().set(opt).from(reportRef.current).save();
    } catch (err) {
      console.error("PDF generation failed", err);
    }
  };

  const agents = [
    { id: 'Orchestrator', label: 'Orchestrator', icon: Brain },
    { id: 'Explainer', label: 'Explainer', icon: Target },
    { id: 'Verifier', label: 'Verifier', icon: Shield },
    { id: 'Challenger', label: 'Challenger', icon: Zap },
  ];

  return (
    <div className="flex h-full font-sans bg-white overflow-hidden">
      
      {/* Left Sidebar: Profile & Config */}
      <div className="w-80 bg-slate-900/40 backdrop-blur-md border-r border-white/10 flex flex-col h-full flex-shrink-0 z-10 shadow-xl">
        <div className="p-4 border-b border-white/10 bg-slate-950/40">
          <h2 className="font-semibold text-slate-100 text-sm flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Client Profile
          </h2>
          <div className="flex rounded-md overflow-hidden border border-white/10">
            <button 
              onClick={() => setProfileMode('synthetic')}
              className={cn("flex-1 text-xs py-1.5 font-medium transition-colors", profileMode === 'synthetic' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
              Synthetic Data
            </button>
            <button 
              onClick={() => setProfileMode('parse')}
              className={cn("flex-1 text-xs py-1.5 font-medium transition-colors", profileMode === 'parse' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
              AI Notes Parse
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {profileMode === 'parse' && !profile ? (
            <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleParseSubmit} className="space-y-4">
              <div className="glass-panel p-5 rounded-xl space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Unstructured Client Notes</label>
                  <textarea 
                    required 
                    value={rawNotes} 
                    onChange={e => setRawNotes(e.target.value)} 
                    placeholder="E.g. Client is John, 45 yrs old, making $15k/mo..."
                    className="w-full text-sm p-3 glass-input rounded-lg h-48 resize-none" 
                  />
                </div>
              </div>
              <button type="submit" disabled={isGeneratingProfile || !rawNotes.trim()} className="w-full btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {isGeneratingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Extract Profile via AI
              </button>
            </motion.form>
          ) : profileMode === 'synthetic' && !profile ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 pt-10">
              <button 
                onClick={handleGenerateProfile}
                disabled={isGeneratingProfile}
                className="btn-secondary flex items-center gap-2"
              >
                {isGeneratingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Generate Random Profile
              </button>
            </div>
          ) : null}

          {profile && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {profileMode === 'synthetic' && (
                <button 
                  onClick={handleGenerateProfile}
                  disabled={isGeneratingProfile || (activeAgent !== null && activeAgent !== 'Complete')}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isGeneratingProfile && "animate-spin")} /> Regenerate Synthetic Profile
                </button>
              )}
              <div className="glass-panel p-4 rounded-xl text-sm space-y-3">
                <div><span className="text-slate-400 text-xs block mb-0.5">Name</span> <span className="font-medium text-slate-100">{profile.name}</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-slate-400 text-xs block mb-0.5">Age</span> <span className="font-medium text-slate-100">{profile.age}</span></div>
                  <div><span className="text-slate-400 text-xs block mb-0.5">Risk</span> <span className="font-medium text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">{profile.riskAppetite}</span></div>
                </div>
                <div><span className="text-slate-400 text-xs block mb-0.5">Net Worth</span> <span className="font-bold text-emerald-400 text-base drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">${profile.netWorth.toLocaleString()}</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-slate-400 text-xs block mb-0.5">Income/mo</span> <span className="font-medium text-slate-100">${profile.monthlyIncome.toLocaleString()}</span></div>
                  <div><span className="text-slate-400 text-xs block mb-0.5">Expenses/mo</span> <span className="font-medium text-slate-100">${profile.monthlyExpenses.toLocaleString()}</span></div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-1">Financial Goals</span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.goals.map((g, i) => (
                      <span key={i} className="px-2 py-1 bg-white/10 border border-white/10 text-slate-300 rounded-md text-xs">{g}</span>
                    ))}
                  </div>
                </div>
              </div>


            </motion.div>
          )}
        </div>
      </div>

      {/* Main Area: Visual Pipeline & Terminal */}
      <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative">
        
        {/* Top Header & Pipeline Visualizer */}
        <div className="bg-slate-950/40 backdrop-blur-md border-b border-white/10 z-10 shadow-xl">
          <div className="p-4 flex justify-between items-center border-b border-white/10">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> AI Agent Workflow
            </h2>
            <div className="flex gap-2">
              {activeAgent === 'Complete' && (
                <button 
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-slate-100 text-sm font-medium rounded-lg transition-colors border border-white/10"
                >
                  <Download className="w-4 h-4" /> Download PDF Report
                </button>
              )}
              <button 
                onClick={runAgentFlow}
                disabled={!profile || (activeAgent !== null && activeAgent !== 'Complete')}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:hover:shadow-none"
              >
                {activeAgent !== null && activeAgent !== 'Complete' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {activeAgent !== null && activeAgent !== 'Complete' ? 'Processing Workflow...' : 'Execute Agents'}
              </button>
            </div>
          </div>

          {/* Node Graph Pipeline */}
          <AnimatePresence>
            {activeAgent !== null && activeAgent !== 'Complete' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="py-6 flex items-center justify-center overflow-hidden">
                <div className="flex items-center w-full max-w-3xl">
                  {agents.map((agent, idx) => {
                    const isActive = activeAgent === agent.id;
                    const isPast = activeAgent === 'Complete' || agents.findIndex(a => a.id === activeAgent) > idx;
                    const Icon = agent.icon;
                    
                    return (
                      <React.Fragment key={agent.id}>
                        <div className="flex flex-col items-center relative z-10">
                          <motion.div
                            animate={{ 
                              scale: isActive ? 1.1 : 1,
                              boxShadow: isActive ? "0 0 25px rgba(16, 185, 129, 0.6)" : "0 0 0px rgba(0,0,0,0)"
                            }}
                            className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-500",
                              isActive ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" : 
                              isPast ? "bg-emerald-500/90 border-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : 
                              "bg-white/5 border-white/10 text-slate-500"
                            )}
                          >
                            {isPast ? <CheckCircle2 className="w-5 h-5" /> : <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />}
                          </motion.div>
                          <span className={cn(
                            "mt-2 text-xs font-semibold transition-colors duration-500",
                            isActive || isPast ? "text-slate-200" : "text-slate-600"
                          )}>{agent.label}</span>
                        </div>
                        
                        {idx < agents.length - 1 && (
                          <div className="flex-1 h-1 mx-2 bg-white/10 relative overflow-hidden rounded-full">
                            <motion.div 
                              initial={{ width: "0%" }}
                              animate={{ width: isPast ? "100%" : isActive ? "50%" : "0%" }}
                              className="absolute h-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Central View */}
        <div className="flex-1 bg-transparent overflow-y-auto relative flex flex-col">
          {activeAgent !== null && activeAgent !== 'Complete' ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
               <div className="relative w-24 h-24">
                 <div className="absolute inset-0 bg-emerald-400/30 rounded-full animate-ping opacity-20 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]"></div>
                 <div className="absolute inset-2 bg-emerald-500/20 border border-emerald-400/40 rounded-full flex items-center justify-center shadow-inner">
                   <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                 </div>
               </div>
               <div className="text-center">
                 <h3 className="text-lg font-bold text-slate-100 mb-2">Analyzing Profile Data</h3>
                 <p className="text-slate-400 text-sm max-w-md mx-auto">Agents are actively formulating, verifying, and challenging the financial pathways...</p>
               </div>
            </div>
          ) : activeAgent === 'Complete' && reportData ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-5xl mx-auto space-y-6 pb-20 w-full">
              
              {/* Executive Summary */}
              <div className="glass-panel p-8 rounded-2xl">
                <h3 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                  <Target className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Executive Summary
                </h3>
                <div className="prose prose-invert prose-lg max-w-none text-slate-300">
                  <ReactMarkdown>{reportData?.expl || ''}</ReactMarkdown>
                </div>
              </div>

              {/* Security & Critique Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl flex flex-col">
                  <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"/> Verifier Attestation
                  </h3>
                  <div className={cn("flex-1 p-4 rounded-xl font-medium flex items-center justify-center text-center", reportData?.verif?.verified ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30")}>
                    {reportData?.verif?.verified ? `Passed: ${reportData?.verif?.message}` : `Flagged: ${reportData?.verif?.message}`}
                  </div>
                </div>
                
                <div className="glass-panel p-6 rounded-2xl flex flex-col">
                  <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"/> Challenger Critique
                  </h3>
                  <div className="flex-1 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 overflow-y-auto max-h-48">
                    <div className="prose prose-sm prose-invert max-w-none text-orange-200">
                      <ReactMarkdown>{reportData?.chal || ''}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Pathways */}
              <div className="glass-panel p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> Deep Dive: Technical Pathways
                </h3>
                <div className="prose prose-sm prose-invert max-w-none bg-slate-950/50 p-6 rounded-xl border border-white/10 text-slate-300">
                  <ReactMarkdown>{reportData?.rawPlan || ''}</ReactMarkdown>
                </div>
              </div>
              
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-50">
              <Brain className="w-16 h-16 text-slate-600" />
              <p className="text-slate-500 font-medium">Execute Agents to view the Interactive Financial Plan.</p>
            </div>
          )}
        </div>

      </div>

      {/* Hidden Div for PDF Generation */}
      {reportData && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div ref={reportRef} className="w-[800px] p-10 bg-white text-slate-800 font-sans">
            <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Wealth Plan Report</h1>
                <p className="text-slate-500 mt-2">Generated by Aura AI Advisory</p>
              </div>
              <div className="text-right text-sm">
                <p><span className="font-semibold">Client:</span> {profile?.name}</p>
                <p><span className="font-semibold">Date:</span> {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-lg border border-slate-200">
              <div><h3 className="text-slate-500 text-xs uppercase font-bold">Net Worth</h3><p className="text-xl font-bold text-emerald-700">${profile?.netWorth.toLocaleString()}</p></div>
              <div><h3 className="text-slate-500 text-xs uppercase font-bold">Risk Profile</h3><p className="text-xl font-bold">{profile?.riskAppetite}</p></div>
              <div><h3 className="text-slate-500 text-xs uppercase font-bold">Income</h3><p className="font-medium">${profile?.monthlyIncome.toLocaleString()} / mo</p></div>
              <div><h3 className="text-slate-500 text-xs uppercase font-bold">Expenses</h3><p className="font-medium">${profile?.monthlyExpenses.toLocaleString()} / mo</p></div>
            </div>

            {selectedShocks.length > 0 && (
              <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="text-orange-800 font-bold mb-2">Applied Stress Tests</h3>
                <ul className="list-disc pl-5 text-orange-700 text-sm">
                  {selectedShocks.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            <div className="mb-10 page-break-after">
              <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Executive Summary</h2>
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown>{reportData.expl}</ReactMarkdown>
              </div>
            </div>

            <div className="mb-10 bg-slate-50 p-6 rounded-lg border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" /> Verifier Attestation
              </h2>
              <div className={cn("text-sm font-medium", reportData.verif.verified ? "text-emerald-700" : "text-red-600")}>
                {reportData.verif.verified ? `Passed: ${reportData.verif.message}` : `Flagged: ${reportData.verif.message}`}
              </div>
            </div>

            <div className="mb-10 page-break-after">
              <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6 text-orange-500" /> Devil's Advocate Review
              </h2>
              <div className="prose prose-slate max-w-none text-slate-700">
                <ReactMarkdown>{reportData.chal}</ReactMarkdown>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Raw Technical Pathways</h2>
              <div className="prose prose-sm prose-slate max-w-none text-slate-600">
                <ReactMarkdown>{reportData.rawPlan}</ReactMarkdown>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
