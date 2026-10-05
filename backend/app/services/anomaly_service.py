from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from app.models.domain import Transaction
from app.services.analytics_service import format_inr

def detect_anomalies(db: Session, business_id: str):
    """
    Hybrid Anomaly Detection Engine combining Isolation Forest for point anomalies
    and Rolling Z-Score analysis for category spending spikes.
    """
    txs = db.query(Transaction).filter(Transaction.business_id == business_id).all()
    if not txs or len(txs) < 15:
        return []

    data = [{
        "id": t.id,
        "date": t.date.strftime("%Y-%m-%d"),
        "month": t.date.strftime("%Y-%m"),
        "type": t.type,
        "category": t.category,
        "amount": t.amount,
        "description": t.description,
        "vendor": t.vendor_customer
    } for t in txs]

    df = pd.DataFrame(data)

    anomalies = []

    # 1. Point Anomalies with Isolation Forest on Expense transactions
    df_exp = df[df['type'] == 'Expense'].copy()
    if len(df_exp) >= 10:
        try:
            # Encode category as integer
            df_exp['cat_code'] = df_exp['category'].astype('category').cat.codes
            features = df_exp[['amount', 'cat_code']].values

            # IsolationForest can't fit on a single distinct feature row (e.g. every
            # transaction identical) or non-finite values - guard both.
            if len(np.unique(features, axis=0)) < 2 or not np.all(np.isfinite(features)):
                raise ValueError("Insufficient feature variance for Isolation Forest fitting.")

            clf = IsolationForest(contamination=0.04, random_state=42)
            df_exp['iso_score'] = clf.fit_predict(features)

            # Outliers have iso_score == -1
            outliers = df_exp[df_exp['iso_score'] == -1]
            for _, row in outliers.iterrows():
                # Check category average
                cat_series = df_exp[df_exp['category'] == row['category']]['amount']
                cat_mean = cat_series.mean()
                if not cat_mean or cat_mean == 0:
                    continue
                cat_std = cat_series.std()
                cat_std = cat_std if pd.notnull(cat_std) and cat_std > 0 else 1.0
                z_score = (row['amount'] - cat_mean) / cat_std

                if z_score > 1.8:
                    dev_pct = round(((row['amount'] - cat_mean) / cat_mean) * 100, 1)
                    severity = "High" if dev_pct > 150 or z_score > 3.0 else "Medium"

                    anomalies.append({
                        "id": row['id'],
                        "transaction_id": row['id'],
                        "date": row['date'],
                        "anomaly_type": f"Unusual {row['category']} Expense Transaction",
                        "severity": severity,
                        "metric_category": row['category'],
                        "observed_value": row['amount'],
                        "expected_value": round(cat_mean, 2),
                        "percentage_deviation": dev_pct,
                        "explanation": f"Transaction of {format_inr(row['amount'])} for '{row['description']}' is {dev_pct}% above the category historical average of {format_inr(cat_mean)}."
                    })
        except Exception:
            # Isolation Forest fitting failed on this dataset (e.g. degenerate
            # feature matrix). Fall through to the monthly z-score pass below
            # rather than 500-ing the endpoint - point anomalies are simply skipped.
            pass

    # 2. Monthly Category Level Spikes (MoM Z-Score)
    try:
        monthly_cat = df[df['type'] == 'Expense'].groupby(['month', 'category'])['amount'].sum().unstack(fill_value=0)
        for cat in monthly_cat.columns:
            series = monthly_cat[cat]
            if len(series) >= 4:
                rolling_mean = series.rolling(window=3, min_periods=2).mean().shift(1)

                latest_val = series.iloc[-1]
                latest_month = series.index[-1]
                prev_mean = rolling_mean.iloc[-1]

                if pd.notnull(prev_mean) and prev_mean > 0:
                    dev = ((latest_val - prev_mean) / prev_mean) * 100
                    if dev > 40.0 and (latest_val - prev_mean) > 30000:
                        severity = "High" if dev > 100 else "Medium"
                        # Avoid duplicate if already caught as point anomaly
                        anomalies.append({
                            "id": f"monthly_cat_{cat}_{latest_month}",
                            "transaction_id": None,
                            "date": f"{latest_month}-01",
                            "anomaly_type": f"Category Expenditure Surge: {cat}",
                            "severity": severity,
                            "metric_category": cat,
                            "observed_value": latest_val,
                            "expected_value": round(prev_mean, 2),
                            "percentage_deviation": round(dev, 1),
                            "explanation": f"{cat} spending reached {format_inr(latest_val)} in {latest_month}, which is {round(dev, 1)}% higher than the preceding 3-month moving average of {format_inr(prev_mean)}."
                        })
    except Exception:
        # Monthly aggregation failed (e.g. malformed category data) - point
        # anomalies detected above are still returned.
        pass

    # Sort anomalies by date descending
    anomalies.sort(key=lambda x: x['date'], reverse=True)
    return anomalies
