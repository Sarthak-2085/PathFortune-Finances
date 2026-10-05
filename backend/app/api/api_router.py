from fastapi import APIRouter
from app.api.endpoints import (
    dashboard, transactions, revenue, expenses,
    budgets, forecasts, anomalies, health,
    scenarios, insights, ai, data_import, reports,
    recommendations, alerts
)

api_router = APIRouter()

api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(revenue.router, prefix="/revenue", tags=["Revenue Analytics"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expense Analytics"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["Budgets"])
api_router.include_router(forecasts.router, prefix="/forecast", tags=["ML Forecasting"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Anomaly Detection"])
api_router.include_router(health.router, prefix="/financial-health", tags=["Financial Health"])
api_router.include_router(scenarios.router, prefix="/scenario", tags=["Scenario Simulator"])
api_router.include_router(insights.router, prefix="/insights", tags=["AI Insights"])
api_router.include_router(ai.router, prefix="/ai", tags=["Ask PathFortune AI"])
api_router.include_router(data_import.router, prefix="/import", tags=["Data Import"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Smart Alerts"])

