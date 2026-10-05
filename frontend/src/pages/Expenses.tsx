import React, { useEffect, useState } from 'react';
import { fetchExpenseAnalytics } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingDown, Building2, ShoppingBag, CreditCard } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';

const COLORS = ['#f43f5e', '#fb7185', '#fda4af', '#e11d48', '#be123c', '#9f1239', '#881337'];

export const Expenses: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchExpenseAnalytics()
      .then(setData)
      .catch((err) => {
        console.error("Failed loading expense analytics", err);
        setError("Couldn't load expense analytics.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return <ErrorState title="Expense data unavailable" message={error} onRetry={loadData} />;
  }

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-400">Loading Expense Analytics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Cumulative Expenses</span>
            <TrendingDown size={18} className="text-rose-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900">{data.formatted_total_expenses}</div>
          <div className="text-xs text-slate-400 mt-1">{data.transaction_count ?? 0} expense transactions</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Avg Monthly Expenditure</span>
            <CreditCard size={18} className="text-amber-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900">{data.formatted_average_monthly}</div>
          <div className={`text-xs font-semibold mt-1 ${(data.expense_growth_pct ?? 0) <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {(data.expense_growth_pct ?? 0) >= 0 ? '+' : ''}{data.expense_growth_pct ?? 0}% MoM
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Largest Cost Category</span>
            <Building2 size={18} className="text-indigo-600" />
          </div>
          <div className="mt-3 text-lg font-bold text-slate-900 truncate">{data.largest_expense_category}</div>
          <div className="text-xs text-indigo-600 font-semibold mt-1">Primary cost driver</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Top Key Vendors</span>
            <ShoppingBag size={18} className="text-slate-700" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900">{data.top_vendors?.length || 0} Vendors</div>
          <div className="text-xs text-slate-400 mt-1">SaaS & infrastructure</div>
        </div>
      </div>

      {/* Expense Trend Bar Chart */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <h3 className="font-bold text-slate-900 text-base mb-1">Monthly Expense Progression</h3>
        <p className="text-xs text-slate-500 mb-4">Historical monthly expenditure trends</p>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
              <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Expenses']} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Breakdown & Top Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">Department Cost Breakdown</h3>
          <div className="space-y-3">
            {data.department_breakdown?.map((dept: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-medium text-xs text-slate-800">{dept.department}</div>
                <div className="font-bold text-xs text-slate-900">{dept.formatted_amount}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">Top Vendor Expenses</h3>
          <div className="space-y-3">
            {data.top_vendors?.map((vend: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-medium text-xs text-slate-800">{vend.vendor}</div>
                <div className="font-bold text-xs text-rose-600">{vend.formatted_amount}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
