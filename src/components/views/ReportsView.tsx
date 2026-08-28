import React from 'react';
import { FileText, Download, Share2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ReportsViewProps {
  history: any[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ history }) => {
  return (
    <div className="flex flex-col h-full bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="bg-[#1E293B] px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">Intelligence Reports Archive</h2>
            <p className="text-xs text-slate-400">Historical analysis and audits</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {history.length === 0 ? (
          <div className="text-center text-slate-500 py-10">
            No historical reports generated yet.
          </div>
        ) : (
          history.map((record) => {
            const isVerified = record.reportData?.verif?.verified;
            return (
              <div key={record.id} className="bg-[#1E293B]/50 p-5 rounded-xl border border-white/5 flex flex-col gap-4 group hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-200">{record.profile.name} - Full Analysis</h3>
                    <p className="text-xs text-slate-500">{record.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 bg-white/5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Export PDF">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-white/5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Share">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1 bg-black/20 p-3 rounded-lg border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase mb-1">Risk Assessed</p>
                    <p className="text-sm font-medium text-slate-300">{record.profile.riskAppetite}</p>
                  </div>
                  <div className="flex-1 bg-black/20 p-3 rounded-lg border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase mb-1">Verifier Status</p>
                    <div className="flex items-center gap-1.5">
                      {isVerified ? (
                        <><CheckCircle className="w-4 h-4 text-emerald-400" /> <span className="text-sm font-medium text-emerald-400">Passed</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-rose-400" /> <span className="text-sm font-medium text-rose-400">Flagged</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 bg-black/20 p-3 rounded-lg border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase mb-1">Net Worth Evaluated</p>
                    <p className="text-sm font-medium text-slate-300">${record.profile.netWorth.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
