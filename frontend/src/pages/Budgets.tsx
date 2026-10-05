import React, { useEffect, useState } from 'react';
import { fetchBudgets } from '../services/api';
import { PieChart, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';

export const Budgets: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchBudgets()
      .then(setData)
      .catch((err) => {
        console.error("Failed loading budgets", err);
        setError("Couldn't load budget data.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return <ErrorState title="Budgets unavailable" message={error} onRetry={loadData} />;
  }

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-400">Loading Budget Management...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Allocated Budget</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{data.formatted_total_allocated}</div>
          <div className="text-xs text-slate-400 mt-1">Period: {data.month}</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Actual Expenditure</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{data.formatted_total_spent}</div>
          <div className="text-xs text-slate-400 mt-1">Total spent across categories</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Overall Utilization</div>
          <div className="text-2xl font-extrabold text-brand-600 mt-2">
            {Math.round(data.overall_utilization_pct ?? 0)}%
          </div>
          <div className="text-xs text-brand-600 font-semibold mt-1">Budget adherence</div>
        </div>
      </div>

      {/* Category Budget Progress Grid */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <h3 className="font-bold text-slate-900 text-base">Monthly Category Budgets vs Actual Spend</h3>

        {(!data.budgets || data.budgets.length === 0) ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            <PieChart size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-500">No budgets set for this period yet.</p>
            <p className="mt-1">Set a monthly category budget to start tracking spend against targets.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.budgets?.map((b: any) => {
            const isOver = b.status === 'Over Budget';
            return (
              <div key={b.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">{b.category}</div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    isOver ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {isOver ? <AlertTriangle size={12} className="mr-1" /> : <CheckCircle2 size={12} className="mr-1" />}
                    {b.status}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>Spent: <strong className="text-slate-900">{b.formatted_spent}</strong></span>
                  <span>Allocated: <strong>{b.formatted_allocated}</strong></span>
                </div>

                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : 'bg-brand-600'}`}
                    style={{ width: `${Math.min(100, b.utilization_pct)}%` }}
                  />
                </div>

                <div className="text-[11px] text-slate-500 text-right">
                  Utilization: <strong className={isOver ? 'text-rose-600' : 'text-slate-800'}>{b.utilization_pct}%</strong>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};
