import React, { useEffect, useRef, useState } from 'react';
import { fetchScenarioPresets, runScenario, runScenarioCompare, runMultiMonthScenario } from '../services/api';
import { ScenarioPreset, ScenarioResponse, MultiMonthScenarioResponse } from '../types';
import { Sliders, RefreshCw, TrendingUp, TrendingDown, DollarSign, Shield, Play, BarChart3, ArrowRight } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';

export const ScenarioSimulator: React.FC = () => {
  const [presets, setPresets] = useState<ScenarioPreset[]>([]);
  const [params, setParams] = useState({
    revenue_change_pct: 0,
    marketing_change_pct: 0,
    salaries_change_pct: 0,
    operations_change_pct: 0,
    fixed_expense_adj: 0
  });
  
  const [result, setResult] = useState<ScenarioResponse | null>(null);
  const [multiMonthResult, setMultiMonthResult] = useState<MultiMonthScenarioResponse | null>(null);
  const [compareResult, setCompareResult] = useState<{scenarios: any[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [multiLoading, setMultiLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  // Debounced so dragging a slider doesn't fire an API call on every pixel
  // of movement - only runs ~300ms after the user stops adjusting params.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runCurrentScenario();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [params]);

  const loadPresets = async () => {
    try {
      const data = await fetchScenarioPresets();
      setPresets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const runCurrentScenario = async () => {
    try {
      setLoading(true);
      const res = await runScenario(params);
      setResult(res);
      setMultiMonthResult(null); // reset multi-month when params change
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMultiMonth = async () => {
    try {
      setMultiLoading(true);
      const res = await runMultiMonthScenario({
        months: 6,
        ...params
      });
      setMultiMonthResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setMultiLoading(false);
    }
  };

  const handleComparePresets = async () => {
    if (presets.length === 0) return;
    try {
      setCompareLoading(true);
      const reqPayload = presets.map(p => ({
        name: p.name,
        params: p.params
      }));
      const res = await runScenarioCompare(reqPayload);
      setCompareResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setCompareLoading(false);
    }
  };

  const applyPreset = (preset: ScenarioPreset) => {
    setParams(preset.params);
  };

  const resetSliders = () => {
    setParams({
      revenue_change_pct: 0,
      marketing_change_pct: 0,
      salaries_change_pct: 0,
      operations_change_pct: 0,
      fixed_expense_adj: 0
    });
    setCompareResult(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Preset Quick-Select Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-slate-800 font-bold">
            <Sliders size={18} className="text-brand-600" />
            <span>Scenario Presets</span>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {presets.map(p => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-colors text-xs font-bold text-slate-700 flex items-center space-x-2"
              >
                {p.name === 'Optimistic' && <TrendingUp size={14} className="text-emerald-500" />}
                {p.name === 'Conservative' && <Shield size={14} className="text-blue-500" />}
                {p.name === 'Pessimistic' && <TrendingDown size={14} className="text-rose-500" />}
                <span>{p.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={handleComparePresets}
            disabled={compareLoading || presets.length === 0}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors text-xs font-bold flex items-center space-x-2"
          >
            <BarChart3 size={14} />
            <span>{compareLoading ? 'Running...' : 'Compare All Presets'}</span>
          </button>
        </div>
      </div>

      {compareResult && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 text-base">Preset Scenario Comparison Matrix</h3>
            <button onClick={() => setCompareResult(null)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="py-3 px-4">Preset Scenario</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4 text-right">Expenses</th>
                  <th className="py-3 px-4 text-right">Net Profit</th>
                  <th className="py-3 px-4 text-right">Margin</th>
                  <th className="py-3 px-4 text-right">Health Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compareResult.scenarios.map((scen, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{scen.name}</td>
                    <td className="py-3 px-4 text-right font-medium">{scen.simulated.formatted_revenue}</td>
                    <td className="py-3 px-4 text-right font-medium">{scen.simulated.formatted_expenses}</td>
                    <td className="py-3 px-4 text-right font-bold text-brand-600">{scen.simulated.formatted_net_profit}</td>
                    <td className="py-3 px-4 text-right">{scen.simulated.profit_margin}%</td>
                    <td className={`py-3 px-4 text-right font-bold ${scen.impact.health_score_delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {scen.impact.health_score_delta >= 0 ? '+' : ''}{scen.impact.health_score_delta} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sliders */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base">Simulation Parameters</h3>
            <button
              onClick={resetSliders}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Reset Parameters"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="space-y-6 flex-1">
            {/* Revenue Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Projected Revenue (%)</span>
                <span className={params.revenue_change_pct >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {params.revenue_change_pct > 0 ? '+' : ''}{params.revenue_change_pct}%
                </span>
              </div>
              <input type="range" min="-30" max="50" step="1"
                value={params.revenue_change_pct}
                onChange={(e) => setParams({ ...params, revenue_change_pct: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            {/* Marketing Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Marketing Budget (%)</span>
                <span className={params.marketing_change_pct <= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {params.marketing_change_pct > 0 ? '+' : ''}{params.marketing_change_pct}%
                </span>
              </div>
              <input type="range" min="-50" max="50" step="1"
                value={params.marketing_change_pct}
                onChange={(e) => setParams({ ...params, marketing_change_pct: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            {/* Salaries Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Salaries & Payroll (%)</span>
                <span className={params.salaries_change_pct <= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {params.salaries_change_pct > 0 ? '+' : ''}{params.salaries_change_pct}%
                </span>
              </div>
              <input type="range" min="-20" max="30" step="1"
                value={params.salaries_change_pct}
                onChange={(e) => setParams({ ...params, salaries_change_pct: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            {/* Operations Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Operations Expenditure (%)</span>
                <span className={params.operations_change_pct <= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {params.operations_change_pct > 0 ? '+' : ''}{params.operations_change_pct}%
                </span>
              </div>
              <input type="range" min="-30" max="30" step="1"
                value={params.operations_change_pct}
                onChange={(e) => setParams({ ...params, operations_change_pct: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            {/* Fixed Expenses Adj */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Fixed Expense Adjust (₹)</span>
                <span className={params.fixed_expense_adj <= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {params.fixed_expense_adj > 0 ? '+' : ''}{(params.fixed_expense_adj/1000).toFixed(0)}k
                </span>
              </div>
              <input type="range" min="-500000" max="500000" step="10000"
                value={params.fixed_expense_adj}
                onChange={(e) => setParams({ ...params, fixed_expense_adj: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Comparison Results */}
        <div className="lg:col-span-2 space-y-6">
          {result && (
            <>
              {/* Impact Metric Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Simulated Net Profit</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-2">{result.simulated.formatted_net_profit}</div>
                  <div className={`text-xs font-semibold mt-1 flex items-center ${result.impact.profit_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {result.impact.profit_delta >= 0 ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>}
                    {result.impact.formatted_profit_delta} change
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Simulated Margin</div>
                  <div className="text-2xl font-extrabold text-brand-600 mt-2">{result.simulated.profit_margin.toFixed(1)}%</div>
                  <div className={`text-xs font-semibold mt-1 flex items-center ${result.impact.margin_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {result.impact.margin_delta >= 0 ? '+' : ''}{result.impact.margin_delta.toFixed(1)}% margin delta
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Health Score Impact</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-2">
                    {result.impact.health_score_delta >= 0 ? '+' : ''}{result.impact.health_score_delta} pts
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Multi-factor model score</div>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-900 text-base">Current vs Simulated Scenario Breakdown</h3>
                  <button 
                    onClick={handleRunMultiMonth} 
                    disabled={multiLoading}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-xs font-bold flex items-center space-x-1"
                  >
                    <Play size={12} />
                    <span>{multiLoading ? 'Projecting...' : 'Project Forward (6M)'}</span>
                    <ArrowRight size={12} className="ml-1" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                        <th className="py-3 px-4">Financial Metric</th>
                        <th className="py-3 px-4 text-right">Current Baseline</th>
                        <th className="py-3 px-4 text-right">Simulated Target</th>
                        <th className="py-3 px-4 text-right">Net Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-3 px-4 font-semibold text-slate-900">Total Revenue</td>
                        <td className="py-3 px-4 text-right">{result.current.formatted_revenue}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{result.simulated.formatted_revenue}</td>
                        <td className={`py-3 px-4 text-right font-bold ${result.impact.revenue_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {result.impact.formatted_revenue_delta}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-slate-900">Total Expenses</td>
                        <td className="py-3 px-4 text-right">{result.current.formatted_expenses}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{result.simulated.formatted_expenses}</td>
                        <td className={`py-3 px-4 text-right font-bold ${result.impact.expenses_delta <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {result.impact.formatted_expenses_delta}
                        </td>
                      </tr>
                      <tr className="bg-slate-50/50 font-bold">
                        <td className="py-3.5 px-4 text-slate-900">Net Profit</td>
                        <td className="py-3.5 px-4 text-right">{result.current.formatted_net_profit}</td>
                        <td className="py-3.5 px-4 text-right text-brand-700">{result.simulated.formatted_net_profit}</td>
                        <td className={`py-3.5 px-4 text-right ${result.impact.profit_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {result.impact.formatted_profit_delta}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Multi-Month Projection Section */}
              {multiMonthResult && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="font-bold text-slate-900 text-base mb-1">Multi-Month Projection</h3>
                  <p className="text-xs text-slate-500 mb-6">{multiMonthResult.summary}</p>
                  
                  <div className="h-64 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={multiMonthResult.projections} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e11d48" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
                        <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                        <Area type="monotone" dataKey="revenue" name="Projected Revenue" stroke="#0284c7" fillOpacity={1} fill="url(#colorRev)" />
                        <Area type="monotone" dataKey="expenses" name="Projected Expenses" stroke="#e11d48" fillOpacity={1} fill="url(#colorExp)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-center">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Cumulative Impact (6 Months)</div>
                      <div className="text-lg font-black text-slate-900">{multiMonthResult.cumulative_impact.formatted_profit} Total Net Profit</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${multiMonthResult.cumulative_impact.profit_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {multiMonthResult.cumulative_impact.profit_delta >= 0 ? '+' : ''}{multiMonthResult.cumulative_impact.formatted_profit_delta} vs Baseline
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
