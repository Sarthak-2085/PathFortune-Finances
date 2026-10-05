import React, { useEffect, useState } from 'react';
import { fetchFinancialHealth } from '../services/api';
import { FinancialHealth as HealthType } from '../types';
import { ShieldCheck, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';

export const FinancialHealth: React.FC = () => {
  const [data, setData] = useState<HealthType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchFinancialHealth()
      .then(setData)
      .catch((err) => {
        console.error("Failed loading financial health", err);
        setError("Couldn't compute your financial health score.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return <ErrorState title="Financial health unavailable" message={error} onRetry={loadData} />;
  }

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-400">Computing Multi-Factor Financial Health Score...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top Health Gauge Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center space-x-6">
          {/* Radial Score Meter */}
          <div className="relative w-32 h-32 flex items-center justify-center rounded-full bg-slate-50 border-4 border-brand-500 shadow-inner">
            <div className="text-center">
              <div className="text-4xl font-black text-slate-900">{data.score}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">/ 100</div>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
              <ShieldCheck size={14} className="mr-1.5" />
              Rating: {data.rating}
            </div>
            <h2 className="text-xl font-bold text-slate-900">Financial Health Index</h2>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              Calculated using transparent 6-factor weightings for viva presentation explainability.
            </p>
          </div>
        </div>

        {/* Positive & Risk Drivers */}
        <div className="space-y-2 w-full max-w-md">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Key Positive Factors</h4>
          {data.positive_factors.map((p, i) => (
            <div key={i} className="text-xs text-emerald-700 font-medium flex items-start space-x-2 bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              <span>{p}</span>
            </div>
          ))}

          {data.risk_factors.length > 0 && (
            <>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider pt-2">Risk Factors & Areas for Improvement</h4>
              {data.risk_factors.map((r, i) => (
                <div key={i} className="text-xs text-amber-700 font-medium flex items-start space-x-2 bg-amber-50/60 p-2 rounded-xl border border-amber-100">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{r}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Component Scores Breakdown */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Multi-Factor Weight Breakdown</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data.component_scores).map(([factor, score]) => (
            <div key={factor} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                <span>{factor}</span>
                <span className="text-brand-600 font-bold">{score} pts</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-600 rounded-full transition-all"
                  style={{ width: `${(score / 25) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
