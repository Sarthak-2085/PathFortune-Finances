import React, { useEffect, useState } from 'react';
import { fetchInsights, fetchAnomalies, fetchAlerts, fetchRecommendations } from '../services/api';
import { InsightCard as InsightType, Anomaly, SmartAlert, Recommendation } from '../types';
import { Sparkles, AlertTriangle, ArrowRight, Lightbulb, ShieldAlert, Bell, BellRing, Target, TrendingUp, TrendingDown, DollarSign, Wrench, CheckCircle2, AlertCircle, Info, Shield } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';

export const AIInsights: React.FC = () => {
  const [insights, setInsights] = useState<InsightType[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recTab, setRecTab] = useState<'all' | 'cost_optimization' | 'revenue_growth' | 'risk_mitigation' | 'operational'>('all');

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchInsights(),
      fetchAnomalies(),
      fetchAlerts(),
      fetchRecommendations()
    ]).then(([ins, anom, alrts, recs]) => {
      setInsights(ins);
      setAnomalies(anom);
      
      // Sort alerts by severity
      const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      const sortedAlerts = [...alrts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      setAlerts(sortedAlerts);
      
      setRecommendations(recs);
    }).catch((err) => {
      console.error("Failed loading AI insights", err);
      setError("Couldn't load AI insights, alerts, and recommendations.");
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return <ErrorState title="Insights unavailable" message={error} onRetry={loadData} />;
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Synthesizing Decision Intelligence...</div>;
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  const filteredRecs = recTab === 'all' ? recommendations : recommendations.filter(r => r.category === recTab);

  const getAlertIcon = (severity: string) => {
    if (severity === 'critical') return <BellRing size={16} className="text-rose-600" />;
    if (severity === 'warning') return <AlertTriangle size={16} className="text-amber-600" />;
    return <Info size={16} className="text-blue-600" />;
  };

  const getCategoryIcon = (category: string) => {
    if (category === 'cost_optimization') return <DollarSign size={16} />;
    if (category === 'revenue_growth') return <TrendingUp size={16} />;
    if (category === 'risk_mitigation') return <Shield size={16} />;
    return <Wrench size={16} />;
  };

  return (
    <div className="p-6 space-y-8">
      {/* 1. Smart Alerts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <Bell size={18} className="text-brand-600" />
            <span>Active Smart Alerts</span>
          </h3>
          <div className="flex space-x-2">
            {criticalCount > 0 && <span className="px-2 py-1 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">{criticalCount} Critical</span>}
            {warningCount > 0 && <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">{warningCount} Warnings</span>}
            {infoCount > 0 && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">{infoCount} Info</span>}
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs bg-white border border-slate-200/90 rounded-2xl">
            <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400" />
            <p className="font-semibold text-slate-500">No active alerts.</p>
            <p className="mt-1">Nothing is currently over budget, trending unusually, or flagged by the forecast.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map(alert => (
            <div key={alert.id} className={`p-5 rounded-2xl border relative overflow-hidden transition-all ${
              alert.severity === 'critical' ? 'bg-rose-50 border-rose-200' :
              alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              {alert.severity === 'critical' && (
                <div className="absolute top-4 right-4">
                  <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping absolute opacity-75"></div>
                  <div className="w-2.5 h-2.5 bg-rose-600 rounded-full relative"></div>
                </div>
              )}
              <div className="flex items-center space-x-2 mb-3">
                {getAlertIcon(alert.severity)}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  alert.severity === 'critical' ? 'text-rose-800' :
                  alert.severity === 'warning' ? 'text-amber-800' : 'text-blue-800'
                }`}>
                  {alert.alert_type} Alert
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{alert.title}</h4>
              <p className="text-xs text-slate-600 mt-1 mb-3">{alert.message}</p>
              
              <div className="pt-3 border-t border-slate-200/50">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Recommended Action</div>
                <div className="text-xs font-medium text-slate-800 mt-1">{alert.recommended_action}</div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* 2. AI Recommendations Section */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
          <Target size={18} className="text-brand-600" />
          <span>Strategic AI Recommendations</span>
        </h3>
        
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'all', label: 'All Recommendations' },
            { id: 'cost_optimization', label: 'Cost Optimization' },
            { id: 'revenue_growth', label: 'Revenue Growth' },
            { id: 'risk_mitigation', label: 'Risk Mitigation' },
            { id: 'operational', label: 'Operational' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRecTab(tab.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                recTab === tab.id ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredRecs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs bg-white border border-slate-200/90 rounded-2xl">
            <Target size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-500">
              {recommendations.length === 0 ? 'No recommendations right now.' : 'No recommendations in this category.'}
            </p>
            <p className="mt-1">
              {recommendations.length === 0
                ? 'Your key metrics are within expected ranges - check back as more data comes in.'
                : 'Try a different category tab, or select "All Recommendations".'}
            </p>
          </div>
        ) : (
        <div className="space-y-4">
          {filteredRecs.map(rec => (
            <div key={rec.id} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rec.priority === 'critical' ? 'bg-rose-100 text-rose-800' :
                      rec.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                      rec.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {rec.priority} Priority
                    </span>
                    <span className="flex items-center space-x-1 text-xs font-bold text-slate-500 uppercase">
                      {getCategoryIcon(rec.category)}
                      <span>{rec.category.replace('_', ' ')}</span>
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900">{rec.title}</h4>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{rec.description}</p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-bold text-slate-900 uppercase">Action Plan</div>
                    <ul className="space-y-1.5">
                      {rec.action_items.map((item, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-sm text-slate-700">
                          <CheckCircle2 size={16} className="text-brand-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="md:w-64 shrink-0 bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col justify-center">
                  <div className="text-center mb-4">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estimated Impact</div>
                    <div className="text-xl font-black text-emerald-600">{rec.impact_estimate}</div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                      <span>AI Confidence</span>
                      <span>{rec.confidence}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${rec.confidence}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* 3. Existing Insights & Anomalies Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <Sparkles size={18} className="text-brand-600" />
            <span>Classic Financial Insights</span>
          </h3>

          {insights.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs bg-white border border-slate-200/90 rounded-2xl">
              <Sparkles size={24} className="mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-500">No insights generated yet.</p>
              <p className="mt-1">Insights appear once there's enough transaction history to compare against.</p>
            </div>
          ) : (
          <div className="space-y-4">
            {insights.map((card) => {
              const isHigh = card.severity === 'high';
              return (
                <div key={card.id} className={`p-5 rounded-2xl border ${isHigh ? 'bg-rose-50/50 border-rose-200 shadow-xs' : 'bg-white border-slate-200/90 shadow-xs'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${isHigh ? 'bg-rose-100 text-rose-800' : 'bg-brand-100 text-brand-800'}`}>
                      {card.severity} Priority
                    </span>
                    <span className="text-xs font-bold text-slate-500">{card.metric}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-3">{card.title}</h4>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{card.message}</p>
                  <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-start space-x-2 text-xs font-medium text-slate-800">
                    <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <span><strong>Recommendation:</strong> {card.recommendation}</span>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <ShieldAlert size={18} className="text-rose-600" />
            <span>Detected Spending Anomalies</span>
          </h3>

          {anomalies.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs bg-white border border-slate-200/90 rounded-2xl">
              <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400" />
              <p className="font-semibold text-slate-500">No anomalies detected.</p>
              <p className="mt-1">Your recent transactions are within expected patterns.</p>
            </div>
          ) : (
          <div className="space-y-3">
            {anomalies.map((anom) => (
              <div key={anom.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${anom.severity === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                      {anom.severity}
                    </span>
                    <span className="font-bold text-slate-900 text-xs">{anom.anomaly_type}</span>
                    <span className="text-xs text-slate-400">({anom.date})</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{anom.explanation}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400">Observed vs Expected</div>
                  <div className="text-sm font-bold text-rose-600">
                    ₹{anom.observed_value.toLocaleString('en-IN')} <span className="text-xs text-slate-500 font-normal">vs ₹{anom.expected_value.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
