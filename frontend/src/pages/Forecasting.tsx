import React, { useEffect, useState } from 'react';
import { fetchForecast, fetchForecastModels, fetchForecastCompare } from '../services/api';
import { ForecastResponse, ForecastModelsResponse, ForecastCompareResponse } from '../types';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LineChart as ChartIcon, Cpu, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';

export const Forecasting: React.FC = () => {
  const [view, setView] = useState<'single' | 'all'>('single');
  const [metric, setMetric] = useState<'revenue' | 'expenses' | 'net_profit' | 'cash_flow'>('revenue');
  const [horizon, setHorizon] = useState<number>(3);
  
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [modelsData, setModelsData] = useState<ForecastModelsResponse | null>(null);
  const [compareData, setCompareData] = useState<ForecastCompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [metric, horizon, view]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (view === 'single') {
        const [forecastRes, modelsRes, compRes] = await Promise.all([
          fetchForecast(metric, horizon),
          fetchForecastModels(metric, horizon),
          fetchForecastCompare(horizon)
        ]);
        setData(forecastRes);
        setModelsData(modelsRes);
        setCompareData(compRes);
      } else {
        const compRes = await fetchForecastCompare(horizon);
        setCompareData(compRes);
      }
    } catch (err) {
      console.error("Forecast error", err);
      setError("Couldn't generate a forecast - this usually means there isn't enough historical data yet (at least 6 months is needed).");
    } finally {
      setLoading(false);
    }
  };

  const getMetricColor = (m: string) => {
    switch(m) {
      case 'revenue': return '#0284c7';
      case 'expenses': return '#e11d48';
      case 'net_profit': return '#059669';
      case 'cash_flow': return '#7c3aed';
      default: return '#0284c7';
    }
  };

  const renderTrendIcon = (direction: string) => {
    if (direction === 'accelerating') return <TrendingUp size={16} className="text-emerald-500" />;
    if (direction === 'decelerating') return <TrendingDown size={16} className="text-rose-500" />;
    return <Minus size={16} className="text-slate-500" />;
  };

  if (error) {
    return <ErrorState title="Forecast unavailable" message={error} onRetry={loadData} />;
  }

  if (loading || (!data && view === 'single') || (!compareData && view === 'all')) {
    return <div className="p-8 text-center text-slate-400">Loading AI Forecasts...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top View Toggle & Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setView('single')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              view === 'single' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ChartIcon size={16} /> Single Metric
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              view === 'all' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 size={16} /> All Metrics Overview
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {view === 'single' && (
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-700">Metric:</label>
              <select
                value={metric}
                onChange={(e: any) => setMetric(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="revenue">Revenue</option>
                <option value="expenses">Expenses</option>
                <option value="net_profit">Net Profit</option>
                <option value="cash_flow">Cash Flow</option>
              </select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-700">Horizon:</label>
            <div className="flex space-x-1">
              {[1, 3, 6].map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    horizon === h ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {h}M
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {view === 'single' && data && modelsData && compareData && (
        <>
          {/* Single Metric View */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-2 text-brand-400 text-xs font-bold uppercase tracking-wider">
                <Cpu size={16} />
                <span>Optimal ML Model Selected</span>
              </div>
              <h2 className="text-2xl font-black mt-1 tracking-tight">{data.selected_model}</h2>
              <div className="flex items-center mt-3 space-x-3">
                <span className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded text-xs">
                  {renderTrendIcon(compareData.metrics.find(m => m.metric === metric)?.trend_direction || '')}
                  <span className="capitalize text-slate-300">{compareData.metrics.find(m => m.metric === metric)?.trend_direction} Trend</span>
                </span>
              </div>
            </div>

            {/* Evaluation Metrics Cards */}
            <div className="flex items-center space-x-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 shrink-0">
              <div className="text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">R² Score</div>
                <div className="text-lg font-bold text-emerald-400">
                  {modelsData.models.find(m => m.model_name === data.selected_model)?.metrics.R2.toFixed(3) || 'N/A'}
                </div>
              </div>
              <div className="w-px h-8 bg-slate-700"></div>
              <div className="text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">MAPE</div>
                <div className="text-base font-bold text-slate-200">{data.evaluation_metrics.MAPE}%</div>
              </div>
              <div className="w-px h-8 bg-slate-700"></div>
              <div className="text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">MAE</div>
                <div className="text-base font-bold text-slate-200">₹{(data.evaluation_metrics.MAE/1000).toFixed(1)}k</div>
              </div>
            </div>
          </div>

          {/* Main Forecast Chart */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Confidence Interval Forecast</h3>
                <p className="text-xs text-slate-500">Historical actuals vs ML predictions with confidence bounds</p>
              </div>
            </div>

            <div className="h-80 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={[
                    ...data.historical_data.map(h => ({
                      month: h.month,
                      actual: h.actual_value,
                      forecast: null,
                      confidence: null
                    })),
                    ...data.forecast_data.map(f => ({
                      month: f.month,
                      actual: null,
                      forecast: f.predicted_value,
                      confidence: [f.confidence_lower, f.confidence_upper]
                    }))
                  ]} 
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={getMetricColor(metric)} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={getMetricColor(metric)} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
                  <Tooltip formatter={(v: any) => v && typeof v !== 'object' ? [`₹${Number(v).toLocaleString('en-IN')}`, ''] : ['-', '']} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  
                  <Area type="monotone" dataKey="confidence" stroke="none" fill="url(#colorConfidence)" name="Confidence Interval" />
                  <Line type="monotone" dataKey="actual" stroke={getMetricColor(metric)} strokeWidth={3} dot={{ r: 4 }} name="Historical Actual" connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" stroke={getMetricColor(metric)} strokeWidth={3} strokeDasharray="6 6" dot={{ r: 5, fill: getMetricColor(metric) }} name="ML Forecast Prediction" connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Model Comparison Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">Walk-Forward Model Benchmark</h3>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="py-3 px-4">Algorithm</th>
                    <th className="py-3 px-4 text-right">R² Score</th>
                    <th className="py-3 px-4 text-right">MAPE (%)</th>
                    <th className="py-3 px-4 text-right">MAE</th>
                    <th className="py-3 px-4 text-right">RMSE</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {modelsData.models.map((model) => {
                    const isBest = model.is_selected;
                    return (
                      <tr key={model.model_name} className={isBest ? 'bg-brand-50/50 font-semibold' : ''}>
                        <td className="py-3 px-4 text-slate-900">{model.model_name}</td>
                        <td className="py-3 px-4 text-right text-brand-600 font-bold">{model.metrics.R2.toFixed(3)}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{model.metrics.MAPE}%</td>
                        <td className="py-3 px-4 text-right">₹{model.metrics.MAE.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right">₹{model.metrics.RMSE.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-center">
                          {isBest ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 size={12} className="mr-1" /> Best Model
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Evaluated</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'all' && compareData && (
        <>
          {/* All Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {compareData.metrics.map(m => (
              <div key={m.metric} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.metric.replace('_', ' ')}</div>
                  {renderTrendIcon(m.trend_direction)}
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900">{m.formatted_current} <span className="text-[10px] text-slate-400 font-normal">current</span></div>
                  <div className="text-sm font-bold text-brand-600 mt-1">{m.formatted_prediction} <span className="text-[10px] text-slate-400 font-normal">forecasted</span></div>
                </div>
                <div className="mt-3 text-xs flex items-center justify-between">
                  <span className={`font-bold ${m.change_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {m.change_pct >= 0 ? '+' : ''}{m.change_pct.toFixed(1)}%
                  </span>
                  <span className="text-slate-400">R²: {m.r2.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Combined Chart */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Combined Multi-Metric Forecast</h3>
                <p className="text-xs text-slate-500">Comparing actuals and forecasted trends across all metrics</p>
              </div>
            </div>
            <div className="h-96 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compareData.combined_chart_data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
                  <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  
                  <Line type="monotone" dataKey="revenue" stroke={getMetricColor('revenue')} strokeWidth={2} dot={{r:3}} name="Revenue" />
                  <Line type="monotone" dataKey="expenses" stroke={getMetricColor('expenses')} strokeWidth={2} dot={{r:3}} name="Expenses" />
                  <Line type="monotone" dataKey="net_profit" stroke={getMetricColor('net_profit')} strokeWidth={2} dot={{r:3}} name="Net Profit" />
                  <Line type="monotone" dataKey="cash_flow" stroke={getMetricColor('cash_flow')} strokeWidth={2} dot={{r:3}} name="Cash Flow" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
