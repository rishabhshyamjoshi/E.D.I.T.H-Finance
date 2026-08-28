import React from 'react';
import { Briefcase, Building, Landmark, Coins, TrendingDown } from 'lucide-react';
import { FinanceProfile } from '../../services/financeEngine';
import { cn } from '../../lib/utils';

interface AssetsLiabilitiesViewProps {
  profile: FinanceProfile;
}

export const AssetsLiabilitiesView: React.FC<AssetsLiabilitiesViewProps> = ({ profile }) => {
  // Simulate asset breakdown for visual density based on net worth
  const totalAssets = profile.netWorth * 1.3; // Assume they have some debt
  const totalLiabilities = totalAssets - profile.netWorth;
  
  const assets = [
    { name: 'Equities & Stocks', value: totalAssets * 0.45, icon: TrendingDown, color: 'text-blue-400', bg: 'bg-blue-400/20' },
    { name: 'Real Estate', value: totalAssets * 0.35, icon: Building, color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
    { name: 'Liquid Cash', value: totalAssets * 0.15, icon: Coins, color: 'text-amber-400', bg: 'bg-amber-400/20' },
    { name: 'Alternative Assets', value: totalAssets * 0.05, icon: Landmark, color: 'text-purple-400', bg: 'bg-purple-400/20' },
  ];

  const liabilities = [
    { name: 'Mortgage', value: totalLiabilities * 0.8, color: 'text-rose-400', bg: 'bg-rose-400/20' },
    { name: 'Consumer Debt', value: totalLiabilities * 0.2, color: 'text-orange-400', bg: 'bg-orange-400/20' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="bg-[#1E293B] px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg">
            <Briefcase className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">Assets & Liabilities</h2>
            <p className="text-xs text-slate-400">Net worth composition analysis</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Total Net Worth</p>
          <p className="text-xl font-bold text-emerald-400">${profile.netWorth.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Assets Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 border-b border-white/10 pb-2 flex justify-between">
            <span>Assets</span>
            <span className="text-blue-400">${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {assets.map((asset, i) => (
              <div key={i} className="bg-[#1E293B]/50 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                <div className={cn("p-3 rounded-lg", asset.bg, asset.color)}>
                  <asset.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">{asset.name}</p>
                  <p className="text-sm font-bold text-slate-200">${asset.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liabilities Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 border-b border-white/10 pb-2 flex justify-between mt-8">
            <span>Liabilities</span>
            <span className="text-rose-400">${totalLiabilities.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </h3>
          <div className="space-y-3">
            {liabilities.map((liability, i) => (
              <div key={i} className="bg-[#1E293B]/50 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-8 rounded-full", liability.bg)} />
                  <span className="text-sm text-slate-300 font-medium">{liability.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-200">${liability.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
            {totalLiabilities === 0 && (
              <div className="text-center text-emerald-500/70 py-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                Debt Free! No liabilities recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
