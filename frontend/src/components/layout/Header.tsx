import React from 'react';
import { Sparkles, Upload, Calendar, RefreshCw, Search } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onOpenAIChat: () => void;
  onNavigateImport: () => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  onOpenAIChat, 
  onNavigateImport,
  onRefresh 
}) => {
  const titles: Record<string, { title: string; subtitle: string }> = {
    overview: { title: 'Financial Overview', subtitle: 'Real-time KPIs, dynamic analytics & health monitoring' },
    transactions: { title: 'Transactions Directory', subtitle: 'Search, filter, and manage corporate income and expenses' },
    revenue: { title: 'Revenue Intelligence', subtitle: 'Top-line growth, customer contributions, and MRR breakdown' },
    expenses: { title: 'Expense Analytics', subtitle: 'Cost category breakdown, top vendors, and department spending' },
    budgets: { title: 'Budget Management', subtitle: 'Monthly targets vs actual expenditure and utilization' },
    forecasting: { title: 'Predictive ML Forecasting', subtitle: 'Time-series Machine Learning predictions for Revenue & Cash Flow' },
    health: { title: 'Financial Health Engine', subtitle: 'Deterministic 0-100 multi-factor business scoring' },
    insights: { title: 'AI Insights & Alerts', subtitle: 'Automated spending warnings and growth recommendations' },
    simulator: { title: 'Scenario Simulator', subtitle: 'Perform deterministic What-If financial impact analysis' },
    reports: { title: 'Financial Reports', subtitle: 'Executive summaries and exportable management statements' },
    import: { title: 'Data Import Center', subtitle: 'Upload CSV/Excel, validate transactions & map fields' },
    settings: { title: 'Platform Settings', subtitle: 'Business profile, currency defaults & AI engine options' },
  };

  const current = titles[activeTab] || { title: 'PathFortune Finances', subtitle: 'AI CFO Platform' };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{current.title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{current.subtitle}</p>
      </div>

      <div className="flex items-center space-x-3">
        {/* Date Selector */}
        <div className="hidden sm:flex items-center space-x-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
          <Calendar size={14} className="text-slate-500" />
          <span>Period: Jul 2026 (MoM)</span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>
        )}

        {/* Import Button */}
        <button
          onClick={onNavigateImport}
          className="flex items-center space-x-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs"
        >
          <Upload size={14} className="text-slate-500" />
          <span>Import Data</span>
        </button>

        {/* Ask AI Button */}
        <button
          onClick={onOpenAIChat}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-brand-500/20 active:scale-95"
        >
          <Sparkles size={15} />
          <span>Ask PathFortune AI</span>
        </button>
      </div>
    </header>
  );
};
