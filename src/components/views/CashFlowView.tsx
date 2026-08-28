import React from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { FinanceProfile } from '../../services/financeEngine';
import { cn } from '../../lib/utils';

interface CashFlowViewProps {
  profile: FinanceProfile;
}

export const CashFlowView: React.FC<CashFlowViewProps> = ({ profile }) => {
  const savings = profile.monthlyIncome - profile.monthlyExpenses;
  const savingsRate = profile.monthlyIncome > 0 ? Math.round((savings / profile.monthlyIncome) * 100) : 0;
  const burnRate = profile.monthlyIncome > 0 ? Math.round((profile.monthlyExpenses / profile.monthlyIncome) * 100) : 100;

  // Simulate historical data for 6 months
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const historicalData = months.map((month, i) => {
    const variance = (Math.sin(i) * 0.1) + 1; // +/- 10% variance
    return {
      month,
      income: Math.round(profile.monthlyIncome * (i === 5 ? 1 : variance)),
      expenses: Math.round(profile.monthlyExpenses * (i === 5 ? 1 : (variance * 0.95))),
    };
  });

  const maxVal = Math.max(...historicalData.map(d => Math.max(d.income, d.expenses)));

  return (
    <div className="flex flex-col h-full bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="bg-[#1E293B] px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">Cash Flow Analysis</h2>
            <p className="text-xs text-slate-400">Income vs Expenses projection</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1E293B]/50 p-4 rounded-xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <ArrowUpRight className="w-12 h-12 text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-1">Monthly Income</p>
            <p className="text-xl font-bold text-emerald-400">${profile.monthlyIncome.toLocaleString()}</p>
          </div>
          <div className="bg-[#1E293B]/50 p-4 rounded-xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <ArrowDownRight className="w-12 h-12 text-rose-400" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-1">Monthly Expenses</p>
            <p className="text-xl font-bold text-rose-400">${profile.monthlyExpenses.toLocaleString()}</p>
          </div>
          <div className="bg-[#1E293B]/50 p-4 rounded-xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <Wallet className="w-12 h-12 text-blue-400" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-1">Net Savings</p>
            <p className="text-xl font-bold text-blue-400">${savings.toLocaleString()}</p>
          </div>
        </div>

        {/* Efficiency Metrics */}
        <div className="bg-[#1E293B]/30 p-5 rounded-xl border border-white/5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Efficiency Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Savings Rate</span>
                <span className="font-bold text-emerald-400">{savingsRate}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, savingsRate)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Burn Rate</span>
                <span className="font-bold text-rose-400">{burnRate}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-rose-400 h-full rounded-full" style={{ width: `${Math.min(100, burnRate)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-[#1E293B]/30 p-5 rounded-xl border border-white/5">
          <h3 className="text-sm font-semibold text-slate-300 mb-6">6-Month Trend</h3>
          <div className="flex items-end justify-between h-40 gap-2">
            {historicalData.map((d, i) => (
              <div key={i} className="flex flex-col items-center flex-1 gap-2 group">
                <div className="w-full flex justify-center items-end gap-1 h-full relative">
                  <div 
                    className="w-1/3 bg-emerald-500/80 rounded-t-sm transition-all group-hover:bg-emerald-400"
                    style={{ height: `${Math.max(5, (d.income / maxVal) * 100)}%` }}
                    title={`Income: $${d.income.toLocaleString()}`}
                  />
                  <div 
                    className="w-1/3 bg-rose-500/80 rounded-t-sm transition-all group-hover:bg-rose-400"
                    style={{ height: `${Math.max(5, (d.expenses / maxVal) * 100)}%` }}
                    title={`Expenses: $${d.expenses.toLocaleString()}`}
                  />
                </div>
                <span className="text-[10px] text-slate-500 uppercase">{d.month}</span>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
};
