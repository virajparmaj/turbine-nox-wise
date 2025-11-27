# api.py
from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd, joblib, json
from fastapi.middleware.cors import CORSMiddleware

# === Load per-band metadata ===
features_full = json.load(open("artifacts/model_info.json"))["features"]
features_130 = json.load(open("artifacts/model_info_130_136.json"))["features"]
features_160 = json.load(open("artifacts/model_info_160p.json"))["features"]

# Load all models
model_full = joblib.load("artifacts/nox_xgb_v1.joblib")
model_130 = joblib.load("artifacts/nox_xgb_130_136.joblib")
model_160 = joblib.load("artifacts/nox_xgb_160p.joblib")

class Sample(BaseModel):
    TIT: float; TAT: float; CDP: float; GTEP: float; AFDP: float
    AT: float; AP: float; AH: float; TEY: float

app = FastAPI()

# --------------------------------------------------
# ✅ Correct CORS (local dev + LAN + Vercel)
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://192.168.111.119:8080",
        "https://turbine-nox-wise.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Routes ===
@app.post("/predict_full")
def predict_full(payload: Sample):
    X = pd.DataFrame([payload.dict()])[features_full]
    return {"NOX_pred": float(model_full.predict(X)[0])}

@app.post("/predict_130_136")
def predict_130(payload: Sample):
    X = pd.DataFrame([payload.dict()])[features_130]
    return {"NOX_pred": float(model_130.predict(X)[0])}

@app.post("/predict_160p")
def predict_160(payload: Sample):
    X = pd.DataFrame([payload.dict()])[features_160]
    return {"NOX_pred": float(model_160.predict(X)[0])}