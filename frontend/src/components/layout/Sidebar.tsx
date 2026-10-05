import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Receipt, TrendingUp, TrendingDown, 
  PieChart, LineChart, Activity, Sparkles, Sliders, 
  FileText, UploadCloud, Settings, ChevronLeft, ChevronRight,
  Building2, LogOut, User
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Smallest viable responsive fix: auto-collapse to the existing icon-only
  // mode on narrow viewports instead of a fixed 256px sidebar eating most of
  // a tablet/mobile screen. Reuses the collapse mechanism already built -
  // no new drawer/hamburger UI, no visual redesign. User can still manually
  // expand/collapse via the existing toggle afterward.
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 1024) setCollapsed(true);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'forecasting', label: 'Forecasting', icon: LineChart },
    { id: 'health', label: 'Financial Health', icon: Activity },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
    { id: 'simulator', label: 'Scenario Simulator', icon: Sliders },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'import', label: 'Data Import', icon: UploadCloud },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`bg-white border-r border-slate-200 h-screen sticky top-0 transition-all duration-300 flex flex-col z-30 ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
         <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
           <img src="/logo.png" alt="PathFortune" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div>
              <div className="font-bold text-slate-900 tracking-tight text-base leading-tight">PathFortune</div>
              <div className="text-[10px] font-semibold tracking-wider text-brand-600 uppercase">FINANCES AI</div>
            </div>
          )}
        </div>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Business Selector Badge */}
      {!collapsed && (
        <div className="mx-3 mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center space-x-2.5">
          <Building2 size={16} className="text-brand-600 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-slate-800 truncate">PathFortune Tech</div>
            <div className="text-[10px] text-slate-500">SaaS & Enterprise AI</div>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/60 shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={19} className={isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.id === 'insights' && (
                <span className="ml-auto bg-brand-100 text-brand-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">AI</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User Profile */}
      <div className="p-3 border-t border-slate-100">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} p-2 rounded-xl hover:bg-slate-50 transition-colors`}>
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            SF
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">Sarthak CFO</div>
              <div className="text-[10px] text-slate-500 truncate">admin@pathfortune.ai</div>
            </div>
          )}
          {!collapsed && (
            <button className="text-slate-400 hover:text-slate-600 p-1" title="Logout">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
