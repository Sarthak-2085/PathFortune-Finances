import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { KPISummary } from '../../types';

interface KPICardProps {
  title: string;
  data: KPISummary;
  icon?: React.ReactNode;
  subtitle?: string;
  isHealthScore?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  data, 
  icon, 
  subtitle = "vs previous month",
  isHealthScore = false
}) => {
  const isPositive = data.change_pct >= 0;
  const isGood = isHealthScore ? data.value >= 75 : (data.direction === 'up' ? isPositive : !isPositive);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {icon && (
          <div className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-100 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
            {icon}
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {data.formatted_value}
        </div>
      </div>

      {/* Footer Comparison */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1 font-semibold">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
            isGood ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
          }`}>
            {isPositive ? <ArrowUpRight size={13} className="mr-0.5" /> : <ArrowDownRight size={13} className="mr-0.5" />}
            {Math.abs(data.change_pct)}%
          </span>
          <span className="text-slate-400 font-normal ml-1">{subtitle}</span>
        </div>

        {/* Mini sparkline indicator dots */}
        {data.trend && data.trend.length > 0 && (
          <div className="flex items-end space-x-0.5 h-4">
            {data.trend.slice(-6).map((val, idx) => {
              const max = Math.max(...data.trend);
              const min = Math.min(...data.trend);
              const h = max === min ? 50 : Math.max(20, ((val - min) / (max - min)) * 100);
              return (
                <div 
                  key={idx} 
                  className={`w-1 rounded-xs transition-all ${
                    idx === data.trend.length - 1 ? (isGood ? 'bg-brand-600' : 'bg-amber-500') : 'bg-slate-200'
                  }`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
