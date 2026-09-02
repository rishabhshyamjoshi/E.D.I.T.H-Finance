import React, { useState, useRef, useEffect } from 'react';
import { Brain, RefreshCw, User, Zap, FileText, Play, Activity, Terminal, AlertTriangle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import ReactMarkdown from 'react-markdown';
import { AgentOffice2D } from './AgentOffice2D';
import { DataVisualizer } from './DataVisualizer';
import { generateRawClientData, computeProfileFromData, FinanceProfile } from '../services/financeEngine';
import { useAgentOrchestrator } from '../hooks/useAgentOrchestrator';
import { ManualProfileForm } from './ManualProfileForm';
import { NavigationSidebar, NavTab } from './NavigationSidebar';
import { OverviewView } from './views/OverviewView';
import { FinancialPlanView } from './views/FinancialPlanView';
import { GoalsView } from './views/GoalsView';
import { AssetsLiabilitiesView } from './views/AssetsLiabilitiesView';
import { CashFlowView } from './views/CashFlowView';
import { RiskProfileView } from './views/RiskProfileView';
import { RecommendationsView } from './views/RecommendationsView';
import { ReportsView } from './views/ReportsView';
import { STORAGE_KEYS } from '../config/constants';

export const FinancePanel = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [profile, setProfile] = useState<FinanceProfile | null>(null);
  const [profileMode, setProfileMode] = useState<'synthetic' | 'manual' | 'parse'>('synthetic');
  const [rawNotes, setRawNotes] = useState('');
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  
  const [history, setHistory] = useState<{ id: string, date: string, profile: FinanceProfile, reportData: any }[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);

  const { activeAgent, terminalLogs, reportData, setReportData, runAgentFlow, resetAgentState, addTermLog } = useAgentOrchestrator((report) => {
    if (profile) {
      setHistory(prev => [{
        id: Math.random().toString(36).substring(7),
        date: new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
        profile,
        reportData: report
      }, ...prev]);
    }
  });
  
  const reportRef = useRef<HTMLDivElement>(null);

  const handleGenerateProfile = async () => {
    setIsGeneratingProfile(true);
    resetAgentState();
    try {
      addTermLog("Generating raw synthetic client data...", "info");
      const rawData = generateRawClientData();
      
      addTermLog("Sending data to Profile Engine...", "info");
      const newProfile = await computeProfileFromData(rawData, (msg) => addTermLog(msg, "error"));
      
      setProfile(newProfile);
      addTermLog(`Profile generated successfully for ${newProfile.name}.`, "success");
      return newProfile;
    } catch (e) {
      addTermLog("Failed to generate synthetic profile.", "error");
    } finally {
      setIsGeneratingProfile(false);
    }
    return null;
  };

  const handleParseSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawNotes.trim()) return;
    setIsGeneratingProfile(true);
    resetAgentState();
    
    try {
      addTermLog("Sending notes to Profile Engine...", "info");
      const newProfile = await computeProfileFromData(rawNotes, (msg) => addTermLog(msg, "error"));
      
      setProfile(newProfile);
      addTermLog(`Profile generated successfully for ${newProfile.name}.`, "success");
    } catch (e: any) {
      addTermLog(`Failed to parse text: ${e.message}`, "error");
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  const handleGenerateAndRunProfile = async () => {
    const newProfile = await handleGenerateProfile();
    if (newProfile) {
      runAgentFlow(newProfile, false); // Run in background to not block callback
    }
    return newProfile;
  };

  useEffect(() => {
    const handleVoiceCommand = async (e: any) => {
      const { name, args, callback } = e.detail;
      if (name === 'execute_agents') {
        runAgentFlow(profile, true);
      } else if (name === 'change_mode') {
        if (args?.mode) setProfileMode(args.mode.toLowerCase());
      } else if (name === 'parse_notes') {
        setProfileMode('parse');
        handleParseSubmit();
      }
    };
    window.addEventListener('aura_voice_command', handleVoiceCommand);
    return () => window.removeEventListener('aura_voice_command', handleVoiceCommand);
  }, [profile, runAgentFlow]);

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
             <ManualProfileForm 
               isGeneratingProfile={isGeneratingProfile} 
               onProfileSubmit={(p) => {
                 setProfile(p);
                 resetAgentState();
                 addTermLog(`Profile initialized successfully for ${p.name}.`, "success");
               }} 
             />
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
              <NavigationSidebar activeTab={activeTab} onTabChange={setActiveTab} />
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
             onClick={() => { setProfile(null); resetAgentState(); }}
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
              <button 
                onClick={() => window.print()} 
                className="px-4 py-2 bg-[#1E293B] hover:bg-slate-700 text-sm font-medium rounded-lg transition-colors border border-white/10"
              >Export PDF</button>
              <button 
                onClick={async () => {
                  const text = `E.D.I.T.H. Financial Report for ${profile.name} — Net Worth: $${profile.netWorth.toLocaleString()}, Risk: ${profile.riskAppetite}`;
                  if (navigator.share) {
                    await navigator.share({ title: 'E.D.I.T.H. Report', text });
                  } else {
                    await navigator.clipboard.writeText(text);
                    alert('Report summary copied to clipboard!');
                  }
                }} 
                className="px-4 py-2 bg-[#1E293B] hover:bg-slate-700 text-sm font-medium rounded-lg transition-colors border border-white/10"
              >Share</button>
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
            <div className="col-span-8 flex flex-col gap-6 h-full">
              {activeTab === 'overview' && (
                <OverviewView 
                  profile={profile} 
                  activeAgent={activeAgent} 
                  reportData={reportData} 
                  reportRef={reportRef} 
                />
              )}
              {activeTab === 'plan' && (
                <FinancialPlanView profile={profile} reportData={reportData} />
              )}
              {activeTab === 'goals' && (
                <GoalsView profile={profile} />
              )}
              {activeTab === 'assets' && (
                <AssetsLiabilitiesView profile={profile} />
              )}
              {activeTab === 'cashflow' && (
                <CashFlowView profile={profile} />
              )}
              {activeTab === 'risk' && (
                <RiskProfileView profile={profile} reportData={reportData} />
              )}
              {activeTab === 'recommendations' && (
                <RecommendationsView profile={profile} reportData={reportData} />
              )}
              {activeTab === 'reports' && (
                <ReportsView history={history} />
              )}
              {!['overview', 'plan', 'goals', 'assets', 'cashflow', 'risk', 'recommendations', 'reports'].includes(activeTab) && (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 bg-[#0F172A] rounded-xl border border-white/10">
                  <h2 className="text-xl font-medium text-slate-400 mb-2">View Under Construction</h2>
                  <p className="text-sm text-slate-500">The {activeTab} view is currently being implemented.</p>
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
                    <button 
                      key={h.id} 
                      onClick={() => { setProfile(h.profile); setReportData(h.reportData || null); }}
                      className="w-full text-left p-2 rounded bg-[#1E293B] hover:bg-slate-700 transition-colors border border-white/5 text-xs">
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
