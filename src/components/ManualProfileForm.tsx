import React, { useState } from 'react';
import { FinanceProfile } from '../services/financeEngine';
import { RefreshCw } from 'lucide-react';

interface ManualProfileFormProps {
  onProfileSubmit: (profile: FinanceProfile) => void;
  isGeneratingProfile: boolean;
}

export const ManualProfileForm: React.FC<ManualProfileFormProps> = ({ onProfileSubmit, isGeneratingProfile }) => {
  const [manualData, setManualData] = useState({
    name: 'Jane Doe',
    age: 35,
    net_worth: 500000,
    monthly_income: 15000,
    monthly_expense: 8000,
    stated_risk_tolerance: 'Medium',
    goals: 'Retirement, Wealth Accumulation'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    onProfileSubmit(newProfile);
  };

  return (
    <form onSubmit={handleSubmit} className="px-3 space-y-2">
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Name</label>
        <input 
          type="text" 
          required 
          value={manualData.name} 
          onChange={e => setManualData({...manualData, name: e.target.value})} 
          className="w-full bg-[#1E293B] border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50" 
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-1">Age</label>
          <input 
            type="number" 
            required 
            value={manualData.age} 
            onChange={e => setManualData({...manualData, age: Number(e.target.value)})} 
            className="w-full bg-[#1E293B] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50" 
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-1">Net Worth</label>
          <input 
            type="number" 
            required 
            value={manualData.net_worth} 
            onChange={e => setManualData({...manualData, net_worth: Number(e.target.value)})} 
            className="w-full bg-[#1E293B] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50" 
          />
        </div>
      </div>
      <button 
        type="submit" 
        disabled={isGeneratingProfile} 
        className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-2 rounded-lg text-xs transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGeneratingProfile ? (
          <><RefreshCw className="w-3 h-3 animate-spin" /> Processing...</>
        ) : 'Save Profile'}
      </button>
    </form>
  );
};
