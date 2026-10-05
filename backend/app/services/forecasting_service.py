from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from app.services.analytics_service import get_monthly_aggregates, format_inr

def calculate_mape(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    nonzero = y_true != 0
    if not np.any(nonzero):
        return 0.0
    return float(np.mean(np.abs((y_true[nonzero] - y_pred[nonzero]) / y_true[nonzero])) * 100)

def generate_forecasts(db: Session, business_id: str, horizon_months: int = 3, target_metric: str = "revenue"):
    """
    Time-Series ML Forecasting Engine.
    Engineers lag features, tests multiple regression models, evaluates MAE/RMSE/MAPE,
    and returns historical actuals vs predicted horizon with confidence bounds.
    """
    df = get_monthly_aggregates(db, business_id)
    if df.empty or len(df) < 6:
        raise ValueError("Minimum 6 months of historical data required for ML forecasting.")

    if target_metric not in ['revenue', 'expenses', 'net_profit', 'cash_flow']:
        target_metric = 'revenue'

    df_series = df[['month', target_metric]].copy()
    df_series['month_date'] = pd.to_datetime(df_series['month'] + '-01')

    # Feature Engineering
    df_series['lag_1'] = df_series[target_metric].shift(1)
    df_series['lag_2'] = df_series[target_metric].shift(2)
    df_series['lag_3'] = df_series[target_metric].shift(3)
    df_series['rolling_3'] = df_series[target_metric].shift(1).rolling(3).mean()
    df_series['month_num'] = df_series['month_date'].dt.month
    df_series['trend_idx'] = np.arange(len(df_series))

    # Drop initial NaN rows created by lags
    df_model = df_series.dropna().copy()
    
    feature_cols = ['lag_1', 'lag_2', 'lag_3', 'rolling_3', 'month_num', 'trend_idx']
    X = df_model[feature_cols].values
    y = df_model[target_metric].values

    # Train / Test Split for walk-forward time series validation (last 3 months as test)
    split_idx = max(len(X) - 3, 2)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    models = {
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Ridge(alpha=1.0),
        "Random Forest": RandomForestRegressor(n_estimators=50, random_state=42),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=50, random_state=42)
    }

    best_name = "Linear Regression"
    best_model = models[best_name]
    best_mape = float('inf')
    evaluation_results = {}

    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test) if len(X_test) > 0 else model.predict(X_train)
        y_eval = y_test if len(X_test) > 0 else y_train
        
        mae = float(mean_absolute_error(y_eval, preds))
        rmse = float(root_mean_squared_error(y_eval, preds))
        mape = calculate_mape(y_eval, preds)
        r2 = float(r2_score(y_eval, preds)) if len(y_eval) >= 2 else 0.0
        
        evaluation_results[name] = {"MAE": round(mae, 2), "RMSE": round(rmse, 2), "MAPE": round(mape, 2), "R2": round(r2, 4)}
        
        if mape < best_mape:
            best_mape = mape
            best_name = name
            best_model = model

    # Re-fit best model on full historical dataset
    best_model.fit(X, y)

    # Iterative Recursive Forecasting for Future Horizon
    last_known_row = df_series.iloc[-1]
    last_date = last_known_row['month_date']

    future_predictions = []
    current_history = df_series[target_metric].tolist()

    for h in range(1, horizon_months + 1):
        next_date = last_date + pd.DateOffset(months=h)
        next_month_str = next_date.strftime("%Y-%m")
        
        lag_1 = current_history[-1]
        lag_2 = current_history[-2] if len(current_history) >= 2 else lag_1
        lag_3 = current_history[-3] if len(current_history) >= 3 else lag_2
        rolling_3 = np.mean(current_history[-3:])

        feat_vector = np.array([[lag_1, lag_2, lag_3, rolling_3, next_date.month, len(df_series) - 1 + h]])
        pred_val = float(best_model.predict(feat_vector)[0])
        pred_val = max(0.0, pred_val) if target_metric in ['revenue', 'expenses'] else pred_val

        # Confidence interval +/- (RMSE * sqrt(h))
        rmse_val = evaluation_results[best_name]['RMSE'] or (pred_val * 0.05)
        std_err = rmse_val * (1.0 + 0.15 * (h - 1))
        
        future_predictions.append({
            "month": next_month_str,
            "predicted_value": round(pred_val, 2),
            "formatted_value": format_inr(pred_val),
            "confidence_lower": round(max(0.0, pred_val - 1.96 * std_err), 2),
            "confidence_upper": round(pred_val + 1.96 * std_err, 2),
            "is_forecast": True
        })

        current_history.append(pred_val)

    # Historical data formatted for charts
    historical_data = []
    for _, row in df.iterrows():
        historical_data.append({
            "month": row['month'],
            "actual_value": round(row[target_metric], 2),
            "formatted_value": format_inr(row[target_metric]),
            "is_forecast": False
        })

    # Plain English explanation
    first_pred = future_predictions[0]['predicted_value']
    last_actual = historical_data[-1]['actual_value']
    diff_pct = round(((first_pred - last_actual) / last_actual) * 100, 1) if last_actual > 0 else 0
    dir_str = "increase" if diff_pct >= 0 else "decrease"

    insight_str = (
        f"{target_metric.replace('_', ' ').title()} is projected to {dir_str} by {abs(diff_pct)}% next month "
        f"to {format_inr(first_pred)}. Selected model: {best_name} (MAPE: {evaluation_results[best_name]['MAPE']}%)."
    )

    return {
        "horizon_months": horizon_months,
        "target_metric": target_metric,
        "selected_model": best_name,
        "evaluation_metrics": evaluation_results[best_name],
        "all_model_evaluations": evaluation_results,
        "historical_data": historical_data,
        "forecast_data": future_predictions,
        "insights": insight_str
    }

# === Section: Trend & Multi-Metric Forecasting ===

def detect_trend_direction(values: list[float]) -> str:
    """
    Detects the trend direction based on the last few values.
    Returns 'accelerating', 'decelerating', or 'stable'.
    """
    if len(values) < 3:
        return 'stable'
    
    # Calculate differences
    diffs = np.diff(values)
    # Check if differences are increasing or decreasing
    if all(d > 0 for d in diffs[-2:]) and diffs[-1] > diffs[-2]:
        return 'accelerating'
    elif all(d < 0 for d in diffs[-2:]) and diffs[-1] < diffs[-2]:
        return 'decelerating'
    elif diffs[-1] > 0:
        return 'accelerating'
    elif diffs[-1] < 0:
        return 'decelerating'
    return 'stable'

def forecast_all_metrics(db: Session, business_id: str, horizon_months: int = 3) -> dict:
    """
    Forecasts all 4 key metrics and combines the results.
    """
    metrics = ['revenue', 'expenses', 'net_profit', 'cash_flow']
    metrics_data = []
    combined_chart_data_map = {}

    for metric in metrics:
        res = generate_forecasts(db, business_id, horizon_months, metric)
        
        hist = res['historical_data']
        futu = res['forecast_data']
        
        current_val = hist[-1]['actual_value'] if hist else 0.0
        next_pred = futu[0]['predicted_value'] if futu else 0.0
        
        change_pct = ((next_pred - current_val) / current_val * 100) if current_val else 0.0
        
        # Determine trend direction using recent history and next prediction
        recent_vals = [h['actual_value'] for h in hist[-3:]] + [next_pred]
        trend = detect_trend_direction(recent_vals)

        metrics_data.append({
            "metric": metric,
            "current_value": current_val,
            "formatted_current": format_inr(current_val),
            "next_month_prediction": next_pred,
            "formatted_prediction": format_inr(next_pred),
            "change_pct": round(change_pct, 2),
            "trend_direction": trend,
            "selected_model": res['selected_model'],
            "mape": res['evaluation_metrics']['MAPE'],
            "r2": res['evaluation_metrics'].get('R2', 0.0)
        })

        # Combine historical chart data
        for item in hist:
            m = item['month']
            if m not in combined_chart_data_map:
                combined_chart_data_map[m] = {"month": m}
            combined_chart_data_map[m][metric] = item['actual_value']
            combined_chart_data_map[m][f"{metric}_forecast"] = None

        # Combine forecast chart data
        for item in futu:
            m = item['month']
            if m not in combined_chart_data_map:
                combined_chart_data_map[m] = {"month": m}
            combined_chart_data_map[m][metric] = None
            combined_chart_data_map[m][f"{metric}_forecast"] = item['predicted_value']

    # Sort combined data by month
    combined_chart_data = [combined_chart_data_map[m] for m in sorted(combined_chart_data_map.keys())]

    return {
        "horizon_months": horizon_months,
        "metrics": metrics_data,
        "combined_chart_data": combined_chart_data
    }

# === Section: Model Comparison Details ===

def get_model_comparison_detail(db: Session, business_id: str, horizon_months: int = 3, target_metric: str = "revenue") -> dict:
    """
    Provides detailed test predictions for each model.
    """
    df = get_monthly_aggregates(db, business_id)
    if df.empty or len(df) < 6:
        raise ValueError("Minimum 6 months of historical data required for ML forecasting.")

    if target_metric not in ['revenue', 'expenses', 'net_profit', 'cash_flow']:
        target_metric = 'revenue'

    df_series = df[['month', target_metric]].copy()
    df_series['month_date'] = pd.to_datetime(df_series['month'] + '-01')

    # Feature Engineering
    df_series['lag_1'] = df_series[target_metric].shift(1)
    df_series['lag_2'] = df_series[target_metric].shift(2)
    df_series['lag_3'] = df_series[target_metric].shift(3)
    df_series['rolling_3'] = df_series[target_metric].shift(1).rolling(3).mean()
    df_series['month_num'] = df_series['month_date'].dt.month
    df_series['trend_idx'] = np.arange(len(df_series))

    df_model = df_series.dropna().copy()
    
    feature_cols = ['lag_1', 'lag_2', 'lag_3', 'rolling_3', 'month_num', 'trend_idx']
    X = df_model[feature_cols].values
    y = df_model[target_metric].values
    months = df_model['month'].values

    # Train / Test Split
    split_idx = max(len(X) - 3, 2)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    test_months = months[split_idx:]
    if len(X_test) == 0:
        X_test, y_test, test_months = X_train, y_train, months[:split_idx]

    models_dict = {
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Ridge(alpha=1.0),
        "Random Forest": RandomForestRegressor(n_estimators=50, random_state=42),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=50, random_state=42)
    }

    best_name = "Linear Regression"
    best_mape = float('inf')
    model_results = []

    for name, model in models_dict.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        
        mae = float(mean_absolute_error(y_test, preds))
        rmse = float(root_mean_squared_error(y_test, preds))
        mape = calculate_mape(y_test, preds)
        r2 = float(r2_score(y_test, preds)) if len(y_test) >= 2 else 0.0

        if mape < best_mape:
            best_mape = mape
            best_name = name

        test_preds = []
        for i in range(len(preds)):
            test_preds.append({
                "month": test_months[i],
                "actual": round(float(y_test[i]), 2),
                "predicted": round(float(preds[i]), 2)
            })

        model_results.append({
            "model_name": name,
            "metrics": {
                "MAE": round(mae, 2),
                "RMSE": round(rmse, 2),
                "MAPE": round(mape, 2),
                "R2": round(r2, 4)
            },
            "test_predictions": test_preds,
            "is_selected": False
        })

    # Mark the selected model
    for m in model_results:
        if m['model_name'] == best_name:
            m['is_selected'] = True

    return {
        "target_metric": target_metric,
        "horizon_months": horizon_months,
        "selected_model": best_name,
        "models": model_results
    }
