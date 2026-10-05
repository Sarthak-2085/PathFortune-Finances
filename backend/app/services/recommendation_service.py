import uuid
from sqlalchemy.orm import Session
from app.services.analytics_service import get_monthly_aggregates, format_inr
from app.services.anomaly_service import detect_anomalies
from app.services.health_service import calculate_health_score


def generate_recommendations(db: Session, business_id: str) -> list:
    """
    Generates prioritized actionable business recommendations based on multiple 
    data sources including historical trends, anomalies, health score, and forecasts.
    """
    recommendations = []
    
    # 1. Fetch data
    df = get_monthly_aggregates(db, business_id)
    if df.empty:
        return []
    
    health_data = calculate_health_score(db, business_id)
    anomalies = detect_anomalies(db, business_id)

    # Latest month data
    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else None

    # Helper function to add a recommendation
    def add_rec(category, priority, title, description, impact_estimate, confidence, data_evidence, action_items):
        recommendations.append({
            "id": str(uuid.uuid4()),
            "category": category,
            "priority": priority,
            "title": title,
            "description": description,
            "impact_estimate": impact_estimate,
            "confidence": confidence,
            "data_evidence": data_evidence,
            "action_items": action_items
        })

    # --- Cost Optimization Recommendations ---
    if prev is not None:
        exp_growth = (latest['expenses'] - prev['expenses']) / prev['expenses'] if prev['expenses'] > 0 else 0
        rev_growth = (latest['revenue'] - prev['revenue']) / prev['revenue'] if prev['revenue'] > 0 else 0
        
        if exp_growth > 0.20:
            add_rec(
                category="Cost Optimization",
                priority="high",
                title="Rapid Expense Growth Detected",
                description="Your expenses grew by more than 20% compared to last month. Consider reviewing recent expenditures.",
                impact_estimate=f"Save {format_inr(latest['expenses'] * 0.1)}/month",
                confidence=90,
                data_evidence={"expense_growth_pct": round(exp_growth * 100, 1)},
                action_items=["Audit top 3 expense categories", "Renegotiate vendor contracts", "Halt non-essential spending"]
            )
            
        if exp_growth > rev_growth and exp_growth > 0.05:
            add_rec(
                category="Cost Optimization",
                priority="medium",
                title="Expenses Outpacing Revenue",
                description="Your expenses are growing faster than your revenue. This could lead to a margin squeeze.",
                impact_estimate="Protect Profit Margins",
                confidence=85,
                data_evidence={"expense_growth": round(exp_growth * 100, 1), "revenue_growth": round(rev_growth * 100, 1)},
                action_items=["Review pricing strategy", "Implement cost control measures"]
            )

    # --- Revenue Growth Recommendations ---
    if prev is not None:
        if rev_growth > 0.10:
            add_rec(
                category="Revenue Growth",
                priority="medium",
                title="Capitalize on Revenue Momentum",
                description="Revenue is showing strong growth. Identify the top performing channels and scale them.",
                impact_estimate=f"Boost Revenue by {format_inr(latest['revenue'] * 0.05)}",
                confidence=80,
                data_evidence={"revenue_growth_pct": round(rev_growth * 100, 1)},
                action_items=["Increase ad spend on top channels", "Upsell to existing customers"]
            )
        elif rev_growth <= 0:
            add_rec(
                category="Revenue Growth",
                priority="high",
                title="Revenue Stagnation Warning",
                description="Revenue is flat or declining. Consider diversifying income streams or launching new promotions.",
                impact_estimate="Restore Growth Trajectory",
                confidence=75,
                data_evidence={"revenue_growth_pct": round(rev_growth * 100, 1)},
                action_items=["Launch targeted marketing campaign", "Offer limited-time discounts", "Gather customer feedback"]
            )

    # --- Risk Mitigation Recommendations ---
    if anomalies:
        add_rec(
            category="Risk Mitigation",
            priority="critical",
            title="Financial Anomalies Detected",
            description=f"Found {len(anomalies)} unusual transactions or patterns that require immediate review.",
            impact_estimate="Prevent Fraud/Errors",
            confidence=95,
            data_evidence={"anomaly_count": len(anomalies)},
            action_items=["Review flagged transactions in dashboard", "Verify authorization for large expenses"]
        )

    health_score = health_data.get("score", 100)
    if health_score < 70:
        add_rec(
            category="Risk Mitigation",
            priority="critical",
            title="Low Financial Health Score",
            description="Your financial health score is concerningly low. Immediate action is required to stabilize operations.",
            impact_estimate="Business Stabilization",
            confidence=90,
            data_evidence={"health_score": health_score},
            action_items=["Reduce discretionary spending", "Accelerate receivables collection"]
        )

    if latest['profit_margin'] < 10:
        add_rec(
            category="Risk Mitigation",
            priority="high",
            title="Critically Low Profit Margin",
            description="Profit margin is below 10%. A small drop in revenue or increase in costs could result in losses.",
            impact_estimate="Margin Protection",
            confidence=85,
            data_evidence={"current_margin": latest['profit_margin']},
            action_items=["Increase prices", "Cut low-ROI marketing spend"]
        )

    # --- Operational Recommendations (Budget & Cash Flow) ---
    # Since we can't easily query budgets directly without building a complex query,
    # we'll use a heuristic based on available data.
    if latest['net_profit'] < latest['revenue'] * 0.05:
        add_rec(
            category="Operational",
            priority="high",
            title="Tight Cash Flow Optimization",
            description="Net profit is very low relative to revenue, indicating tight cash flow.",
            impact_estimate="Improve Liquidity",
            confidence=80,
            data_evidence={"profit_ratio": round((latest['net_profit']/latest['revenue'])*100, 1) if latest['revenue'] > 0 else 0},
            action_items=["Negotiate longer payment terms with suppliers", "Incentivize early payments from customers"]
        )

    # Add a fallback recommendation if we don't have enough
    if len(recommendations) < 3:
        add_rec(
            category="Operational",
            priority="low",
            title="Review Financial Strategy",
            description="Regularly review your financial goals and budgets to ensure alignment with your business strategy.",
            impact_estimate="Long-term Stability",
            confidence=70,
            data_evidence={"months_analyzed": len(df)},
            action_items=["Schedule quarterly financial review", "Update annual budget"]
        )

    # Priority mapping for sorting
    priority_map = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    
    # Sort recommendations by priority
    recommendations.sort(key=lambda x: priority_map.get(x['priority'], 4))
    
    # Return top 5-8
    return recommendations[:8]
