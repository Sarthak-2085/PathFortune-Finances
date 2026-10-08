import axios from 'axios';
import type { 
  DashboardSummary, Transaction, FinancialHealth, 
  Anomaly, ForecastResponse, ScenarioResponse, InsightCard,
  ForecastCompareResponse, ForecastModelsResponse,
  ScenarioPreset, MultiMonthScenarioResponse,
  Recommendation, SmartAlert
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await api.get('/dashboard/summary');
  return res.data;
};

export const fetchTransactions = async (params?: {
  type?: string;
  category?: string;
  search?: string;
}): Promise<Transaction[]> => {
  const res = await api.get('/transactions', { params });
  return res.data;
};

export const createTransaction = async (txData: Partial<Transaction>): Promise<Transaction> => {
  const res = await api.post('/transactions', txData);
  return res.data;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await api.delete(`/transactions/${id}`);
};

export const fetchRevenueAnalytics = async () => {
  const res = await api.get('/revenue/analytics');
  return res.data;
};

export const fetchExpenseAnalytics = async () => {
  const res = await api.get('/expenses/analytics');
  return res.data;
};

export const previewImportFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  // Use plain axios (not the `api` instance) for this call only: `api` forces
  // a default 'Content-Type: application/json' header on every request,
  // which overrides axios's normal FormData auto-detection and prevents the
  // browser from generating the multipart boundary the backend needs to
  // parse the file. Plain axios has no such override, so the boundary is
  // set correctly.
  const res = await axios.post(`${API_BASE_URL}/import/preview`, formData);
  return res.data;
};

export const processImportFile = async (file: File, columnMapping: Record<string, string>) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('column_mapping', JSON.stringify(columnMapping));
  const res = await axios.post(`${API_BASE_URL}/import/process`, formData);
  return res.data;
};

export const fetchBudgets = async (month?: string) => {
  const res = await api.get('/budgets', { params: { month } });
  return res.data;
};

export const fetchForecast = async (metric: string = 'revenue', horizon: number = 3): Promise<ForecastResponse> => {
  const res = await api.get('/forecast', { params: { metric, horizon } });
  return res.data;
};

export const fetchAnomalies = async (): Promise<Anomaly[]> => {
  const res = await api.get('/anomalies');
  return res.data;
};

export const fetchFinancialHealth = async (): Promise<FinancialHealth> => {
  const res = await api.get('/financial-health');
  return res.data;
};

export const runScenario = async (params: {
  revenue_change_pct: number;
  marketing_change_pct: number;
  salaries_change_pct: number;
  operations_change_pct: number;
  fixed_expense_adj: number;
}): Promise<ScenarioResponse> => {
  const res = await api.post('/scenario', params);
  return res.data;
};

export const fetchInsights = async (): Promise<InsightCard[]> => {
  const res = await api.get('/insights');
  return res.data;
};

export const askAIChat = async (
  question: string,
  conversationHistory?: { sender: string; text: string }[],
  scenarioResult?: Record<string, any>
) => {
  const res = await api.post('/ai/chat', {
    question,
    conversation_history: conversationHistory,
    scenario_result: scenarioResult
  });
  return res.data;
};

export const fetchManagementSummary = async () => {
  const res = await api.get('/ai/summary');
  return res.data;
};

export const fetchMonthlyReport = async () => {
  const res = await api.get('/reports/monthly');
  return res.data;
};

// =============================================================================
// Phase 3 — Forecast Comparison & Model Detail APIs (Arjun)
// =============================================================================

export const fetchForecastCompare = async (horizon: number = 3): Promise<ForecastCompareResponse> => {
  const res = await api.get('/forecast/compare', { params: { horizon } });
  return res.data;
};

export const fetchForecastModels = async (metric: string = 'revenue', horizon: number = 3): Promise<ForecastModelsResponse> => {
  const res = await api.get('/forecast/models', { params: { metric, horizon } });
  return res.data;
};

// =============================================================================
// Phase 4 — Scenario Presets, Compare, Multi-Month APIs (Arjun)
// =============================================================================

export const fetchScenarioPresets = async (): Promise<ScenarioPreset[]> => {
  const res = await api.get('/scenario/presets');
  return res.data;
};

export const runScenarioCompare = async (scenarios: Array<{ name: string; params: any }>): Promise<{ scenarios: any[] }> => {
  const res = await api.post('/scenario/compare', { scenarios });
  return res.data;
};

export const runMultiMonthScenario = async (params: {
  months: number;
  revenue_change_pct: number;
  marketing_change_pct: number;
  salaries_change_pct: number;
  operations_change_pct: number;
  fixed_expense_adj: number;
}): Promise<MultiMonthScenarioResponse> => {
  const res = await api.post('/scenario/multi-month', params);
  return res.data;
};

// =============================================================================
// Phase 4 — Recommendations & Smart Alerts APIs (Arjun)
// =============================================================================

export const fetchRecommendations = async (): Promise<Recommendation[]> => {
  const res = await api.get('/recommendations');
  return res.data;
};

export const fetchAlerts = async (): Promise<SmartAlert[]> => {
  const res = await api.get('/alerts');
  return res.data;
};

export default api;
