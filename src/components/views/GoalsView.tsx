import React from 'react';
import { Target, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { FinanceProfile } from '../../services/financeEngine';
import { cn } from '../../lib/utils';

interface GoalsViewProps {
  profile: FinanceProfile;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ profile }) => {
  return (
    <div className="flex flex-col h-full bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="bg-[#1E293B] px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg">
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">Financial Goals</h2>
            <p className="text-xs text-slate-400">Tactical objectives and timelines</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {profile.goals.length === 0 ? (
          <div className="text-center text-slate-500 py-10">
            No goals identified for this profile.
          </div>
        ) : (
          profile.goals.map((goal, index) => {
            // Simulated progress for demonstration purposes based on index
            const progress = Math.min(100, Math.max(10, Math.round((Math.sin(index * 42) + 1) * 40)));
            const isCompleted = progress === 100;

            return (
              <div key={index} className="bg-[#1E293B]/50 rounded-xl border border-white/5 p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      isCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
                    )}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-200 text-lg">{goal}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" /> Projected completion: {new Date(Date.now() + index * 31536000000).getFullYear()}
                      </p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-slate-300">{progress}%</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-emerald-400"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
