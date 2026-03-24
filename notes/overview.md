# Turbine NOx Advisor — Project Notes

## What It Is
Web app for predicting and optimizing NOx (nitrogen oxide) emissions from gas turbines. Users input 9 turbine parameters and get a real-time NOx prediction, recommendations, and delta tracking vs the previous run.

**Ideated by:** Viraj

---

## Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI + XGBoost (3 band-specific models), hosted on Render (free tier)
- **Deployed:** Vercel (frontend) + Render (backend)
- **API base:** `VITE_API_URL` env var → fallback to Render URL

---

## Models
Three separate XGBoost models, each trained on a different turbine load band:

| Model key | Endpoint | Band |
|-----------|----------|------|
| `full` | `/predict_full` | All data |
| `130_136` | `/predict_130_136` | Medium load (130–136) |
| `160p` | `/predict_160p` | High load (160+) |

Artifacts stored in `backend/artifacts/` — each has a `.joblib` model file and a `model_info_*.json` with the feature list.

---

## Input Parameters
All 9 features passed to every model (model uses its own feature subset from `model_info.json`):

| Param | Description | Unit |
|-------|-------------|------|
| AT | Ambient Temperature | °C |
| AP | Ambient Pressure | mbar |
| AH | Ambient Humidity | % |
| AFDP | Air Filter Differential Pressure | bar |
| CDP | Compressor Discharge Pressure | bar |
| GTEP | Gas Turbine Exhaust Pressure | bar |
| TIT | Turbine Inlet Temperature | °C |
| TAT | Turbine Exhaust Temperature | °C |
| TEY | Turbine Energy Yield | MW |

---

## Key Design Decisions

### Baseline
- Dataset loaded client-side from `/TurbineGroup2.csv`
- Median values from CSV used as baseline/default inputs
- Baseline NOx computed lazily on first prediction and cached

### Delta Tracking
- Delta = current NOx prediction − **previous** prediction (not baseline)
- Resets to 0 on the first run of a session

### Recommended Ranges
- Per-band recommended ranges hardcoded in `Index.tsx` (`recommendedRanges`)
- Shown on `AFDP`, `CDP`, `GTEP`, `TIT`, `TAT` inputs only
- Used by the recommendations engine in `utils/recommendations.ts`

### Cold Start Handling
- Render free tier spins down — can take 10–30s to wake
- Loading overlay shows rotating witty messages cycling every 3s
- `showColdStartHint` appears after 3s with extra context

### Prediction History
- In-memory session history (not persisted)
- Exportable as CSV

---

## CORS
Backend whitelists:
- `http://localhost:8080`
- `http://127.0.0.1:8080`
- `http://192.168.111.119:8080` (LAN dev)
- `https://turbine-nox-wise.vercel.app`

---

## Recent Milestones
- Lovable traces removed
- Logo + favicon updated; name refactored to "Turbine NOx Advisor"
- Loading screen with animated overlay and rotating messages
- Footer credit added ("Ideated by Viraj")
- Band-wise models + per-band recommended ranges on inputs
- Recommendations engine with risk levels + WhatChanged diff card
