# PathFortune Finances

**Live demo:** [https://path-fortune-finances.vercel.app/](https://path-fortune-finances.vercel.app/)

> The backend runs on a free hosting tier, so the first request after a period of inactivity can take 30–60 seconds to wake up. Demo data may reset when the backend restarts.

A full-stack financial analytics platform for small and medium businesses: real-time dashboards, ML-driven forecasting and anomaly detection, a budget and scenario engine, and a grounded GenAI assistant that explains your numbers without ever inventing them.

Developed as a final-year AIML project in collaboration with **PathFortune Pvt Ltd**. Every "intelligent" feature is backed by an explainable model or a deterministic calculation, not a black box.

## Features

- **Dashboard & Analytics**: revenue, expenses, profit, cash flow, and margin, all computed live from transaction data (no hardcoded numbers).
- **Transactions**: full CRUD with search, filtering, sorting, and pagination.
- **CSV / Excel Import**: upload, preview, column mapping (arbitrary source headers supported), validation, import. Processed on the backend, not parsed on the frontend only.
- **Financial Health Score**: a documented, weighted 0–100 score (profit margin, growth, cash-flow stability, budget variance, anomalies), not a random number.
- **Budgets**: monthly category budgets vs. actual spend, with overrun tracking.
- **Anomaly Detection**: Isolation Forest plus rolling z-score; flags unusual transactions with severity and explanation.
- **Forecasting**: compares Linear Regression, Ridge, Random Forest, and Gradient Boosting per metric, picks the best by MAPE, and reports the evaluation honestly.
- **Scenario Simulator**: what-if modeling (revenue, expense, and budget adjustments) computed server-side, debounced on input.
- **Recommendations & Smart Alerts**: rule-based and evidence-backed; every recommendation cites the specific data point behind it.
- **Ask PathFortune AI**: a grounded chat assistant (Google Gemini) that explains your real numbers. Falls back to a deterministic, equally grounded answer engine when no API key is set, so the app is fully functional either way.
- **Management Summary**: one-click AI-generated executive summary built from the same grounded context as the chat.
- **Reports**: monthly summary with budget-vs-actual and recommended actions, exportable as CSV or PDF.

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite, pandas, scikit-learn, Google Generative AI SDK
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py                  # runs on :8000, auto-seeds SQLite with demo data on first run
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # runs on :5173
```

Open `http://localhost:5173`. On first launch the backend generates about 24 months of realistic synthetic demo data (a clearly labeled placeholder dataset, not real financials), so you can explore the app immediately.

## Environment Variables

None are required to run the app.

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | unset | Enables live Gemini responses for Ask PathFortune AI and the Management Summary. Get a free key from [Google AI Studio](https://aistudio.google.com/). Without it, the app uses an offline deterministic answer engine grounded in the same data. |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Override the Gemini model. If the default is unavailable, set this to a current model name from Google AI Studio. |
| `DATABASE_URL` | unset | Override the SQLite connection string. Used by the test suite to avoid writing into the demo database; leave unset for normal use. |
| `VITE_API_URL` | `http://localhost:8000/api` | Frontend only. Backend API base URL for production builds. |

## Database

SQLite, file-based, at `backend/data/pathfortune.db`. No separate database server to install or configure. Auto-seeded on first run if empty.

## Importing Your Own Data

Data Import → drop a CSV or Excel file → the app shows the detected columns → map each one to a system field (only **date** and **amount** are required; source column names can be anything) → import. Imported transactions flow into every analytics, forecasting, and AI feature; there is no separate demo-vs-real data path.

## Running Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v
```

Tests run against an isolated database file and never touch the real or demo data.

## Project Structure

```
PathFortune_Finances/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/      # FastAPI routers, one per feature
│   │   ├── services/           # All business logic and ML
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   └── seed/               # Synthetic demo data generator
│   ├── tests/
│   └── main.py
└── frontend/
    └── src/
        ├── pages/              # One page per feature
        ├── components/         # Shared UI (layout, AI chat drawer, error/empty states)
        ├── services/api.ts     # All backend calls
        └── types/              # Shared TypeScript interfaces
```

## Design Principles

- **Analytics and ML calculate the facts. GenAI only explains them.** The LLM is never allowed to compute a number, invent a transaction, or replace the forecasting and anomaly models. It is handed a structured context built entirely from existing backend services.
- **No fake data, anywhere.** Every dashboard figure is derived from the transactions table. The only synthetic data is the clearly labeled initial demo dataset.
- **Graceful degradation over hard failure.** No Gemini key, insufficient history for a forecast, an empty database: all are handled with a clear message, not a crash.

## Current Limitations

- No authentication; the app is single-business and single-user by design in this version.
- SQLite on free hosting does not persist across backend restarts, so imported data is lost when the service restarts.
- The Settings page is UI-only and does not persist changes to the backend.

## Team

Built by a three-person team:

- **Krish**: data foundation, financial health score, budgets, anomaly detection
- **Arjun**: forecasting, scenario simulator, recommendations, smart alerts
- **Sarthak**: codebase audit and integration, grounded GenAI assistant, reports/exports, final polish, deployment

## License & Ownership

This project was developed as a final-year project in collaboration with **PathFortune Pvt Ltd**. All rights reserved. The code is shared for demonstration and academic evaluation only; it may not be copied, redistributed, or used commercially without permission from tgit statushe project team and PathFortune Pvt Ltd.
