# PathFortune Finances — Krish (Phase 1 + Phase 2) Documentation

Scope: Database, demo dataset, dashboard pipeline, transactions, revenue/expense
analytics, CSV/Excel import, financial health score, budgets, Isolation Forest
anomaly detection, structured insights. All of this already existed in the
audited Antigravity baseline in a largely complete state — this doc covers the
system as it now stands after Krish's additive Phase 1/2 fixes.

---

## 1. Database Schema

SQLite via SQLAlchemy, `backend/app/models/domain.py` (frozen — no columns/tables
added).

| Table | Fields | Notes |
|---|---|---|
| `businesses` | id, name, industry, currency, fiscal_year_start, created_at | Single-business assumption; no auth/user table |
| `transactions` | id, business_id (FK), date, description, type, category, amount, payment_method, department, vendor_customer, status, created_at | `type` ∈ {Income, Expense}; `amount` is `Float`, never a formatted string |
| `budgets` | id, business_id (FK), month (`YYYY-MM`), category, department, allocated_amount, created_at | One row per category per month |
| `settings` | id, business_id (FK), default_forecast_horizon, ai_provider, ai_model, updated_at | Arjun/Sarthak config, not modified here |

Relationships: all child tables FK to `businesses.id`. Primary keys are UUID
strings (`generate_uuid()`). No composite indexes beyond the SQLite-default PK
index — dataset size (hundreds of rows) doesn't currently warrant more.

---

## 2. API Endpoints (Krish-owned)

All under `/api`. Financial amounts numeric, dates ISO, percentages numeric
(matches shared `API_CONTRACT.md`).

| Endpoint | Method | Request | Response | Errors |
|---|---|---|---|---|
| `/dashboard/summary` | GET | `?business_id` optional | `DashboardSummaryResponse` (Pydantic-enforced) | 404 no business, 500 calc failure |
| `/transactions` | GET | `?business_id,type,category,search,limit,skip` | `TransactionResponse[]` | — |
| `/transactions` | POST | `TransactionCreate` (validated: type ∈ Income/Expense, amount ≠ 0, description/category non-empty) | `TransactionResponse` | 422 validation, 400 no business, 500 DB failure |
| `/transactions/{id}` | DELETE | — | `{message}` | 404 not found |
| `/revenue/analytics` | GET | `?business_id` | raw dict — see below | — |
| `/expenses/analytics` | GET | `?business_id` | raw dict — see below | — |
| `/budgets` | GET | `?month,business_id` | raw dict — see below | — |
| `/financial-health` | GET | `?business_id` | raw dict (score/rating/components/factors) | — |
| `/anomalies` | GET | `?business_id` | list of anomaly dicts | 404 no business, 500 detection failure |
| `/insights` | GET | `?business_id` | list of insight dicts | — |
| `/import/preview` | POST | multipart `file` | `{filename, columns, total_rows, preview}` | 400 bad format/parse |
| `/import/process` | POST | multipart `file`, `column_mapping` (JSON) | `{status, total_rows, imported_count, duplicates_skipped, error_count, errors[]}` | 400 bad mapping/parse |

`revenue/analytics` and `expenses/analytics` fields added by Krish (additive,
non-breaking): `current_period_*`, `previous_period_*`, `*_growth_pct`,
`transaction_count`, and (revenue only) `department_breakdown`.

`budgets` fields added by Krish: `variance` (= spent − allocated, per contract
formula), `formatted_variance`, `overall_utilization_pct` (backend-computed so
the frontend never divides by a possibly-zero `total_allocated`).

**Not changed:** none of the "raw dict" endpoints had `response_model`
enforcement added, per the baseline rule that the frontend already consumes
these shapes directly — enforcing a schema now would risk breaking Arjun's/
Sarthak's consumers if the unused Pydantic models (`FinancialHealthResponse`,
`AnomalyResponse`) don't match field-for-field. Flagged, not touched.

---

## 3. Financial Health Score Methodology

`backend/app/services/health_service.py` (pre-existing, unmodified — audited
and confirmed sound). Deterministic 0–100 score, six weighted components:

| Component | Weight | Rule |
|---|---|---|
| Profit Margin | 25 pts | Linear scale, 25 pts at ≥25% margin, 0 pts at ≤−10% |
| Revenue Growth (MoM) | 20 pts | Linear scale, 20 pts at ≥8% growth, 0 pts at ≤−10% |
| Cash Flow Stability | 20 pts | (months with positive cash flow in last 6) / 6 × 20 |
| Expense-to-Revenue Ratio | 15 pts | 15 pts at ≤75% ratio, 0 pts at ≥100% |
| Budget Adherence | 10 pts | (categories within budget) / (total categories) × 10 |
| Anomaly Penalty | 10 pts | 10 − (5 × High-severity anomalies) − (2.5 × Medium-severity anomalies), floored at 0 |

Total = sum of components, clamped to [0, 100]. Rating bands: ≥85 Excellent,
≥75 Healthy, ≥60 Moderate/Fair, else Needs Urgent Attention. With <2 months of
data, returns a fixed baseline score (75, "Good") with an explicit
insufficient-data risk factor rather than a misleading number.

---

## 4. Isolation Forest Anomaly Detection Methodology

`backend/app/services/anomaly_service.py`. Hybrid approach — genuine
`sklearn.ensemble.IsolationForest` for point anomalies, plus a rolling
z-score pass for category-level monthly spikes.

**Features (point anomalies):** `[amount, category_code]` per expense
transaction, where `category_code` is an integer encoding of the category.
Chosen because amount alone can't separate "large but normal" (e.g. a
₹6L salary run) from "small but weird for its category" — pairing amount
with category lets the forest isolate transactions that are unusual *relative
to their own category*, not just unusual in absolute terms.

**Preprocessing:** category → integer codes via pandas `.cat.codes`. No
scaling — Isolation Forest is tree-based and doesn't need normalized inputs.

**Contamination:** fixed at `0.04` (~4% of expense transactions are
candidate outliers before the z-score filter narrows further). Chosen
empirically to catch genuine spikes without over-flagging routine expense
variance across ~9 categories.

**Post-filter:** every IsolationForest outlier is then checked against its
own category's mean/std; only kept if z-score > 1.8 (removes false positives
from categories with naturally high variance). Severity: High if deviation
>150% or z-score >3.0, else Medium.

**Second pass:** independent of the forest, a 3-month rolling mean per
category/month catches sustained category-level spikes (>40% above trailing
average and >₹30,000 absolute) that a single-transaction model would miss.

**Safety guards (added by Krish):**
- Requires ≥10 expense transactions before attempting to fit — returns `[]`
  otherwise rather than fitting on too little data.
- Explicit check for degenerate feature matrices (all-identical values, <2
  distinct feature rows) before calling `fit_predict` — raises internally and
  is caught, so identical-value datasets degrade to "no anomalies" instead of
  crashing.
- Both the IsolationForest block and the rolling z-score block are wrapped in
  try/except independently, so a failure in one doesn't prevent the other
  from returning results.
- `/api/anomalies` itself wraps the service call in try/except → 500 with a
  clear message instead of an unhandled trace, if something still gets through.

**Limitations:** single fixed contamination rate (doesn't adapt to dataset
size); no temporal/frequency features (e.g. day-of-week, transaction velocity)
in the current feature set; single-business dataset assumption throughout,
matching the rest of the schema.

**Output contract** (list of, not wrapped in an envelope — matches the
existing `Anomaly[]` TypeScript type the frontend already consumes):
`id, transaction_id, date, anomaly_type, severity (High/Medium), metric_category,
observed_value, expected_value, percentage_deviation, explanation`.

---

## 5. CSV / Excel Import Format

`backend/app/api/endpoints/data_import.py`. One shared validation pipeline for
both formats (`pd.read_csv` / `pd.read_excel` → same row-by-row validator) —
they cannot drift apart because there's only one code path after parsing.

**Accepted columns** (mapped via `column_mapping` JSON, `{system_field: csv_column}`):
`date` (required), `amount` (required), `description`, `type`, `category`,
`payment_method`, `department`, `vendor_customer`.

**Validation, per row:**
- Missing `date` or `amount` → row rejected, reason recorded.
- `date` must parse via `pd.to_datetime`.
- `amount` must parse as a number (₹ and commas stripped first) and must be
  non-zero.
- `type` defaults to `Expense` if missing/unrecognized; normalized to
  `Income`/`Expense`.
- Duplicate check: same business_id + date + amount + description already in
  DB → skipped as a duplicate, not an error.

**Response shape** (`/import/process`): `status` ("Success"/"Failed"),
`total_rows`, `imported_count`, `duplicates_skipped`, `error_count`,
`errors` (first 10, human-readable, one per rejected row). Invalid rows are
never silently dropped — every rejection produces a row-numbered message.

---

## 6. Local Setup

```bash
# backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py            # auto-seeds SQLite on first run, serves on :8000

# frontend
cd frontend
npm install
npm run dev                # serves on :5173, expects backend on :8000
```
