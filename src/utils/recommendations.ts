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
  advisory: string[]; // high-level summary lines
  recs: string[];     // concrete, short actions
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
  /**
   * For this version, histMinMax is assumed to hold the
   * recommended operating min/max per band (from JSON),
   * not raw historical extremes.
   *
   * Example for the active band:
   *   histMinMax = {
   *     TIT: { min: 1054, max: 1100 },
   *     TAT: { min: 533, max: 550 },
   *     CDP: { min: 10.4, max: 12.2 },
   *     GTEP: { min: 19.4, max: 26.2 },
   *     AFDP:{ min: 2.94, max: 4.34 },
   *     ...
   *   }
   */
  histMinMax: Record<string, { min: number; max: number }>;
  /**
   * Band medians for the active model (per variable).
   * Used for “high/low vs typical” checks.
   */
  bandMedians: Record<string, number>;
}

// ----------------------------------------------------------------------
// USER-FRIENDLY LIBRARIES (PLAIN ENGLISH)
// ----------------------------------------------------------------------

const REC_LIBRARY = {
  // Fine-tuning levers
  AFDP_HIGH:
    "Air filter loading is high. Clean or replace filters to restore healthy airflow and reduce NOx peaks.",
  TIT_HIGH:
    "Firing temperature is on the high side for this band. If you still have margin below the limit, lowering TIT slightly can reduce NOx.",
  TAT_RISING:
    "Exhaust temperature is high for this band. Check fuel sharing and burner balance.",
  CDP_OFF:
    "Compressor discharge pressure is unusual for this load. Check for fouling, leaks, or guide vane issues.",
  GTEP_VERY_HIGH:
    "You are running at very high load. Near peak load, NOx tends to rise. If emissions margin is small, consider a small load reduction.",
  AH_HIGH:
    "Air is very humid. If water/steam injection is used, confirm that injection and NOx controls are coordinated.",

  // Non-tuning / safety
  OUT_OF_RANGE:
    "One or more inputs are outside the model’s recommended range. Treat this prediction with caution.",
  BAND_MISMATCH:
    "Current TEY does not match this model’s band. Switch to the model that matches the present load band.",
  LARGE_JUMP:
    "NOx changed a lot while settings barely moved. Check sensors and review any recent manual changes.",
  WEATHER_ONLY:
    "Most of the change looks driven by weather (ambient conditions) rather than turbine settings.",
  MULTIPLE_DRIVERS:
    "Several levers are acting together. Change one thing at a time and let the machine settle before re-tuning.",
  PRIORITY_ORDER:
    "Suggested order: address filter loading (AFDP) → check airflow/CDP → tune TIT/TAT → adjust load (GTEP) if still needed.",
};

const ADV_LIBRARY = {
  NOX_UP: "NOx is higher than your reference run under these conditions.",
  NOX_DOWN: "NOx is lower than your reference run under these conditions.",
  RISK_HIGH:
    "There is a high chance of running close to or above your NOx limit. Tune slowly and monitor closely.",
  RISK_WATCH:
    "Noticeable NOx change. Make small moves and watch the trend after each step.",
  LOW_CONF:
    "Some inputs are outside the model’s normal operating window, so this prediction is less reliable.",
  WEATHER:
    "Most of the change appears to come from ambient conditions (AT/AP/AH), not from turbine settings.",
  FILTER_DRIVER:
    "Filter loading (AFDP) is a key NOx driver in this scenario. Keeping AFDP on the lower side of the range helps limit NOx spikes.",
  TEMP_DRIVER:
    "Combustor temperatures (TIT/TAT) are an important NOx driver right now.",
  LOAD_DRIVER:
    "High load (GTEP/TEY) is contributing to higher NOx. Near peak load, even clean machines run hotter on emissions.",
  AIRFLOW_DRIVER:
    "Overall airflow (CDP/AFDP) is affecting NOx. Healthy compressor and inlet conditions support cleaner combustion.",
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

  const modelLabels: Record<EvaluationState["activeModel"], string> = {
    full: "Full Model (All Loads)",
    "130_136": "130–136 TEY Band Model",
    "160p": "160+ TEY Band Model",
  };

  const isHighLoadBand = activeModel === "160p";

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

  // Use histMinMax as recommended min/max envelope
  Object.keys(payload).forEach((key) => {
    const stats = histMinMax[key];
    if (stats) {
      if (payload[key] < stats.min || payload[key] > stats.max) {
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
      (state.siteLimitNOx !== null && prediction > state.siteLimitNOx)
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

  // Band mismatch based on TEY vs active model
  const tey = payload.TEY;
  if (
    (activeModel === "130_136" && (tey < 130 || tey > 136)) ||
    (activeModel === "160p" && tey < 160)
  ) {
    triggered.push(REC_LIBRARY.BAND_MISMATCH);
  }

  // Guard: stats per variable from histMinMax / bandMedians
  const afdpStats = histMinMax["AFDP"];
  const titStats = histMinMax["TIT"];
  const tatStats = histMinMax["TAT"];
  const cdpMedian = bandMedians.CDP;
  const gtepMedian = bandMedians.GTEP;

  // Basic levers:
  // AFDP high = above upper recommended range for this band
  const afdpHigh =
    afdpStats !== undefined && payload.AFDP > afdpStats.max;

  // TIT high: only meaningful when we are NOT already at the control limit band
  const titMedian = bandMedians.TIT;
  const titHigh =
    !isHighLoadBand && titMedian !== undefined &&
    payload.TIT > titMedian * 1.03;

  // TAT high: above recommended max (use stats if available, else median-based)
  let tatHigh = false;
  if (tatStats) {
    tatHigh = payload.TAT > tatStats.max;
  } else if (bandMedians.TAT !== undefined) {
    tatHigh = payload.TAT > bandMedians.TAT * 1.02;
  }

  // CDP off: significant deviation from band median (load/airflow issue)
  const cdpOff =
    cdpMedian !== undefined &&
    Math.abs(payload.CDP - cdpMedian) > 0.05 * cdpMedian;

  // GTEP very high: substantially above median → near peak load for that band
  const gtepHigh =
    gtepMedian !== undefined &&
    payload.GTEP > gtepMedian * 1.05;

  // High humidity
  const ahHigh = payload.AH > 80;

  // --- Single-driver checks ---

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
    triggered.push(REC_LIBRARY.GTEP_VERY_HIGH);
    advisory.push(ADV_LIBRARY.LOAD_DRIVER);
  }

  if (ahHigh) {
    triggered.push(REC_LIBRARY.AH_HIGH);
  }

  // --- Band-specific nuance: at 160+ AFDP matters even more for NOx ---
  if (isHighLoadBand && afdpHigh && NOxUp) {
    triggered.push(
      "At full load, loaded filters push NOx up more strongly. Keeping AFDP closer to the low end of the 160+ range is especially important."
    );
  }

  // Simplified interaction rules

  // AFDP × AT: filter impact worse on hot days
  if (
    afdpHigh &&
    previousPayload &&
    bandMedians.AT !== undefined &&
    payload.AT > bandMedians.AT * 1.1
  ) {
    triggered.push(
      "Hot day with a loaded filter. Reducing AFDP via filter maintenance can give a clear NOx benefit."
    );
  }

  // GTEP × AFDP: both inlet and load are stressing the machine
  if (gtepHigh && afdpHigh) {
    triggered.push(
      "You are at high load with a loaded filter. Inspect inlet filters and consider a small load reduction if emissions margin is tight."
    );
  }

  // TIT × TAT: combustion imbalance
  if (titHigh && tatHigh) {
    triggered.push(
      "Combustor temperatures are high and exhaust is hot. Re-check fuel distribution between burners for balance."
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
    finalAdvisory.push("Operating close to normal for this load band and ambient conditions.");
  }
  if (finalRecs.length === 0) {
    finalRecs.push("Operating within the recommended range. No tuning action suggested.");
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