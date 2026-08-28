import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, AlertTriangle, Activity } from 'lucide-react';
import { DataVisualizer } from '../DataVisualizer';
import { AgentOffice2D } from '../AgentOffice2D';
import { FinanceProfile } from '../../services/financeEngine';

interface OverviewViewProps {
  profile: FinanceProfile;
  activeAgent: string | null;
  reportData: any;
  reportRef: React.RefObject<HTMLDivElement>;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ profile, activeAgent, reportData, reportRef }) => {
  return (
    <>
      <DataVisualizer profile={profile} />
      <AgentOffice2D activeAgent={activeAgent} />
      
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
    </>
  );
};
