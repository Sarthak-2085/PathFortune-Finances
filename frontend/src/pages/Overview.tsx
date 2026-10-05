import React, { useEffect, useState } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Activity, 
  Sparkles, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { fetchDashboardSummary, fetchAnomalies } from '../services/api';
import { DashboardSummary, Anomaly } from '../types';
import { KPICard } from '../components/common/KPICard';
import { ErrorState } from '../components/common/ErrorState';

interface OverviewProps {
  onNavigateTab: (tab: string) => void;
}

const COLORS = ['#0284c7', '#38bdf8', '#818cf8', '#a78bfa', '#f43f5e', '#fb7185', '#94a3b8'];

export const Overview: React.FC<OverviewProps> = ({ onNavigateTab }) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sum, anoms] = await Promise.all([
        fetchDashboardSummary(),
        fetchAnomalies()
      ]);
      setData(sum);
      setAnomalies(anoms);
    } catch (err) {
      console.error("Failed loading dashboard data", err);
      setError("Couldn't load your financial overview.");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <ErrorState title="Dashboard unavailable" message={error} onRetry={loadData} />;
  }

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-80 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner Alert if High Severity Anomaly detected */}
      {anomalies.some(a => a.severity === 'High') && (
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">High Priority Financial Anomaly Detected</h4>
              <p className="text-xs text-rose-700 mt-0.5">{anomalies.find(a => a.severity === 'High')?.explanation}</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigateTab('insights')}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center space-x-1 shrink-0"
          >
            <span>Review Anomaly</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Revenue" data={data.total_revenue} icon={<TrendingUp size={18} />} />
        <KPICard title="Total Expenses" data={data.total_expenses} icon={<TrendingDown size={18} />} />
        <KPICard title="Net Profit" data={data.net_profit} icon={<DollarSign size={18} />} />
        <KPICard title="Cash Flow" data={data.cash_flow} icon={<Activity size={18} />} />
        <KPICard title="Profit Margin" data={data.profit_margin} icon={<Sparkles size={18} />} />
        <KPICard title="Financial Health" data={data.health_score} icon={<ShieldCheck size={18} />} isHealthScore={true} />
      </div>

      {/* Main Revenue vs Expenses Chart */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Revenue vs Expenses Trend</h3>
            <p className="text-xs text-slate-500">Historical performance aggregated from database records</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="flex items-center text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200/50">
              <span className="w-2 h-2 rounded-full bg-brand-600 mr-1.5"></span> Revenue
            </span>
            <span className="flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/50">
              <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span> Expenses
            </span>
          </div>
        </div>

        <div className="h-80 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthly_trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
              <Tooltip 
                formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
              <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid Section: Expense Pie Chart & Budget vs Actual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Expense Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Expense Category Distribution</h3>
            <p className="text-xs text-slate-500">Current month expenditure breakdown</p>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.expense_breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="amount"
                  nameKey="category"
                >
                  {data.expense_breakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget vs Actual Performance */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Budget vs Actual Utilization</h3>
              <p className="text-xs text-slate-500">Departmental target variance</p>
            </div>
            <button 
              onClick={() => onNavigateTab('budgets')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
            >
              <span>Manage Budgets</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            {data.budget_vs_actual.slice(0, 5).map((item, idx) => {
              const pct = Math.min(100, Math.round((item.spent / item.allocated) * 100));
              const isOver = item.status === 'Over Budget';
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{item.category}</span>
                    <span className={isOver ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                      {item.formatted_spent} / {item.formatted_allocated} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : 'bg-brand-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
