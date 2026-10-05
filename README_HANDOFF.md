# PathFortune Finances — Project Handoff

Status: **Phases 0–6 complete.** Database, demo data, dashboard, transactions,
revenue/expense analytics, CSV/Excel import, financial health score, budgets,
anomaly detection, forecasting, scenario simulator, recommendations/alerts,
grounded GenAI (Ask PathFortune AI + management summary), reports/export, and
Phase 6 polish (error handling, empty states, loading states, responsive
sidebar) are all implemented and tested.

Note: development used per-phase zip handoffs between team members rather
than a shared git remote, so branch history may not reflect the final
integrated state - this zip is the authoritative current version.

## Setup

```bash
# backend
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt                   # only needed for pytest
python main.py                                         # serves :8000, auto-seeds SQLite on first run

# frontend (separate terminal)
cd frontend
npm install
npm run dev                                             # serves :5173, expects backend on :8000
```

## Environment variables

| Variable | Required? | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | No | Enables live Gemini responses for Ask PathFortune AI and the Management Summary. Get a free key from Google AI Studio. |
| `GEMINI_MODEL` | No | Overrides the Gemini model (default `gemini-1.5-flash`). |
| `DATABASE_URL` | No | Overrides the SQLite file path/URL. Used internally by the test suite to avoid writing into the real demo database - leave unset for normal use. |

**No `.env` file is required to run the app.** Without `GEMINI_API_KEY`, the
AI features automatically fall back to a deterministic, grounded answer
engine built from the same backend analytics (not an error state - the app
is fully functional either way, it just won't phrase answers via an LLM).

## Database

SQLite, file-based, at `backend/data/pathfortune.db`. Auto-seeded with ~24
months of realistic synthetic demo data on first run if the file doesn't
exist or is empty. Do not delete this file casually - re-seeding generates a
*new* random dataset each time (trends/seasonality are consistent, exact
figures are not), so don't rely on exact historical numbers staying the same
across resets. No authentication - single-business, single-user by design
for this version.

## How to import your own data

Go to **Data Import** in the sidebar → drop a CSV or Excel (.xlsx/.xls) file
→ preview the detected columns → map them to the system's fields (only
`date` and `amount` are required, source column names can be anything - the
mapping step handles arbitrary headers) → run the import. Imported
transactions immediately flow into revenue/expense analytics, financial
health, budgets, forecasting, and the AI's grounded context - there's no
separate "demo mode" vs "real mode" data path.

## Major features

- **Overview / Transactions / Revenue / Expenses** - real-time analytics computed from the transactions table.
- **Financial Health** - a documented, weighted 0–100 score (not a black box).
- **Budgets** - monthly category budgets vs actual spend.
- **Forecasting** - compares Linear Regression, Ridge, Random Forest, and Gradient Boosting; picks the best by MAPE.
- **Scenario Simulator** - what-if modeling (revenue/expense adjustments), debounced on input.
- **AI Insights** - smart alerts, recommendations, anomaly detection (Isolation Forest).
- **Ask PathFortune AI / Management Summary** - Gemini-backed, grounded strictly in the above analytics, with an offline deterministic fallback.
- **Reports** - monthly summary with budget-vs-actual and recommended actions, exportable as CSV or PDF (browser print).

## Verify the backend before changing anything

```bash
cd backend && source venv/bin/activate
pytest tests/ -v   # should show all tests passing; writes to an isolated
                    # test DB file, never the real demo database
```
