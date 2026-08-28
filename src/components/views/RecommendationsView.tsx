import React from 'react';
import ReactMarkdown from 'react-markdown';
import { BarChart2, Lightbulb, Search } from 'lucide-react';
import { FinanceProfile } from '../../services/financeEngine';

interface RecommendationsViewProps {
  profile: FinanceProfile;
  reportData: any;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({ profile, reportData }) => {
  return (
    <div className="flex flex-col h-full bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="bg-[#1E293B] px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">AI Recommendations</h2>
            <p className="text-xs text-slate-400">Tactical advice from Explainer Agent</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-[#1E293B]/30 border border-emerald-500/10 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Lightbulb className="w-24 h-24 text-emerald-500" />
          </div>
          
          <h3 className="text-emerald-400 font-bold mb-6 flex items-center gap-2 text-lg">
            Strategic Action Plan
          </h3>
          
          {reportData ? (
            <div className="prose prose-invert prose-emerald max-w-none text-sm relative z-10">
              <ReactMarkdown>{reportData.expl}</ReactMarkdown>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center text-center py-10 opacity-70 relative z-10">
               <Search className="w-12 h-12 text-slate-500 mb-4" />
               <h3 className="text-lg font-medium text-slate-300">Awaiting Analysis</h3>
               <p className="text-sm text-slate-500 max-w-sm mt-2">
                 Run the Agent Analysis engine to generate specific, tactical recommendations for {profile.name}.
               </p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
