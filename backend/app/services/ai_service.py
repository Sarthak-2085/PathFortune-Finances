import json
import logging
import os
from datetime import date
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.services.analytics_service import get_dashboard_summary, format_inr
from app.services.health_service import calculate_health_score
from app.services.anomaly_service import detect_anomalies
from app.services.forecasting_service import forecast_all_metrics
from app.services.recommendation_service import generate_recommendations
from app.models.domain import Transaction

logger = logging.getLogger("pathfortune.ai_service")

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_TIMEOUT_SECONDS = 15

# Shared anti-hallucination rules - used by both chat and management summary
# prompts so the grounding contract is identical everywhere Gemini is called.
GROUNDING_RULES = """
GROUNDING RULES (follow strictly):
1. Use ONLY the figures, trends, anomalies, forecasts and recommendations given in
   the FINANCIAL CONTEXT below. Never invent a number, percentage, transaction,
   or metric that is not present in the context.
2. Clearly distinguish ACTUAL historical data from FORECAST/predicted data -
   label forecasted figures as projections, not facts.
3. If the context marks a section as unavailable or insufficient (e.g.
   "forecast not available - insufficient historical data"), say so plainly
   instead of guessing or filling the gap with an invented estimate.
4. Do not perform new financial calculations (growth rates, ratios, totals) -
   use only the values already computed in the context. If something isn't
   computed there, say it isn't available rather than calculating it yourself.
5. Any recommendation you give must be traceable to a specific fact in the
   context (an anomaly, a budget overrun, a trend, a forecast). Do not give
   generic advice unconnected to the supplied data.
6. Do not claim certainty about things the data doesn't support.
"""

RESPONSE_STYLE = """
RESPONSE STYLE:
Where it genuinely helps the answer, structure your response loosely around:
direct answer, key financial facts, explanation of why, relevant risks or
anomalies, and recommended next action. Do not force a section that has
nothing to say - keep the response natural and readable, not a rigid template.
"""


def _category_breakdown(summary) -> dict:
    """Top categories by amount, reusing the already-computed breakdown from
    get_dashboard_summary - no recalculation here."""
    top_exp = sorted(summary.expense_breakdown, key=lambda x: x["amount"], reverse=True)[:5]
    top_rev = sorted(summary.revenue_breakdown, key=lambda x: x["amount"], reverse=True)[:5]
    return {
        "top_expense_categories": [
            {"category": c["category"], "amount": c["formatted_amount"]} for c in top_exp
        ],
        "top_revenue_sources": [
            {"category": c["category"], "amount": c["formatted_amount"]} for c in top_rev
        ]
    }


def _recent_transactions(db: Session, business_id: str, limit: int = 8) -> list:
    """Most recent transactions, for the AI to reference specific recent activity
    without inventing transaction details."""
    rows = (
        db.query(Transaction)
        .filter(Transaction.business_id == business_id)
        .order_by(Transaction.date.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "date": t.date.isoformat() if isinstance(t.date, date) else str(t.date),
            "description": t.description,
            "category": t.category,
            "type": t.type,
            "amount": format_inr(t.amount)
        }
        for t in rows
    ]


def _forecast_section(db: Session, business_id: str) -> dict:
    """Multi-metric forecast via the existing forecasting service. Degrades
    gracefully (not a crash) when there isn't enough history yet."""
    try:
        result = forecast_all_metrics(db, business_id, horizon_months=1)
        metrics = {
            m["metric"]: {
                "current_value": m["formatted_current"],
                "next_month_prediction": m["formatted_prediction"],
                "change_pct": f"{m['change_pct']}%",
                "trend_direction": m["trend_direction"],
                "model_used": m["selected_model"]
            }
            for m in result.get("metrics", [])
        }
        return {"available": True, "metrics": metrics}
    except Exception as e:
        return {
            "available": False,
            "reason": f"Forecast not available - {str(e)}"
        }


def _recommendations_section(db: Session, business_id: str, limit: int = 5) -> list:
    """Reuses the existing recommendation engine - no separate logic here."""
    try:
        recs = generate_recommendations(db, business_id)
        return [
            {
                "title": r["title"],
                "priority": r["priority"],
                "description": r["description"],
                "evidence": r.get("data_evidence"),
                "action_items": r.get("action_items", [])
            }
            for r in recs[:limit]
        ]
    except Exception:
        return []


def build_financial_context(db: Session, business_id: str, scenario_result: Optional[dict] = None) -> dict:
    """
    Analytics/ML results -> structured context.
    Pulls live financial facts from the existing services (dashboard, health,
    anomalies, forecast, recommendations, transactions) and shapes them into
    the grounded payload the LLM (or the deterministic fallback) answers from.
    Every value here comes from an existing service function - nothing is
    calculated in this function or in the LLM layer.

    scenario_result: optional, pre-computed output from scenario_service
    (passed through unchanged, not recalculated here) so the AI can discuss a
    scenario the user already ran via the Scenario Simulator.
    """
    summary = get_dashboard_summary(db, business_id)
    health = calculate_health_score(db, business_id)
    anomalies = detect_anomalies(db, business_id)

    context = {
        "business_name": summary.business_name,
        "period": summary.period,
        "kpis": {
            "total_revenue": summary.total_revenue.formatted_value,
            "revenue_change_pct": f"{summary.total_revenue.change_pct}%",
            "total_expenses": summary.total_expenses.formatted_value,
            "expense_change_pct": f"{summary.total_expenses.change_pct}%",
            "net_profit": summary.net_profit.formatted_value,
            "profit_margin": summary.profit_margin.formatted_value,
            "cash_flow": summary.cash_flow.formatted_value,
            "financial_health_score": f"{health['score']} / 100 ({health['rating']})"
        },
        "health_detail": {
            "score": health["score"],
            "rating": health["rating"],
            "component_scores": health["component_scores"],
            "positive_factors": health["positive_factors"],
            "risk_factors": health["risk_factors"]
        },
        "monthly_trend": summary.monthly_trend[-6:] if summary.monthly_trend else [],
        "category_breakdown": _category_breakdown(summary),
        "budget_status": summary.budget_vs_actual,
        "budget_overruns": [
            f"{b['category']}: spent {b['formatted_spent']} vs budget {b['formatted_allocated']} (+{b['variance_pct']}%)"
            for b in summary.budget_vs_actual if b['status'] == 'Over Budget'
        ],
        "anomalies_detected": [
            {
                "type": a['anomaly_type'],
                "severity": a['severity'],
                "category": a['metric_category'],
                "explanation": a['explanation']
            } for a in anomalies[:5]
        ],
        "forecasts": _forecast_section(db, business_id),
        "recommendations": _recommendations_section(db, business_id),
        "recent_transactions": _recent_transactions(db, business_id)
    }

    # Kept for backward compatibility with the Phase 5.1 fallback engine and
    # tests - single-metric revenue forecast, now sourced from the same
    # multi-metric call above so there's still only one forecasting code path.
    if context["forecasts"]["available"] and "revenue" in context["forecasts"]["metrics"]:
        rev_f = context["forecasts"]["metrics"]["revenue"]
        context["next_month_revenue_forecast"] = {
            "predicted_revenue": rev_f["next_month_prediction"],
            "model_used": rev_f["model_used"],
            "insight": f"Revenue trend: {rev_f['trend_direction']}, {rev_f['change_pct']} change projected."
        }
    else:
        context["next_month_revenue_forecast"] = {
            "predicted_revenue": "Not available",
            "model_used": "N/A",
            "insight": context["forecasts"].get("reason", "Insufficient data for forecasting.")
        }

    if scenario_result:
        context["scenario_result"] = scenario_result

    return context


def _call_gemini(prompt: str) -> Optional[str]:
    """Shared Gemini call used by both chat and management summary. Returns
    None on any failure so callers fall back to their own deterministic
    engine - never raises, never crashes the caller."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            request_options={"timeout": GEMINI_TIMEOUT_SECONDS}
        )
        return response.text
    except Exception as e:
        logger.warning(f"Gemini call failed, using grounded fallback: {e}")
        return None


def query_ai_assistant(
    db: Session,
    business_id: str,
    question: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    scenario_result: Optional[dict] = None
):
    """
    Grounded AI Financial Assistant.
    Structured context -> LLM (Gemini) or deterministic fallback reasoning engine.
    conversation_history (optional): recent prior turns from the client, used
    only to keep Gemini's phrasing consistent across a conversation - not
    persisted server-side, and never used in place of the grounded context.
    """
    context = build_financial_context(db, business_id, scenario_result=scenario_result)

    history_block = ""
    if conversation_history:
        recent = conversation_history[-4:]
        turns = "\n".join(
            f"{'User' if h.get('sender') == 'user' else 'PathFortune AI'}: {h.get('text', '')}"
            for h in recent
        )
        history_block = f"\nRECENT CONVERSATION (for tone/continuity only, not a source of facts):\n{turns}\n"

    prompt = f"""
You are PathFortune AI, a grounded AI CFO assistant. Analytics and ML models
already calculated every fact below - your job is to EXPLAIN those facts to
the user, not to calculate new ones.

FINANCIAL CONTEXT:
{json.dumps(context, indent=2)}
{history_block}
USER QUESTION:
"{question}"
{GROUNDING_RULES}
{RESPONSE_STYLE}
"""
    answer_text = _call_gemini(prompt)
    source = "gemini"
    if answer_text is None:
        answer_text = generate_grounded_fallback_answer(question, context)
        source = "fallback"

    return {
        "answer": answer_text,
        "grounded_context_used": context,
        "source": source
    }


def generate_management_summary(db: Session, business_id: str):
    """
    Part 4 - Management Summary.
    Reuses build_financial_context() (same pipeline as chat) rather than a
    second data path. Covers: current position, major positive/negative
    trend, important anomaly/risk, budget situation, forecast outlook,
    recommended focus - skipping any section the data doesn't support.
    """
    context = build_financial_context(db, business_id)

    prompt = f"""
You are PathFortune AI. Write a concise financial management summary for a
business owner, using ONLY the facts in the context below.

FINANCIAL CONTEXT:
{json.dumps(context, indent=2)}

Cover, only where the context actually has the data:
- Current financial position
- The major positive trend
- The major negative trend
- The most important anomaly or risk
- Budget situation
- Forecast outlook (label clearly as a projection)
- Recommended focus for this month

Skip any section with no supporting data rather than inventing content for it.
Keep it to a few short paragraphs or tight bullets - a CFO skimming this
before a meeting, not a full report.
{GROUNDING_RULES}
"""
    summary_text = _call_gemini(prompt)
    source = "gemini"
    if summary_text is None:
        summary_text = _generate_fallback_summary(context)
        source = "fallback"

    return {
        "summary": summary_text,
        "grounded_context_used": context,
        "source": source
    }


def _generate_fallback_summary(context: dict) -> str:
    """Deterministic management summary when Gemini is unavailable - every
    line maps directly to a context field, nothing invented."""
    kpis = context["kpis"]
    parts = [
        f"**Current Position ({context['period']}):** Revenue {kpis['total_revenue']} "
        f"({kpis['revenue_change_pct']} MoM), Expenses {kpis['total_expenses']} "
        f"({kpis['expense_change_pct']} MoM), Net Profit {kpis['net_profit']} "
        f"(Margin {kpis['profit_margin']})."
    ]

    trend = context.get("monthly_trend", [])
    if len(trend) >= 2:
        is_down = kpis['revenue_change_pct'].startswith('-')
        parts.append(f"**Trend:** {len(trend)} months of data on file, latest month revenue {'down' if is_down else 'up'} vs prior month.")

    if context["anomalies_detected"]:
        top = context["anomalies_detected"][0]
        parts.append(f"**Key Risk/Anomaly:** [{top['severity']}] {top['explanation']}")
    else:
        parts.append("**Key Risk/Anomaly:** No significant anomalies detected this period.")

    if context["budget_overruns"]:
        parts.append(f"**Budget Situation:** Over budget in: {', '.join(context['budget_overruns'])}.")
    else:
        parts.append("**Budget Situation:** All tracked categories within budget.")

    fc = context["forecasts"]
    if fc["available"] and "revenue" in fc["metrics"]:
        rf = fc["metrics"]["revenue"]
        parts.append(
            f"**Forecast Outlook (projection, not actual):** Revenue projected to "
            f"{rf['trend_direction']} to {rf['next_month_prediction']} next month "
            f"({rf['model_used']})."
        )
    else:
        parts.append(f"**Forecast Outlook:** {fc.get('reason', 'Not enough data yet.')}")

    if context["recommendations"]:
        top_rec = context["recommendations"][0]
        parts.append(f"**Recommended Focus:** {top_rec['title']} - {top_rec['description']}")
    else:
        parts.append("**Recommended Focus:** No specific action items flagged this period.")

    return "\n\n".join(parts)


def generate_grounded_fallback_answer(question: str, context: dict) -> str:
    """Grounded fallback financial logic engine when Gemini is unavailable or
    fails. Every branch below only reads from the already-computed context -
    no new calculation happens here, and no answer is pre-written/hardcoded
    independent of the data; each is assembled from whatever the context
    actually contains for this business right now."""
    q = question.lower()
    kpis = context["kpis"]
    anomalies = context["anomalies_detected"]
    budgets = context["budget_overruns"]
    forecast = context["next_month_revenue_forecast"]
    cats = context["category_breakdown"]
    recs = context["recommendations"]
    health = context["health_detail"]

    def fmt_recs(items):
        return "\n".join(f"• **{r['title']}** ({r['priority']}): {r['description']}" for r in items)

    # --- Category / overspending questions ---
    if "costing" in q or "which categor" in q or "biggest expense" in q:
        if cats["top_expense_categories"]:
            lines = "\n".join(f"• {c['category']}: {c['amount']}" for c in cats["top_expense_categories"])
            return f"Your biggest expense categories for {context['period']}:\n\n{lines}\n\n**Note:** Figures are actuals for the latest recorded month."
        return "No expense category data is available yet for this period."

    if "overspend" in q:
        if budgets:
            return f"You are over budget in: {', '.join(budgets)}.\n\n**Recommendation:** Review these categories first - they're the only ones currently exceeding their allocated budget."
        return "No categories are currently over their allocated budget based on the data available."

    # --- Risk questions ---
    if "risk" in q:
        lines = []
        if health["risk_factors"]:
            lines.append("**From Financial Health analysis:**\n" + "\n".join(f"• {r}" for r in health["risk_factors"]))
        if anomalies:
            top_anoms = "\n".join(f"• [{a['severity']}] {a['explanation']}" for a in anomalies[:3])
            lines.append(f"**Detected anomalies:**\n{top_anoms}")
        if not lines:
            return "No significant financial risks were identified in the current data."
        return "\n\n".join(lines)

    # --- Focus / what should I do ---
    if "focus" in q or "what should i" in q:
        if recs:
            return f"Based on current data, here's where to focus:\n\n{fmt_recs(recs[:3])}"
        return "No specific action items are flagged right now - your key metrics are within expected ranges."

    # --- Explain forecast specifically ---
    if "explain" in q and "forecast" in q:
        if context["forecasts"]["available"]:
            return (
                f"**This is a projection, not an actual result.** Based on {forecast['model_used']}, "
                f"next month's revenue is projected at {forecast['predicted_revenue']}.\n\n"
                f"**Model basis:** {forecast['insight']}"
            )
        return f"Forecast is not available yet: {context['forecasts'].get('reason', 'insufficient historical data.')}"

    # --- Summarize performance ---
    if "summariz" in q or "summary" in q:
        return _generate_fallback_summary(context)

    # --- Biggest anomalies ---
    if "biggest anomal" in q or ("anomaly" in q and "biggest" in q):
        if anomalies:
            top = sorted(anomalies, key=lambda a: {"High": 0, "Medium": 1, "Low": 2}.get(a["severity"], 3))[:3]
            lines = "\n".join(f"• **[{a['severity']}] {a['type']}**: {a['explanation']}" for a in top)
            return f"The biggest detected anomalies:\n\n{lines}"
        return "No anomalies have been detected in the current data."

    # --- Profit / decrease / general performance driver questions ---
    if "profit" in q or "decrease" in q:
        ans = (
            f"Based on your latest financial data for {context['period']}, your Total Revenue is {kpis['total_revenue']} "
            f"({kpis['revenue_change_pct']} MoM) with a Net Profit of {kpis['net_profit']} (Profit Margin: {kpis['profit_margin']}).\n\n"
            f"**Key Drivers & Analysis:**\n"
            f"1. **Expense Movement:** Expenses changed by {kpis['expense_change_pct']} reaching {kpis['total_expenses']}.\n"
        )
        if budgets:
            ans += f"2. **Budget Overruns:** Budget limits were exceeded in: {', '.join(budgets)}.\n"
        if anomalies:
            ans += f"3. **Spending Anomalies:** {anomalies[0]['explanation']}\n"
        if recs:
            ans += f"\n**Actionable Recommendation:** {recs[0]['title']} - {recs[0]['description']}"
        return ans

    # --- Expenses increase ---
    if "expense" in q and ("increase" in q or "why" in q):
        ans = f"Expenses changed by {kpis['expense_change_pct']} to reach {kpis['total_expenses']} in {context['period']}.\n\n"
        if cats["top_expense_categories"]:
            ans += "**Top expense categories driving this:**\n" + "\n".join(
                f"• {c['category']}: {c['amount']}" for c in cats["top_expense_categories"][:3]
            ) + "\n\n"
        if anomalies:
            ans += f"**Unusual activity detected:** {anomalies[0]['explanation']}"
        return ans

    # --- Forecast / predict next month ---
    if "forecast" in q or "next month" in q or "predict" in q:
        if context["forecasts"]["available"]:
            return (
                f"According to our forecasting model ({forecast['model_used']}), "
                f"your predicted Revenue for next month is **{forecast['predicted_revenue']}** (projection, not an actual figure).\n\n"
                f"**Model Insight:** {forecast['insight']}"
            )
        return f"Forecast is not available yet: {context['forecasts'].get('reason', 'insufficient historical data.')}"

    # --- Anomalies / unusual ---
    if "anomaly" in q or "unusual" in q or "strange" in q:
        if anomalies:
            anom_list = "\n".join([f"• **[{a['severity']}] {a['type']}**: {a['explanation']}" for a in anomalies])
            return f"PathFortune Anomaly Engine detected the following unusual financial behavior:\n\n{anom_list}\n\n**Actionable Advice:** Audit vendor invoices for these specific categories."
        return "No unusual spending anomalies or unexpected transaction spikes were detected in recent months."

    # --- Health score ---
    if "health" in q or "score" in q:
        comp_lines = "\n".join(f"• {k}: {v}/pts" for k, v in health["component_scores"].items())
        positive = ("**Positive factors:** " + ', '.join(health['positive_factors'])) if health['positive_factors'] else ""
        return (
            f"Your current Financial Health Score is **{kpis['financial_health_score']}**.\n\n"
            f"**Component breakdown:**\n{comp_lines}\n\n"
            f"{positive}"
        )

    # --- Default: general summary ---
    return (
        f"Here is a summary of your financial status for {context['period']}:\n"
        f"• **Revenue:** {kpis['total_revenue']} ({kpis['revenue_change_pct']} MoM)\n"
        f"• **Expenses:** {kpis['total_expenses']} ({kpis['expense_change_pct']} MoM)\n"
        f"• **Net Profit:** {kpis['net_profit']} (Margin: {kpis['profit_margin']})\n"
        f"• **Financial Health Score:** {kpis['financial_health_score']}\n"
        f"• **Next Month Projected Revenue:** {forecast['predicted_revenue']}\n\n"
        f"Ask me about expense categories, overspending, financial risks, your forecast, or specific anomalies!"
    )
