import React from 'react';
import { FinanceProfile } from '../services/financeEngine';

export const DataVisualizer = ({ profile }: { profile: FinanceProfile }) => {
  if (!profile) return null;

  const total = profile.netWorth + profile.monthlyIncome * 12 + profile.monthlyExpenses * 12;
  const nwPct = (profile.netWorth / total) * 100;
  const inPct = ((profile.monthlyIncome * 12) / total) * 100;
  const exPct = ((profile.monthlyExpenses * 12) / total) * 100;

  return (
    <div className="bg-[#1E293B] rounded-xl p-6 border border-white/10 mb-6 shadow-xl">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        Financial Overview Visualization
      </h3>
      <div className="flex flex-col gap-4">
        {/* Net Worth Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Net Worth</span>
            <span className="text-emerald-400 font-medium">${profile.netWorth.toLocaleString()}</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
              style={{ width: `${Math.max(nwPct, 5)}%` }} 
            />
          </div>
        </div>

        {/* Income Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Annual Income</span>
            <span className="text-blue-400 font-medium">${(profile.monthlyIncome * 12).toLocaleString()}</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
              style={{ width: `${Math.max(inPct, 5)}%` }} 
            />
          </div>
        </div>

        {/* Expenses Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Annual Expenses</span>
            <span className="text-rose-400 font-medium">${(profile.monthlyExpenses * 12).toLocaleString()}</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-rose-500 rounded-full transition-all duration-1000" 
              style={{ width: `${Math.max(exPct, 5)}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
