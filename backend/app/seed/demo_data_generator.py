import random
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from app.models.domain import Business, Transaction, Budget, SystemSetting

def seed_demo_data(db: Session):
    # Check if data already exists
    existing_business = db.query(Business).first()
    if existing_business:
        return existing_business.id

    # Create Business
    business = Business(
        name="PathFortune Tech Solutions Pvt Ltd",
        industry="Enterprise SaaS & AI Analytics",
        currency="INR",
        fiscal_year_start="April"
    )
    db.add(business)
    db.flush()

    # System Setting
    setting = SystemSetting(
        business_id=business.id,
        default_forecast_horizon=3,
        ai_provider="gemini"
    )
    db.add(setting)

    # Categories & Vendors
    revenue_categories = {
        "SaaS Subscriptions": ["Acme Corp", "TechNova", "Starlight Systems", "Nexus India", "GlobalLogistics"],
        "Enterprise Contracts": ["Tata Digital", "Infosys Partner Program", "Reliance Retail Tech"],
        "Consulting Services": ["Apex Advisors", "Vanguard Advisory", "FinTech Cloud Services"],
        "Implementation Fees": ["Zeta Enterprise", "OmniHealth Tech"]
    }

    expense_categories = {
        "Salaries": ("Engineering & Ops", ["Salary Disbursal - Tech Team", "Salary Disbursal - Sales & Marketing", "Exec Management Compensation"]),
        "Marketing": ("Marketing", ["Google Ads Billing", "LinkedIn Campaign Manager", "Brand Sponsorship Expo", "PR Agency Retainer"]),
        "Software": ("IT & Infrastructure", ["AWS Cloud Hosting", "GitHub Enterprise", "HubSpot CRM", "Zoom Enterprise", "Datadog Monitoring"]),
        "Rent": ("Facilities", ["OFC Lease Agreement - Tech Park Bangalore", "Co-Working Space Delhi"]),
        "Operations": ("Operations", ["Office Supplies Hub", "High-Speed Lease Line ISP", "Hardware Refresh - Laptops"]),
        "Logistics": ("Supply Chain", ["BlueDart Courier Express", "FedEx Freight Services"]),
        "Utilities": ("Facilities", ["BESCOM Power Utilities", "Facility Maintenance Services"]),
        "Professional Services": ("Legal & Finance", ["KPMG Statutory Audit", "Trilegal Advisory Services"]),
        "Travel": ("Sales & Travel", ["MakeMyTrip Business Travel", "Taj Hotels Client Dinners"])
    }

    # Generate 24 months of data (Aug 2024 to Jul 2026)
    start_date = date(2024, 8, 1)
    end_date = date(2026, 7, 31)
    
    current_date = start_date
    transactions = []
    budgets = []

    # Monthly baseline factors
    while current_date <= end_date:
        year = current_date.year
        month = current_date.month
        month_str = current_date.strftime("%Y-%m")
        days_in_month = 28 if month == 2 else (30 if month in [4, 6, 9, 11] else 31)

        # Base organic growth factor over 24 months (0 to 23)
        months_elapsed = (year - 2024) * 12 + (month - 8)
        growth_multiplier = 1.0 + (months_elapsed * 0.022)  # ~2.2% monthly growth

        # Seasonality factor (Q4 push in March/Dec)
        seasonality = 1.15 if month in [3, 12] else (0.92 if month in [1, 7] else 1.0)

        # ----------------------------------------------------
        # 1. REVENUE GENERATION
        # ----------------------------------------------------
        # SaaS Subscriptions (Multiple monthly recurring payments)
        mrr_base = 550000 * growth_multiplier * seasonality
        for i in range(12):
            t_date = date(year, month, min(days_in_month, 5 + i * 2))
            amt = round(mrr_base / 12 * random.uniform(0.9, 1.1), 2)
            cust = random.choice(revenue_categories["SaaS Subscriptions"])
            transactions.append(Transaction(
                business_id=business.id,
                date=t_date,
                description=f"Monthly Subscription Renewal - {cust}",
                type="Income",
                category="SaaS Subscriptions",
                amount=amt,
                payment_method="Bank Transfer",
                department="Sales",
                vendor_customer=cust,
                status="Completed"
            ))

        # Enterprise Contracts
        if random.random() > 0.3:
            t_date = date(year, month, min(days_in_month, 15))
            amt = round(random.uniform(300000, 650000) * growth_multiplier, 2)
            cust = random.choice(revenue_categories["Enterprise Contracts"])
            transactions.append(Transaction(
                business_id=business.id,
                date=t_date,
                description=f"Quarterly Enterprise Contract Milestone - {cust}",
                type="Income",
                category="Enterprise Contracts",
                amount=amt,
                payment_method="Wire Transfer",
                department="Enterprise Sales",
                vendor_customer=cust,
                status="Completed"
            ))

        # Consulting Services
        for _ in range(random.randint(1, 3)):
            t_date = date(year, month, random.randint(1, days_in_month))
            amt = round(random.uniform(75000, 180000), 2)
            cust = random.choice(revenue_categories["Consulting Services"])
            transactions.append(Transaction(
                business_id=business.id,
                date=t_date,
                description=f"AI Analytics Advisory Invoice - {cust}",
                type="Income",
                category="Consulting Services",
                amount=amt,
                payment_method="Bank Transfer",
                department="Consulting",
                vendor_customer=cust,
                status="Completed"
            ))

        # ----------------------------------------------------
        # 2. EXPENSE GENERATION
        # ----------------------------------------------------
        # Salaries (Fixed on 1st of month)
        salary_base = 450000 * (1.0 + months_elapsed * 0.015)
        transactions.append(Transaction(
            business_id=business.id,
            date=date(year, month, 1),
            description="Engineering & Core Team Payroll Disbursal",
            type="Expense",
            category="Salaries",
            amount=round(salary_base * 0.7, 2),
            payment_method="Direct Deposit",
            department="Engineering",
            vendor_customer="Employees Payroll",
            status="Completed"
        ))
        transactions.append(Transaction(
            business_id=business.id,
            date=date(year, month, 1),
            description="Sales & Operations Payroll Disbursal",
            type="Expense",
            category="Salaries",
            amount=round(salary_base * 0.3, 2),
            payment_method="Direct Deposit",
            department="Sales",
            vendor_customer="Employees Payroll",
            status="Completed"
        ))

        # Rent (Fixed on 5th of month)
        transactions.append(Transaction(
            business_id=business.id,
            date=date(year, month, 5),
            description="Bangalore HQ Office Rent",
            type="Expense",
            category="Rent",
            amount=125000.0,
            payment_method="Bank Transfer",
            department="Facilities",
            vendor_customer="Prestige Tech Park Realty",
            status="Completed"
        ))

        # Software Subscriptions
        # INTENTIONAL ANOMALY 1: Massive AWS Cloud & Software License Renewal in March 2026
        if year == 2026 and month == 3:
            sw_amt = 385000.0  # Spike vs typical 65k
            desc = "ANOMALY: AWS Reserved Instances & Cloud Infrastructure Annual Advance Payment"
        else:
            sw_amt = round(random.uniform(55000, 75000), 2)
            desc = "Cloud Infrastructure & Software SaaS Subscriptions"

        transactions.append(Transaction(
            business_id=business.id,
            date=date(year, month, 10),
            description=desc,
            type="Expense",
            category="Software",
            amount=sw_amt,
            payment_method="Corporate Credit Card",
            department="IT & Infrastructure",
            vendor_customer="Amazon Web Services India",
            status="Completed"
        ))

        # Marketing
        # INTENTIONAL ANOMALY 2: Digital Marketing & Ad Surge in May 2026
        if year == 2026 and month == 5:
            mkt_amt = 295000.0  # Spike vs typical ~90k
            desc = "ANOMALY: Global Product Launch Blitz Ad Campaign & Expo Sponsorship"
        else:
            mkt_amt = round(random.uniform(80000, 110000), 2)
            desc = "Performance Marketing & Digital Ad Campaigns"

        transactions.append(Transaction(
            business_id=business.id,
            date=date(year, month, 14),
            description=desc,
            type="Expense",
            category="Marketing",
            amount=mkt_amt,
            payment_method="Corporate Card",
            department="Marketing",
            vendor_customer="Google Ads & LinkedIn Media",
            status="Completed"
        ))

        # Operations
        ops_amt = round(random.uniform(40000, 65000), 2)
        transactions.append(Transaction(
            business_id=business.id,
            date=date(year, month, 18),
            description="Office Supplies, Internet Leased Lines & Hardware Maintenance",
            type="Expense",
            category="Operations",
            amount=ops_amt,
            payment_method="Bank Transfer",
            department="Operations",
            vendor_customer="Airtel Business & OfficeDepot",
            status="Completed"
        ))

        # Travel & Other categories
        travel_amt = round(random.uniform(25000, 55000), 2)
        transactions.append(Transaction(
            business_id=business.id,
            date=date(year, month, 22),
            description="Client Onboarding & Executive Sales Travel",
            type="Expense",
            category="Travel",
            amount=travel_amt,
            payment_method="Corporate Card",
            department="Sales",
            vendor_customer="MakeMyTrip Corporate",
            status="Completed"
        ))

        prof_amt = round(random.uniform(30000, 60000), 2)
        transactions.append(Transaction(
            business_id=business.id,
            date=date(year, month, 25),
            description="Legal Retainer & Statutory Accounting Services",
            type="Expense",
            category="Professional Services",
            amount=prof_amt,
            payment_method="Bank Transfer",
            department="Finance",
            vendor_customer="KPMG & Legal Associates",
            status="Completed"
        ))

        # ----------------------------------------------------
        # 3. BUDGET ALLOCATION SETUP
        # ----------------------------------------------------
        budget_targets = {
            "Salaries": 480000.0 * (1.0 + months_elapsed * 0.015),
            "Rent": 125000.0,
            "Software": 80000.0,
            "Marketing": 100000.0,
            "Operations": 60000.0,
            "Travel": 45000.0,
            "Professional Services": 50000.0,
            "Logistics": 30000.0,
            "Utilities": 25000.0
        }
        for cat, alloc in budget_targets.items():
            budgets.append(Budget(
                business_id=business.id,
                month=month_str,
                category=cat,
                department=expense_categories.get(cat, ("General", []))[0],
                allocated_amount=round(alloc, 2)
            ))

        # Advance to next month
        if month == 12:
            current_date = date(year + 1, 1, 1)
        else:
            current_date = date(year, month + 1, 1)

    db.add_all(transactions)
    db.add_all(budgets)
    db.commit()

    return business.id
