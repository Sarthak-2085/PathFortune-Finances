from sqlalchemy.orm import Session
from app.services.analytics_service import get_monthly_aggregates, format_inr
from app.schemas.financial import ScenarioRequest, ScenarioResponse, MultiMonthScenarioRequest

def simulate_scenario(db: Session, business_id: str, request: ScenarioRequest) -> ScenarioResponse:
    """
    Deterministic mathematical financial scenario simulator ("What If?" Analysis).
    Recalculates Revenue, Expenses, Net Profit, Profit Margin, Cash Flow, and Health Score.
    """
    df = get_monthly_aggregates(db, business_id)
    if df.empty:
        raise ValueError("No transaction data available.")

    latest = df.iloc[-1]
    
    curr_rev = float(latest['revenue'])
    curr_exp = float(latest['expenses'])
    curr_prof = float(latest['net_profit'])
    curr_margin = float(latest['profit_margin'])

    # Category breakdown approximation for targeted expense changes
    from app.models.domain import Transaction
    from sqlalchemy import func
    latest_month = latest['month']

    tx_exp = db.query(Transaction.category, func.sum(Transaction.amount)).filter(
        Transaction.business_id == business_id,
        Transaction.type == 'Expense',
        func.strftime("%Y-%m", Transaction.date) == latest_month
    ).group_by(Transaction.category).all()

    exp_cats = {cat: float(amt) for cat, amt in tx_exp}

    # Apply adjustments
    sim_rev = curr_rev * (1.0 + request.revenue_change_pct / 100.0)

    # Specific category changes
    mkt_orig = exp_cats.get("Marketing", curr_exp * 0.12)
    sal_orig = exp_cats.get("Salaries", curr_exp * 0.50)
    ops_orig = exp_cats.get("Operations", curr_exp * 0.10)

    mkt_new = mkt_orig * (1.0 + request.marketing_change_pct / 100.0)
    sal_new = sal_orig * (1.0 + request.salaries_change_pct / 100.0)
    ops_new = ops_orig * (1.0 + request.operations_change_pct / 100.0)

    delta_cat_exp = (mkt_new - mkt_orig) + (sal_new - sal_orig) + (ops_new - ops_orig)
    
    sim_exp = curr_exp + delta_cat_exp + request.fixed_expense_adj
    sim_exp = max(0.0, sim_exp)

    sim_prof = sim_rev - sim_exp
    sim_margin = (sim_prof / sim_rev * 100.0) if sim_rev > 0 else 0.0

    # Recalculate health score shift
    margin_diff = sim_margin - curr_margin
    prof_diff = sim_prof - curr_prof

    # Simulated Health Score shift estimation
    health_shift = int(round((margin_diff * 0.4) + ((sim_rev - curr_rev) / curr_rev * 20 if curr_rev > 0 else 0)))
    
    current_payload = {
        "revenue": curr_rev,
        "formatted_revenue": format_inr(curr_rev),
        "expenses": curr_exp,
        "formatted_expenses": format_inr(curr_exp),
        "net_profit": curr_prof,
        "formatted_net_profit": format_inr(curr_prof),
        "profit_margin": round(curr_margin, 1)
    }

    simulated_payload = {
        "revenue": round(sim_rev, 2),
        "formatted_revenue": format_inr(sim_rev),
        "expenses": round(sim_exp, 2),
        "formatted_expenses": format_inr(sim_exp),
        "net_profit": round(sim_prof, 2),
        "formatted_net_profit": format_inr(sim_prof),
        "profit_margin": round(sim_margin, 1)
    }

    impact_payload = {
        "revenue_delta": round(sim_rev - curr_rev, 2),
        "formatted_revenue_delta": format_inr(sim_rev - curr_rev),
        "expenses_delta": round(sim_exp - curr_exp, 2),
        "formatted_expenses_delta": format_inr(sim_exp - curr_exp),
        "profit_delta": round(prof_diff, 2),
        "formatted_profit_delta": format_inr(prof_diff),
        "margin_delta": round(margin_diff, 1),
        "health_score_delta": health_shift
    }

    return ScenarioResponse(
        current=current_payload,
        simulated=simulated_payload,
        impact=impact_payload
    )

# ---------------------------------------------------------
# NEW SCENARIO FUNCTIONS
# ---------------------------------------------------------

def get_scenario_presets() -> list:
    return [
        {
            "name": "optimistic",
            "label": "🚀 Optimistic Growth",
            "description": "Revenue grows 20%, marketing up 10%, operations optimized by 10%",
            "icon": "TrendingUp",
            "params": {"revenue_change_pct": 20, "marketing_change_pct": 10, "salaries_change_pct": 5, "operations_change_pct": -10, "fixed_expense_adj": 0}
        },
        {
            "name": "conservative",
            "label": "⚖️ Conservative Hold",
            "description": "Maintain current trajectory with minor cost optimizations",
            "icon": "Shield",
            "params": {"revenue_change_pct": 0, "marketing_change_pct": -5, "salaries_change_pct": 0, "operations_change_pct": -5, "fixed_expense_adj": -5000}
        },
        {
            "name": "pessimistic",
            "label": "📉 Downturn Defense",
            "description": "Revenue drops 15%, aggressive cost cutting across all departments",
            "icon": "TrendingDown",
            "params": {"revenue_change_pct": -15, "marketing_change_pct": -30, "salaries_change_pct": -10, "operations_change_pct": -20, "fixed_expense_adj": -20000}
        }
    ]

def compare_scenarios(db: Session, business_id: str, scenarios: list) -> dict:
    results = []
    for sc in scenarios:
        req = ScenarioRequest(**sc.get("params", {}))
        sim = simulate_scenario(db, business_id, req)
        results.append({
            "name": sc.get("name"),
            "current": sim.current.dict() if hasattr(sim.current, 'dict') else sim.current,
            "simulated": sim.simulated.dict() if hasattr(sim.simulated, 'dict') else sim.simulated,
            "impact": sim.impact.dict() if hasattr(sim.impact, 'dict') else sim.impact
        })
    return {"scenarios": results}

def simulate_multi_month(db: Session, business_id: str, request: MultiMonthScenarioRequest) -> dict:
    df = get_monthly_aggregates(db, business_id)
    if df.empty:
        raise ValueError("No transaction data available.")

    latest = df.iloc[-1]
    
    curr_rev = float(latest['revenue'])
    curr_exp = float(latest['expenses'])

    from app.models.domain import Transaction
    from sqlalchemy import func
    latest_month = latest['month']

    tx_exp = db.query(Transaction.category, func.sum(Transaction.amount)).filter(
        Transaction.business_id == business_id,
        Transaction.type == 'Expense',
        func.strftime("%Y-%m", Transaction.date) == latest_month
    ).group_by(Transaction.category).all()

    exp_cats = {cat: float(amt) for cat, amt in tx_exp}

    mkt_orig = exp_cats.get("Marketing", curr_exp * 0.12)
    sal_orig = exp_cats.get("Salaries", curr_exp * 0.50)
    ops_orig = exp_cats.get("Operations", curr_exp * 0.10)

    # Convert request changes to multipliers
    rev_mult = 1.0 + request.revenue_change_pct / 100.0
    mkt_mult = 1.0 + request.marketing_change_pct / 100.0
    sal_mult = 1.0 + request.salaries_change_pct / 100.0
    ops_mult = 1.0 + request.operations_change_pct / 100.0

    projections = []
    total_rev = 0.0
    total_exp = 0.0
    total_prof = 0.0
    cum_prof = 0.0

    # Start loop
    for m in range(1, request.months + 1):
        # Compound the base values
        # For simplicity, apply the multiplier successively to the base or compound it?
        # The prompt says: "Each subsequent month compounds the changes"
        m_rev = curr_rev * (rev_mult ** m)
        m_mkt = mkt_orig * (mkt_mult ** m)
        m_sal = sal_orig * (sal_mult ** m)
        m_ops = ops_orig * (ops_mult ** m)
        
        # Original expenses had a non-categorized part we should also carry forward or hold constant.
        # Let's hold the rest constant, and add the fixed expense adjustment.
        rest_exp = curr_exp - (mkt_orig + sal_orig + ops_orig)
        m_exp = rest_exp + m_mkt + m_sal + m_ops + request.fixed_expense_adj
        m_exp = max(0.0, m_exp)

        m_prof = m_rev - m_exp
        m_margin = (m_prof / m_rev * 100.0) if m_rev > 0 else 0.0
        
        cum_prof += m_prof
        total_rev += m_rev
        total_exp += m_exp
        total_prof += m_prof

        projections.append({
            "month": m,
            "revenue": round(m_rev, 2),
            "formatted_revenue": format_inr(m_rev),
            "expenses": round(m_exp, 2),
            "formatted_expenses": format_inr(m_exp),
            "net_profit": round(m_prof, 2),
            "formatted_net_profit": format_inr(m_prof),
            "profit_margin": round(m_margin, 1),
            "cumulative_profit": round(cum_prof, 2)
        })

    avg_margin = (total_prof / total_rev * 100.0) if total_rev > 0 else 0.0

    return {
        "months": request.months,
        "projections": projections,
        "cumulative_impact": {
            "total_revenue": round(total_rev, 2),
            "total_expenses": round(total_exp, 2),
            "total_profit": round(total_prof, 2),
            "avg_margin": round(avg_margin, 1)
        },
        "summary": f"{request.months}-month projection based on selected scenario."
    }
