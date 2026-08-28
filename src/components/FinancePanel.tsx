import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, RefreshCw, User, Target, Shield, Zap, FileText, Play, 
  Home, Heart, Briefcase, Activity, TrendingUp, BarChart2, Wallet, Lightbulb, ChevronRight,
  Terminal, AlertTriangle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import ReactMarkdown from 'react-markdown';
import { AgentOffice2D } from './AgentOffice2D';
import { DataVisualizer } from './DataVisualizer';
import { generateRawClientData, computeProfileFromData, orchestrateFinancePlan, generateExplanation, verifyNumbers, generateChallenge, FinanceProfile } from '../services/financeEngine';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'plan', label: 'Financial Plan', icon: FileText },
  { id: 'goals', label: 'Goals', icon: Heart },
  { id: 'assets', label: 'Assets & Liabilities', icon: Briefcase },
  { id: 'cashflow', label: 'Cash Flow', icon: Activity },
  { id: 'risk', label: 'Risk Profile', icon: TrendingUp },
  { id: 'recommendations', label: 'Recommendations', icon: BarChart2 },
  { id: 'reports', label: 'Reports', icon: FileText },
];

export const FinancePanel = () => {
  const [profile, setProfile] = useState<FinanceProfile | null>(null);
  const [profileMode, setProfileMode] = useState<'synthetic' | 'manual' | 'parse'>('synthetic');
  const [rawNotes, setRawNotes] = useState('');
  const [manualData, setManualData] = useState({
    name: 'Jane Doe',
    age: 35,
    net_worth: 500000,
    monthly_income: 15000,
    monthly_expense: 8000,
    stated_risk_tolerance: 'Medium',
    goals: 'Retirement, Wealth Accumulation'
  });
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  
  const [history, setHistory] = useState<{ id: string, date: string, profile: FinanceProfile, reportData: any }[]>(() => {
    const saved = localStorage.getItem('aura_plan_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('aura_plan_history', JSON.stringify(history));
  }, [history]);
  
  const [activeAgent, setActiveAgent] = useState<'Orchestrator' | 'Explainer' | 'Verifier' | 'Challenger' | 'Complete' | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<{ id: string, text: string, type: 'info' | 'data' | 'success' | 'error' }[]>([]);
  const [reportData, setReportData] = useState<{ rawPlan: string, expl: string, verif: any, chal: string } | null>(null);
  
  const reportRef = useRef<HTMLDivElement>(null);

  const addTermLog = (text: string, type: 'info' | 'data' | 'success' | 'error' = 'info') => {
    setTerminalLogs(prev => [...prev, { id: Math.random().toString(36).substring(7), text, type }]);
  };

  const handleGenerateProfile = async () => {
    setIsGeneratingProfile(true);
    setTerminalLogs([]);
    setReportData(null);
    setActiveAgent(null);
    try {
      addTermLog("Generating raw synthetic client data...", "info");
      const rawData = generateRawClientData();
      
      addTermLog("Sending data to Profile Engine...", "info");
      const newProfile = await computeProfileFromData(rawData);
      
      setProfile(newProfile);
      addTermLog(`Profile generated successfully for ${newProfile.name}.`, "success");
    } catch (e) {
      addTermLog("Failed to generate synthetic profile.", "error");
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingProfile(true);
    setTerminalLogs([]);
    setReportData(null);
    setActiveAgent(null);
    
    try {
      addTermLog("Processing manual profile data...", "info");
      
      const newProfile: FinanceProfile = {
        name: manualData.name,
        age: manualData.age,
        netWorth: manualData.net_worth,
        monthlyIncome: manualData.monthly_income,
        monthlyExpenses: manualData.monthly_expense,
        riskAppetite: manualData.stated_risk_tolerance as any,
        goals: manualData.goals.split(',').map(g => g.trim()).filter(g => g),
        pastTrends: 'Manual input data.'
      };
      
      setProfile(newProfile);
      addTermLog(`Profile initialized successfully for ${newProfile.name}.`, "success");
    } catch (e: any) {
      addTermLog(`Failed to submit manual profile: ${e.message}`, "error");
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  const handleParseSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawNotes.trim()) return;
    setIsGeneratingProfile(true);
    setTerminalLogs([]);
    setReportData(null);
    setActiveAgent(null);
    
    try {
      addTermLog("Sending notes to Profile Engine...", "info");
      const newProfile = await computeProfileFromData(rawNotes);
      
      setProfile(newProfile);
      addTermLog(`Profile generated successfully for ${newProfile.name}.`, "success");
    } catch (e: any) {
      addTermLog(`Failed to parse text: ${e.message}`, "error");
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  const runAgentFlow = async (targetProfile: FinanceProfile | null = profile, clearLogs: boolean = true) => {
    if (!targetProfile) return;
    if (clearLogs) setTerminalLogs([]);
    setReportData(null);
    
    try {
      // Step 1: Orchestrator
      setActiveAgent('Orchestrator');
      addTermLog("Orchestrator started: Analyzing profile and generating base plans...", "info");
      const rawPlan = await orchestrateFinancePlan(targetProfile, []);
      addTermLog("Orchestrator finished generating raw plans.", "success");
      
      // Step 2: Explainer
      setActiveAgent('Explainer');
      addTermLog("Explainer started: Translating plan into accessible summary...", "info");
      const expl = await generateExplanation(rawPlan);
      addTermLog("Explainer finished summary translation.", "success");
      
      // Step 3: Verifier
      setActiveAgent('Verifier');
      addTermLog("Verifier started: Auditing numbers and checking for hallucinations...", "info");
      const verif = await verifyNumbers(rawPlan, expl);
      addTermLog(verif.message, verif.verified ? "success" : "error");
      
      // Step 4: Challenger
      setActiveAgent('Challenger');
      addTermLog("Challenger started: Stress-testing plan and seeking flaws...", "info");
      const chal = await generateChallenge(targetProfile, rawPlan);
      addTermLog("Challenger completed stress-test.", "success");
      
      // Complete
      const currentReport = { rawPlan, expl, verif, chal };
      setReportData(currentReport);
      setActiveAgent('Complete');
      setHistory(prev => [{
        id: Math.random().toString(36).substring(7),
        date: new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
        profile: targetProfile,
        reportData: currentReport
      }, ...prev]);
      
    } catch (e: any) {
      addTermLog(`Agent flow error: ${e.message}`, "error");
      setActiveAgent(null);
    }
  };

  const handleGenerateAndRunProfile = async () => {
    setIsGeneratingProfile(true);
    setTerminalLogs([]);
    setReportData(null);
    setActiveAgent(null);
    try {
      addTermLog("Generating raw synthetic client data...", "info");
      const rawData = generateRawClientData();
      
      addTermLog("Sending data to Profile Engine...", "info");
      const newProfile = await computeProfileFromData(rawData);
      
      setProfile(newProfile);
      addTermLog(`Profile generated successfully for ${newProfile.name}.`, "success");
      
      // Auto run agent flow!
      await runAgentFlow(newProfile, false);
    } catch (e) {
      addTermLog("Failed to generate synthetic profile and run agents.", "error");
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  useEffect(() => {
    const handleVoiceCommand = (e: any) => {
      const { name, args } = e.detail;
      if (name === 'execute_agents') {
        runAgentFlow();
      } else if (name === 'change_mode') {
        if (args?.mode) setProfileMode(args.mode.toLowerCase());
      } else if (name === 'generate_synthetic_profile') {
        setProfileMode('synthetic');
        handleGenerateAndRunProfile();
      } else if (name === 'parse_notes') {
        setProfileMode('parse');
        handleParseSubmit();
      }
    };
    window.addEventListener('aura_voice_command', handleVoiceCommand);
    return () => window.removeEventListener('aura_voice_command', handleVoiceCommand);
  }, [profile]);

  const agents = [
    { id: 'Orchestrator', step: 1, label: 'Profile Analysis', desc: 'Extracting insights...' },
    { id: 'Explainer', step: 2, label: 'Goal Planning', desc: 'In Progress' },
    { id: 'Verifier', step: 3, label: 'Strategy Building', desc: 'Pending' },
    { id: 'Challenger', step: 4, label: 'Report Generation', desc: 'Pending' },
  ];

  return (
    <div className="flex h-full font-sans bg-[#0B1120] text-slate-300 overflow-hidden">
      
      {/* Left Sidebar */}
      <div className="w-[280px] bg-[#0F172A] border-r border-white/5 flex flex-col h-full flex-shrink-0 z-10 m-4 rounded-xl border">
        
        {/* Profile Tabs */}
        <div className="p-5 pb-2">
          <h2 className="font-semibold text-slate-100 text-sm flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Client Profile
          </h2>
          <div className="flex rounded-lg overflow-hidden bg-[#1E293B] p-1 gap-1 border border-white/5 flex-col">
            <button 
              onClick={() => setProfileMode('synthetic')}
              className={cn("w-full text-xs py-1.5 font-medium rounded transition-colors", profileMode === 'synthetic' ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-slate-300")}
            >
              Synthetic Data
            </button>
            <div className="flex gap-1">
              <button 
                onClick={() => setProfileMode('manual')}
                className={cn("flex-1 text-[10px] py-1.5 font-medium rounded transition-colors", profileMode === 'manual' ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-slate-300")}
              >
                Manual Entry
              </button>
              <button 
                onClick={() => setProfileMode('parse')}
                className={cn("flex-1 text-[10px] py-1.5 font-medium rounded transition-colors", profileMode === 'parse' ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-slate-300")}
              >
                AI Parse
              </button>
            </div>
          </div>
        </div>
        
        {/* Navigation / Forms Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {profileMode === 'manual' && !profile ? (
             <form onSubmit={handleManualSubmit} className="px-3 space-y-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Name</label>
                  <input type="text" required value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} className="w-full text-xs p-1.5 bg-slate-900/50 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Age</label>
                    <input type="number" required value={manualData.age} onChange={e => setManualData({...manualData, age: Number(e.target.value)})} className="w-full text-xs p-1.5 bg-slate-900/50 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Net Worth</label>
                    <input type="number" required value={manualData.net_worth} onChange={e => setManualData({...manualData, net_worth: Number(e.target.value)})} className="w-full text-xs p-1.5 bg-slate-900/50 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500/50" />
                  </div>
                </div>
                <button type="submit" disabled={isGeneratingProfile} className="w-full mt-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                  {isGeneratingProfile ? 'Processing...' : 'Save Profile'}
                </button>
             </form>
          ) : profileMode === 'parse' && !profile ? (
            <form onSubmit={handleParseSubmit} className="px-3 space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Raw Meeting Notes</label>
                <textarea 
                  value={rawNotes} 
                  onChange={e => setRawNotes(e.target.value)} 
                  placeholder="Paste unstructured notes from client meeting here..."
                  className="w-full text-xs p-2 bg-slate-900/50 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500/50 min-h-[150px] resize-none" 
                  required
                />
              </div>
              <button type="submit" disabled={isGeneratingProfile} className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                {isGeneratingProfile ? 'Extracting Data...' : 'Extract Profile via AI'}
              </button>
            </form>
          ) : (
            <>
              {profile && (
                <div className="px-3 mb-6">
                  <div className="bg-[#1E293B] rounded-lg p-3 border border-white/5">
                    <h3 className="text-sm font-semibold text-white mb-2">{profile.name}</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div className="text-slate-400">Age: <span className="text-slate-200">{profile.age}</span></div>
                      <div className="text-slate-400">Net Worth: <span className="text-emerald-400">${profile.netWorth.toLocaleString()}</span></div>
                      <div className="text-slate-400">Income: <span className="text-slate-200">${profile.monthlyIncome.toLocaleString()}/mo</span></div>
                      <div className="text-slate-400">Risk: <span className="text-amber-400">{profile.riskAppetite}</span></div>
                    </div>
                  </div>
                </div>
              )}
              <div className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Navigation</div>
              {NAV_ITEMS.map(item => (
                <button key={item.id} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors group">
                  <item.icon className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
                  {item.label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/5 bg-[#1E293B]/30">
           {profileMode === 'synthetic' && !profile && (
             <button 
               onClick={handleGenerateAndRunProfile}
               disabled={isGeneratingProfile}
               className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
             >
               {isGeneratingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
               {isGeneratingProfile ? 'Generating...' : 'Generate Profile'}
             </button>
           )}
           {profile && !reportData && !activeAgent && (
             <button 
               onClick={() => runAgentFlow(profile, true)}
               className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
             >
               <Play className="w-4 h-4" />
               Run Analysis
             </button>
           )}
           <button 
             onClick={() => { setProfile(null); setReportData(null); setActiveAgent(null); setTerminalLogs([]); }}
             className="w-full mt-2 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
           >
             Reset Dashboard
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 p-6 overflow-y-auto">
        
        {/* Header */}
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Brain className="w-8 h-8 text-emerald-400" /> E.D.I.T.H.
            </h1>
            <p className="text-slate-400 text-sm mt-1 ml-11">Tactical Financial Intelligence</p>
          </div>
          {profile && (
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[#1E293B] hover:bg-slate-700 text-sm font-medium rounded-lg transition-colors border border-white/10">Export PDF</button>
              <button className="px-4 py-2 bg-[#1E293B] hover:bg-slate-700 text-sm font-medium rounded-lg transition-colors border border-white/10">Share</button>
            </div>
          )}
        </header>

        {!profile && !isGeneratingProfile && (
           <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
             <Brain className="w-24 h-24 text-slate-700 mb-6" />
             <h2 className="text-xl font-medium text-slate-400 mb-2">System Standing By</h2>
             <p className="text-sm text-slate-500 max-w-sm">Select a profile mode from the sidebar to initialize the AI analysis engine.</p>
           </div>
        )}

        {isGeneratingProfile && !profile && (
           <div className="flex-1 flex flex-col items-center justify-center">
             <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
             <p className="text-slate-400 animate-pulse">Initializing Neural Link...</p>
           </div>
        )}

        {/* Results Area */}
        {profile && (
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            
            {/* Middle Column: Visualizations & Output */}
            <div className="col-span-8 flex flex-col gap-6">
              
              <DataVisualizer profile={profile} />

              <AgentOffice2D activeAgent={activeAgent} />
              
              {/* Reports */}
              {reportData && (
                <div ref={reportRef} className="bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden flex flex-col flex-1 shadow-2xl">
                  <div className="bg-[#1E293B] px-5 py-3 border-b border-white/5 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-sm text-slate-200">Final Intelligence Report</span>
                  </div>
                  <div className="p-6 overflow-y-auto prose prose-invert prose-emerald max-w-none text-sm">
                    <ReactMarkdown>{reportData.expl}</ReactMarkdown>
                    
                    <div className="my-8 h-px bg-white/10" />
                    <h3 className="text-rose-400 flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5" /> Risk Analysis</h3>
                    <ReactMarkdown>{reportData.chal}</ReactMarkdown>
                    
                    <div className="my-8 h-px bg-white/10" />
                    <h3 className="text-blue-400 flex items-center gap-2 mb-4"><Activity className="w-5 h-5" /> Orchestrator Raw Data</h3>
                    <ReactMarkdown>{reportData.rawPlan}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Terminal Logs & Agent Status */}
            <div className="col-span-4 flex flex-col gap-6">
               <div className="bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden flex-1 shadow-2xl flex flex-col">
                 <div className="bg-[#1E293B] px-4 py-2 border-b border-white/5 flex items-center gap-2">
                   <Terminal className="w-4 h-4 text-slate-400" />
                   <span className="text-xs font-semibold text-slate-300">Live Execution Logs</span>
                 </div>
                 <div className="p-4 flex-1 overflow-y-auto bg-black/40 font-mono text-[10px] space-y-2">
                   {terminalLogs.map((log) => (
                     <div key={log.id} className={cn("break-words", 
                       log.type === 'error' ? "text-rose-400" :
                       log.type === 'success' ? "text-emerald-400" :
                       log.type === 'data' ? "text-blue-400" : "text-slate-400"
                     )}>
                       <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                       {log.text}
                     </div>
                   ))}
                   {activeAgent && activeAgent !== 'Complete' && (
                     <div className="text-emerald-500/70 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                       Processing...
                     </div>
                   )}
                 </div>
               </div>

               {/* History Panel */}
               <div className="bg-[#0F172A] rounded-xl border border-white/10 p-4 shadow-2xl">
                 <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wider">
                   Session History
                 </h3>
                 <div className="space-y-2 max-h-[200px] overflow-y-auto">
                   {history.map(h => (
                     <button key={h.id} className="w-full text-left p-2 rounded bg-[#1E293B] hover:bg-slate-700 transition-colors border border-white/5 text-xs">
                       <div className="text-emerald-400 font-medium">{h.profile.name}</div>
                       <div className="text-slate-500 mt-1">{h.date}</div>
                     </button>
                   ))}
                   {history.length === 0 && <div className="text-xs text-slate-600 text-center py-4">No past sessions</div>}
                 </div>
               </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
