import React, { useState } from 'react';
import { Settings as SettingsIcon, Building, Shield, Cpu, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    business_name: 'PathFortune Tech Solutions Pvt Ltd',
    industry: 'SaaS & Enterprise AI Solutions',
    currency: 'INR (₹)',
    fiscal_year_start: 'April',
    forecast_horizon: 3,
    ai_provider: 'gemini',
    ai_model: 'gemini-1.5-flash'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Business & AI Platform Settings</h3>
            <p className="text-xs text-slate-500">Configure corporate identity, currency, and AI CFO models</p>
          </div>
          {saved && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Settings Saved!
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-3">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Building size={14} className="text-brand-600" />
              <span>Business Profile</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={profile.business_name}
                  onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Industry Sector</label>
                <input
                  type="text"
                  value={profile.industry}
                  onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operating Currency</label>
                <select
                  value={profile.currency}
                  onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="INR (₹)">INR (₹ Indian Rupee)</option>
                  <option value="USD ($)">USD ($ US Dollar)</option>
                  <option value="EUR (€)">EUR (€ Euro)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fiscal Year Start</label>
                <select
                  value={profile.fiscal_year_start}
                  onChange={(e) => setProfile({ ...profile, fiscal_year_start: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="April">April (India Standard)</option>
                  <option value="January">January (Calendar Year)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Cpu size={14} className="text-brand-600" />
              <span>Machine Learning & Generative AI Options</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default Forecast Horizon</label>
                <select
                  value={profile.forecast_horizon}
                  onChange={(e) => setProfile({ ...profile, forecast_horizon: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value={1}>1 Month Ahead</option>
                  <option value={3}>3 Months Ahead</option>
                  <option value={6}>6 Months Ahead</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Generative AI Provider</label>
                <select
                  value={profile.ai_provider}
                  onChange={(e) => setProfile({ ...profile, ai_provider: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="gemini">Google Gemini AI</option>
                  <option value="openai">OpenAI GPT-4o</option>
                  <option value="offline">Offline Rule-based Reasoning</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-xs"
            >
              <Save size={15} />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
