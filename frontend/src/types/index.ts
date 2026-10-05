export interface KPISummary {
  value: number;
  formatted_value: string;
  change_pct: number;
  previous_value: number;
  direction: 'up' | 'down' | 'flat';
  trend: number[];
}

export interface DashboardSummary {
  business_name: string;
  period: string;
  total_revenue: KPISummary;
  total_expenses: KPISummary;
  net_profit: KPISummary;
  cash_flow: KPISummary;
  profit_margin: KPISummary;
  health_score: KPISummary;
  monthly_trend: Array<{
    month: string;
    revenue: number;
    expenses: number;
    net_profit: number;
    cash_flow: number;
    profit_margin: number;
  }>;
  expense_breakdown: Array<{
    category: string;
    amount: number;
    formatted_amount: string;
  }>;
  revenue_breakdown: Array<{
    category: string;
    amount: number;
    formatted_amount: string;
  }>;
  budget_vs_actual: Array<{
    category: string;
    allocated: number;
    spent: number;
    formatted_allocated: string;
    formatted_spent: string;
    status: 'Over Budget' | 'Within Budget';
    variance_pct: number;
  }>;
}

export interface Transaction {
  id: string;
  business_id: string;
  date: string;
  description: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  payment_method: string;
  department: string;
  vendor_customer?: string;
  status: string;
}

export interface FinancialHealth {
  score: number;
  rating: string;
  component_scores: Record<string, number>;
  positive_factors: string[];
  risk_factors: string[];
}

export interface Anomaly {
  id: string;
  transaction_id?: string;
  date: string;
  anomaly_type: string;
  severity: 'High' | 'Medium' | 'Low';
  metric_category: string;
  observed_value: number;
  expected_value: number;
  percentage_deviation: number;
  explanation: string;
}

export interface ForecastResponse {
  horizon_months: number;
  target_metric: string;
  selected_model: string;
  evaluation_metrics: {
    MAE: number;
    RMSE: number;
    MAPE: number;
  };
  all_model_evaluations: Record<string, { MAE: number; RMSE: number; MAPE: number }>;
  historical_data: Array<{
    month: string;
    actual_value: number;
    formatted_value: string;
    is_forecast: boolean;
  }>;
  forecast_data: Array<{
    month: string;
    predicted_value: number;
    formatted_value: string;
    confidence_lower: number;
    confidence_upper: number;
    is_forecast: boolean;
  }>;
  insights: string;
}

export interface ScenarioResponse {
  current: Record<string, any>;
  simulated: Record<string, any>;
  impact: Record<string, any>;
}

export interface InsightCard {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  metric: string;
  change: number;
  message: string;
  recommendation: string;
}

// =============================================================================
// Phase 3 — Predictive Intelligence Types (Arjun)
// =============================================================================

export interface ForecastCompareMetric {
  metric: string;
  current_value: number;
  formatted_current: string;
  next_month_prediction: number;
  formatted_prediction: string;
  change_pct: number;
  trend_direction: 'accelerating' | 'decelerating' | 'stable';
  selected_model: string;
  mape: number;
  r2: number;
}

export interface ForecastCompareResponse {
  horizon_months: number;
  metrics: ForecastCompareMetric[];
  combined_chart_data: Array<Record<string, any>>;
}

export interface ForecastModelDetail {
  model_name: string;
  metrics: { MAE: number; RMSE: number; MAPE: number; R2: number };
  test_predictions: Array<{ month: string; actual: number; predicted: number }>;
  is_selected: boolean;
}

export interface ForecastModelsResponse {
  target_metric: string;
  horizon_months: number;
  selected_model: string;
  models: ForecastModelDetail[];
}

// =============================================================================
// Phase 4 — Decision Intelligence Types (Arjun)
// =============================================================================

export interface ScenarioPreset {
  name: string;
  label: string;
  description: string;
  icon: string;
  params: {
    revenue_change_pct: number;
    marketing_change_pct: number;
    salaries_change_pct: number;
    operations_change_pct: number;
    fixed_expense_adj: number;
  };
}

export interface ScenarioCompareResult {
  name: string;
  current: Record<string, any>;
  simulated: Record<string, any>;
  impact: Record<string, any>;
}

export interface MultiMonthProjection {
  month: string;
  revenue: number;
  formatted_revenue: string;
  expenses: number;
  formatted_expenses: string;
  net_profit: number;
  formatted_net_profit: string;
  profit_margin: number;
  cumulative_profit: number;
}

export interface MultiMonthScenarioResponse {
  months: number;
  projections: MultiMonthProjection[];
  cumulative_impact: Record<string, any>;
  summary: string;
}

export interface Recommendation {
  id: string;
  category: 'cost_optimization' | 'revenue_growth' | 'risk_mitigation' | 'operational';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact_estimate: string;
  confidence: number;
  data_evidence: Record<string, any>;
  action_items: string[];
}

export interface SmartAlert {
  id: string;
  alert_type: 'threshold' | 'trend' | 'forecast' | 'anomaly';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metric: string;
  current_value?: string;
  threshold_value?: string;
  triggered_at: string;
  recommended_action: string;
  is_acknowledged: boolean;
}

export interface AIChatResponse {
  answer: string;
  grounded_context_used: Record<string, any>;
  source: 'gemini' | 'fallback';
}

export interface ManagementSummaryResponse {
  summary: string;
  grounded_context_used: Record<string, any>;
  source: 'gemini' | 'fallback';
}
