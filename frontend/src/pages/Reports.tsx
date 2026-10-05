import React, { useEffect, useState } from 'react';
import { fetchMonthlyReport } from '../services/api';
import { FileText, Download, Printer, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';

export const Reports: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = () => {
    setLoading(true);
    setError(null);
    fetchMonthlyReport()
      .then(setReport)
      .catch((err) => {
        console.error("Failed loading monthly report", err);
        setError("Couldn't compile the monthly report.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReport();
  }, []);

  if (error) {
    return <ErrorState title="Report unavailable" message={error} onRetry={loadReport} />;
  }

  if (loading || !report) {
    return <div className="p-8 text-center text-slate-400">Compiling Monthly Management Report...</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  // CSV export of the same report data already in state - no new dependency,
  // no backend change, no new data fetched.
  const handleDownloadCsv = () => {
    const rows: string[][] = [
      ['PathFortune Finances - Monthly Report', report.period],
      [],
      ['KPI', 'Value'],
      ['Total Revenue', report.kpis.total_revenue],
      ['Revenue Change', report.kpis.revenue_change],
      ['Total Expenses', report.kpis.total_expenses],
      ['Expense Change', report.kpis.expense_change],
      ['Net Profit', report.kpis.net_profit],
      ['Profit Margin', report.kpis.profit_margin],
      ['Cash Flow', report.kpis.cash_flow],
      ['Financial Health Score', report.kpis.health_score],
      [],
      ['Budget Category', 'Allocated', 'Spent', 'Status']
    ];
    (report.budget_vs_actual || []).forEach((b: any) => {
      rows.push([b.category, b.formatted_allocated, b.formatted_spent, b.status]);
    });
    rows.push([]);
    rows.push(['Detected Anomaly', 'Severity', 'Explanation']);
    (report.detected_anomalies || []).forEach((a: any) => {
      rows.push([a.anomaly_type, a.severity, a.explanation]);
    });

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pathfortune-report-${report.period?.replace(/\s+/g, '-') || 'export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header Actions */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between shadow-xs print:hidden">
        <div>
          <h3 className="font-bold text-slate-900 text-base">{report.report_title}</h3>
          <p className="text-xs text-slate-500">Generated for business leadership and stakeholders</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            <Download size={15} />
            <span>Download CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            <Download size={15} />
            <span>Export as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm space-y-6 max-w-4xl mx-auto print:shadow-none print:border-none">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6 flex items-start justify-between">
          <div>
            <div className="text-xs font-bold text-brand-600 uppercase tracking-widest">PATHFORTUNE FINANCES AI</div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">{report.business_name}</h1>
            <p className="text-xs text-slate-500 mt-1">Executive Financial Management Report — {report.period}</p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Generated: {new Date().toLocaleDateString()}</div>
            <div>Confidential Business Document</div>
          </div>
        </div>

        {/* 1. Executive Summary */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-brand-700">1. Executive Summary</h3>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
            {report.executive_summary}
          </p>
        </div>

        {/* 2. Key Financial KPIs Grid */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-brand-700">2. Core Key Performance Indicators</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-slate-500 font-semibold">Revenue</div>
              <div className="text-base font-bold text-slate-900 mt-1">{report.kpis.total_revenue}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-slate-500 font-semibold">Expenses</div>
              <div className="text-base font-bold text-slate-900 mt-1">{report.kpis.total_expenses}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-slate-500 font-semibold">Net Profit</div>
              <div className="text-base font-bold text-emerald-600 mt-1">{report.kpis.net_profit}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-slate-500 font-semibold">Health Score</div>
              <div className="text-base font-bold text-brand-600 mt-1">{report.kpis.health_score}</div>
            </div>
          </div>
        </div>

        {/* 3. Budget & Anomaly Summary */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-brand-700">3. Spending Anomalies & Risk Analysis</h3>
          <div className="space-y-2 text-xs">
            {report.detected_anomalies?.map((anom: any) => (
              <div key={anom.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-rose-900">
                <strong>[{anom.severity}] {anom.anomaly_type}:</strong> {anom.explanation}
              </div>
            ))}
          </div>
        </div>

        {/* 4. Next Month Forecast */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-brand-700">4. Time-Series Predictive Projection</h3>
          <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-100 text-xs text-slate-800">
            Next month revenue is predicted at <strong>{report.next_month_forecast?.formatted_value}</strong> based on recent historical trends.
          </div>
        </div>

        {/* 5. Budget vs Actual */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-brand-700">5. Budget vs Actual</h3>
          {(!report.budget_vs_actual || report.budget_vs_actual.length === 0) ? (
            <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100">No budgets set for this period.</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-semibold">Category</th>
                  <th className="py-2 font-semibold text-right">Allocated</th>
                  <th className="py-2 font-semibold text-right">Spent</th>
                  <th className="py-2 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.budget_vs_actual.map((b: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium text-slate-800">{b.category}</td>
                    <td className="py-2 text-right">{b.formatted_allocated}</td>
                    <td className="py-2 text-right">{b.formatted_spent}</td>
                    <td className={`py-2 text-right font-semibold ${b.status === 'Over Budget' ? 'text-rose-600' : 'text-emerald-600'}`}>{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 6. Recommended Actions */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-brand-700">6. Recommended Actions</h3>
          {(!report.recommended_actions || report.recommended_actions.length === 0) ? (
            <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100">No specific risk factors flagged this period.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-slate-700">
              {report.recommended_actions.map((action: string, idx: number) => (
                <li key={idx} className="flex items-start space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <ShieldAlert size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
