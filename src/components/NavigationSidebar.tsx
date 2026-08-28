import React from 'react';
import { Home, FileText, Heart, Briefcase, Activity, TrendingUp, BarChart2 } from 'lucide-react';
import { cn } from '../lib/utils';

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'plan', label: 'Financial Plan', icon: FileText },
  { id: 'goals', label: 'Goals', icon: Heart },
  { id: 'assets', label: 'Assets & Liabilities', icon: Briefcase },
  { id: 'cashflow', label: 'Cash Flow', icon: Activity },
  { id: 'risk', label: 'Risk Profile', icon: TrendingUp },
  { id: 'recommendations', label: 'Recommendations', icon: BarChart2 },
  { id: 'reports', label: 'Reports', icon: FileText },
] as const;

export type NavTab = typeof NAV_ITEMS[number]['id'];

interface NavigationSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <>
      <div className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Navigation</div>
      {NAV_ITEMS.map(item => (
        <button 
          key={item.id} 
          onClick={() => onTabChange(item.id)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors group",
            activeTab === item.id 
              ? "bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20" 
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
          )}
        >
          <item.icon className={cn(
            "w-4 h-4 transition-colors",
            activeTab === item.id ? "text-emerald-400" : "group-hover:text-emerald-400"
          )} />
          {item.label}
        </button>
      ))}
    </>
  );
};
