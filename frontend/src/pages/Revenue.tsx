import React, { useEffect, useState } from 'react';
import { fetchRevenueAnalytics } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Users, DollarSign, Award } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';

const COLORS = ['#0284c7', '#38bdf8', '#818cf8', '#a78bfa'];

export const Revenue: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchRevenueAnalytics()
      .then(setData)
      .catch((err) => {
        console.error("Failed loading revenue analytics", err);
        setError("Couldn't load revenue analytics.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return <ErrorState title="Revenue data unavailable" message={error} onRetry={loadData} />;
  }

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-400">Loading Revenue Intelligence...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Cumulative Revenue</span>
            <TrendingUp size={18} className="text-brand-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900">{data.formatted_total_revenue}</div>
          <div className="text-xs text-slate-400 mt-1">{data.transaction_count ?? 0} income transactions</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Avg Monthly Revenue</span>
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900">{data.formatted_average_monthly}</div>
          <div className={`text-xs font-semibold mt-1 ${(data.revenue_growth_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {(data.revenue_growth_pct ?? 0) >= 0 ? '+' : ''}{data.revenue_growth_pct ?? 0}% MoM
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Primary Revenue Driver</span>
            <Award size={18} className="text-amber-500" />
          </div>
          <div className="mt-3 text-lg font-bold text-slate-900 truncate">{data.largest_revenue_source}</div>
          <div className="text-xs text-slate-400 mt-1">Largest revenue category</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Top Key Clients</span>
            <Users size={18} className="text-indigo-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900">{data.top_customers?.length || 0} Accounts</div>
          <div className="text-xs text-indigo-600 font-semibold mt-1">Enterprise contracts</div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <h3 className="font-bold text-slate-900 text-base mb-1">Monthly Revenue Progression</h3>
        <p className="text-xs text-slate-500 mb-4">Historical top-line revenue performance</p>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
              <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#0284c7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown & Key Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">Revenue Category Share</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.category_breakdown} cx="50%" cy="50%" outerRadius={80} dataKey="amount" nameKey="category">
                  {data.category_breakdown?.map((_: any, idx: number) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Amount']} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">Top Enterprise Accounts</h3>
          <div className="space-y-3">
            {data.top_customers?.map((cust: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-medium text-xs text-slate-800">{cust.customer}</div>
                <div className="font-bold text-xs text-emerald-600">{cust.formatted_amount}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
