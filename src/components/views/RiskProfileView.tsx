import React from 'react';
import ReactMarkdown from 'react-markdown';
import { TrendingUp, ShieldAlert, AlertTriangle, Search } from 'lucide-react';
import { FinanceProfile } from '../../services/financeEngine';
import { cn } from '../../lib/utils';

interface RiskProfileViewProps {
  profile: FinanceProfile;
  reportData: any;
}

export const RiskProfileView: React.FC<RiskProfileViewProps> = ({ profile, reportData }) => {
  const getRiskColor = (risk: string) => {
    switch(risk.toLowerCase()) {
      case 'low': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'high': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="bg-[#1E293B] px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">Risk Profile Assessment</h2>
            <p className="text-xs text-slate-400">Stress testing and vulnerability analysis</p>
          </div>
        </div>
        <div className={cn("px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider", getRiskColor(profile.riskAppetite))}>
          {profile.riskAppetite} Risk Tolerance
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldAlert className="w-24 h-24 text-rose-500" />
          </div>
          <h3 className="text-rose-400 font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Challenger Agent Analysis
          </h3>
          <p className="text-sm text-slate-300 mb-4 max-w-2xl">
            The Challenger Agent stress-tests the financial plan by identifying critical weaknesses, macro-economic vulnerabilities, and alignment gaps with the stated risk appetite.
          </p>
          
          {reportData ? (
            <div className="prose prose-invert prose-rose max-w-none text-sm bg-black/40 p-5 rounded-lg border border-rose-500/10 relative z-10">
              <ReactMarkdown>{reportData.chal}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-rose-400/70 bg-black/40 p-4 rounded-lg border border-rose-500/10">
              <Search className="w-5 h-5" />
              <span className="text-sm">Run Analysis to generate the Challenger Agent stress-test.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
