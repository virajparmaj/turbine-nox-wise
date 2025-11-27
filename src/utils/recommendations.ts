export type RiskLevel = "Normal" | "Watch" | "High" | "Low confidence";

export interface DiffItem {
  name: string;
  old: number;
  new: number;
  pct: number;
}

export interface RecommendationResult {
  modelLabel: string;
  predictedNOx: number;
  deltaPctVsPrev: number | null;
  risk: RiskLevel;
  advisory: string[];       // high-level summary lines
  recs: string[];           // concrete, short actions
  diffs: DiffItem[];
}

interface EvaluationState {
  activeModel: "full" | "130_136" | "160p";
  payload: Record<string, number>;
  prediction: number;
  previousPrediction: number | null;
  previousPayload: Record<string, number> | null;
  siteLimitNOx: number | null;
  baselineNOx: number | null;
  histMinMax: Record<string, { min: number; max: number }>;
  bandMedians: Record<string, number>;
}

// ----------------------------------------------------------------------
// USER-FRIENDLY LIBRARIES (PLAIN ENGLISH)
// ----------------------------------------------------------------------

const REC_LIBRARY = {
  // Fine-tuning levers
  AFDP_HIGH: "Air filter may be clogged. Clean or replace the filter.",
  TIT_HIGH: "Firing temperature is high. Lower TIT slightly.",
  TAT_RISING: "Exhaust is hot and uneven. Re-check how evenly fuel is shared.",
  CDP_OFF: "Airflow not normal. Look for dirt, leaks, or stuck guide vanes.",
  GTEP_HIGH: "Outlet may be blocked. Inspect exhaust duct or silencers.",
  AH_HIGH:
    "Very humid air. If water/steam injection is used, make sure settings are correct.",

  // Non-tuning / safety
  OUT_OF_RANGE:
    "Inputs are outside what the model has seen before. Treat this result with caution.",
  BAND_MISMATCH:
    "Current load does not match this model’s band. Switch to the correct load-band model.",
  LARGE_JUMP:
    "NOx changed a lot while settings barely moved. Check sensors and recent manual changes.",
  WEATHER_ONLY:
    "Most of the change looks driven by weather rather than settings.",
  MULTIPLE_DRIVERS:
    "Several levers are active together. Change one thing at a time and let the machine settle.",
  PRIORITY_ORDER:
    "Fix things in this order: air filter → TIT/TAT → exhaust path → airflow.",
};

const ADV_LIBRARY = {
  NOX_UP: "NOx is higher than your reference run under these conditions.",
  NOX_DOWN: "NOx is lower than your reference run under these conditions.",
  RISK_HIGH:
    "There is a high chance of running close to or above your NOx limit. Tune slowly and monitor closely.",
  RISK_WATCH:
    "Noticeable NOx change. Make small moves and watch the trend after each step.",
  LOW_CONF:
    "Some inputs are outside the model’s normal range, so this prediction is less reliable.",
  WEATHER:
    "Most of the change appears to come from the weather (ambient conditions), not from turbine settings.",
  FILTER_DRIVER:
    "Air filter loading is a key driver in this scenario. Keeping filters clean helps control NOx peaks.",
  TEMP_DRIVER:
    "Combustor temperatures (TIT/TAT) are a major driver of NOx right now.",
  EXHAUST_DRIVER:
    "Exhaust back-pressure is contributing to higher NOx. A clear outlet path reduces NOx.",
  AIRFLOW_DRIVER:
    "Overall airflow into the machine is affecting NOx. Healthy airflow supports cleaner combustion.",
};

// Utility
function pctDiff(v: number, base: number) {
  return (v - base) / base;
}

// ----------------------------------------------------------------------
// MAIN FUNCTION
// ----------------------------------------------------------------------

export function renderRecommendations(
  state: EvaluationState
): RecommendationResult {
  const {
    activeModel,
    payload,
    prediction,
    previousPrediction,
    previousPayload,
    baselineNOx,
    histMinMax,
    bandMedians,
  } = state;

  const modelLabels = {
    full: "Full Model (All Data)",
    "130_136": "130–136 Band Model",
    "160p": "160+ Band Model",
  };

  // -----------------------------
  // 1) Change in NOx vs reference
  // -----------------------------
  const ref = baselineNOx ?? previousPrediction;
  const deltaPctVsPrev = ref ? (100 * (prediction - ref)) / ref : null;

  // -----------------------------
  // 2) Risk level
  // -----------------------------
  let risk: RiskLevel = "Normal";
  let outOfRange = false;

  Object.keys(payload).forEach((key) => {
    if (histMinMax[key]) {
      if (
        payload[key] < histMinMax[key].min ||
        payload[key] > histMinMax[key].max
      ) {
        outOfRange = true;
      }
    }
  });

  if (outOfRange) {
    risk = "Low confidence";
  } else if (deltaPctVsPrev !== null) {
    const abs = Math.abs(deltaPctVsPrev);
    if (
      deltaPctVsPrev > 15 ||
      (state.siteLimitNOx && prediction > state.siteLimitNOx)
    ) {
      risk = "High";
    } else if (abs > 5 && abs <= 15) {
      risk = "Watch";
    }
  }

  // -----------------------------
  // 3) Advisory (high-level summary)
  // -----------------------------
  const advisory: string[] = [];

  if (deltaPctVsPrev !== null) {
    if (deltaPctVsPrev > 0) advisory.push(ADV_LIBRARY.NOX_UP);
    else if (deltaPctVsPrev < 0) advisory.push(ADV_LIBRARY.NOX_DOWN);
  }

  if (risk === "High") advisory.push(ADV_LIBRARY.RISK_HIGH);
  else if (risk === "Watch") advisory.push(ADV_LIBRARY.RISK_WATCH);
  else if (risk === "Low confidence") advisory.push(ADV_LIBRARY.LOW_CONF);

  // -----------------------------
  // 4) Core levers and interactions
  // -----------------------------
  const triggered: string[] = [];
  const NOxUp = deltaPctVsPrev !== null && deltaPctVsPrev > 0;

  // Range / band checks
  if (outOfRange) triggered.push(REC_LIBRARY.OUT_OF_RANGE);

  if (
    (activeModel === "130_136" && (payload.TEY < 130 || payload.TEY > 136)) ||
    (activeModel === "160p" && payload.TEY < 160)
  ) {
    triggered.push(REC_LIBRARY.BAND_MISMATCH);
  }

  // Basic levers
  const afdpHigh = payload.AFDP > bandMedians.AFDP * 1.05;
  const titHigh = payload.TIT > bandMedians.TIT * 1.03;
  const tatHigh = payload.TAT > bandMedians.TAT * 1.03;
  const cdpOff =
    Math.abs(payload.CDP - bandMedians.CDP) > 0.05 * bandMedians.CDP;
  const gtepHigh = payload.GTEP > bandMedians.GTEP * 1.05;
  const ahHigh = payload.AH > 80;

  if (afdpHigh) {
    triggered.push(REC_LIBRARY.AFDP_HIGH);
    if (NOxUp) advisory.push(ADV_LIBRARY.FILTER_DRIVER);
  }

  if (titHigh) {
    triggered.push(REC_LIBRARY.TIT_HIGH);
    advisory.push(ADV_LIBRARY.TEMP_DRIVER);
  }

  if (tatHigh) {
    triggered.push(REC_LIBRARY.TAT_RISING);
    advisory.push(ADV_LIBRARY.TEMP_DRIVER);
  }

  if (cdpOff) {
    triggered.push(REC_LIBRARY.CDP_OFF);
    advisory.push(ADV_LIBRARY.AIRFLOW_DRIVER);
  }

  if (gtepHigh) {
    triggered.push(REC_LIBRARY.GTEP_HIGH);
    advisory.push(ADV_LIBRARY.EXHAUST_DRIVER);
  }

  if (ahHigh) {
    triggered.push(REC_LIBRARY.AH_HIGH);
  }

  // Simplified interaction rules

  // AFDP × AT: filter impact worse on hot days
  if (
    afdpHigh &&
    payload.AT > bandMedians.AT * 1.1
  ) {
    triggered.push(
      "Hot day with a loaded filter. Cleaning the filter can give a clear NOx benefit."
    );
  }

  // GTEP × AFDP: both inlet and outlet restricted
  if (gtepHigh && afdpHigh) {
    triggered.push(
      "Both air entry and exhaust look restrictive. Inspect inlet and outlet paths together."
    );
  }

  // TIT × TAT: combustion imbalance
  if (titHigh && tatHigh) {
    triggered.push(
      "Temperatures are high and uneven. Re-check fuel distribution between burners."
    );
  }

  // Ambient-only change
  const ambientOnly =
    previousPayload &&
    Math.abs(pctDiff(payload.AT, previousPayload.AT)) > 0.05 &&
    Math.abs(pctDiff(payload.TIT, previousPayload.TIT)) < 0.02 &&
    Math.abs(pctDiff(payload.TAT, previousPayload.TAT)) < 0.02;

  if (ambientOnly) {
    triggered.push(REC_LIBRARY.WEATHER_ONLY);
    advisory.push(ADV_LIBRARY.WEATHER);
  }

  // Big NOx jump with tiny setting changes → likely sensor / one-off event
  if (previousPayload && deltaPctVsPrev !== null && Math.abs(deltaPctVsPrev) > 10) {
    let total = 0;
    let count = 0;

    Object.keys(payload).forEach((key) => {
      if (previousPayload[key] !== undefined) {
        const change = Math.abs(pctDiff(payload[key], previousPayload[key]));
        total += change;
        count++;
      }
    });

    if (count > 0 && total / count < 0.02) {
      triggered.push(REC_LIBRARY.LARGE_JUMP);
    }
  }

  // Stabilising guidance
  if (triggered.length >= 3) triggered.push(REC_LIBRARY.MULTIPLE_DRIVERS);
  if (triggered.length >= 2) triggered.push(REC_LIBRARY.PRIORITY_ORDER);

  // Cap advisory + recs so UI stays clean
  const finalAdvisory = advisory.slice(0, 3);
  const finalRecs = triggered.slice(0, 5);

  if (finalAdvisory.length === 0) {
    finalAdvisory.push("Operating close to normal for these conditions.");
  }
  if (finalRecs.length === 0) {
    finalRecs.push("Operating within normal limits. No tuning action suggested.");
  }

  // -----------------------------
  // 5) “What changed” panel
  // -----------------------------
  const diffs: DiffItem[] = [];
  if (previousPayload) {
    Object.keys(payload).forEach((key) => {
      if (previousPayload[key] !== undefined) {
        const pct = pctDiff(payload[key], previousPayload[key]) * 100;
        if (Math.abs(pct) >= 1) {
          diffs.push({
            name: key,
            old: previousPayload[key],
            new: payload[key],
            pct,
          });
        }
      }
    });

    diffs.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  }

  return {
    modelLabel: modelLabels[activeModel],
    predictedNOx: prediction,
    deltaPctVsPrev,
    risk,
    advisory: finalAdvisory,
    recs: finalRecs,
    diffs,
  };
}