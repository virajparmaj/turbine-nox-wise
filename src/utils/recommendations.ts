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
   * histMinMax holds the recommended operating min/max per band (from JSON),
   * not raw historical extremes.
   *
   * Example for the active band:
   *   histMinMax = {
   *     TIT: { min: 1054, max: 1100 },
   *     TAT: { min: 533, max: 550 },
   *     CDP: { min: 10.4, max: 12.2 },
   *     GTEP:{ min: 19.4, max: 26.2 },
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
  // Fine-tuning / condition checks
  AFDP_HIGH_PERF:
    "Filters are more loaded than usual. Plan cleaning; small NOx impact.",
  AFDP_TOO_CLEAN_COLD:
    "Filters are very clean on a cold day. Dense air flows too easily, so NOx runs higher.",
  TIT_HIGH:
    "Firing temperature is higher than normal. Only large shifts need attention.",
  TAT_RISING:
    "Exhaust temperature is rising. Check burner balance or fuel split.",
  CDP_OFF:
    "Pressure after the compressor looks unusual. Check for fouling or leaks.",
  AH_HIGH:
    "Air is very humid. If water or steam is used, make sure settings match conditions.",

  // Weather context
  COLD_DAY:
    "Cold day. Dense air makes NOx naturally higher even with normal settings.",
  WARM_DAY:
    "Warm day. NOx usually runs lower, and tuning is more forgiving.",
  TIT_LIMITED_COLD:
    "On cold days TIT is already near its limit. Small changes won’t reduce NOx much.",

  // Safety / non-tuning messages
  OUT_OF_RANGE:
    "One or more inputs are outside normal ranges. Be cautious with this prediction.",
  BAND_MISMATCH:
    "Load does not match this model. Switch to the correct band.",
  LARGE_JUMP:
    "NOx changed a lot while settings stayed the same. Check sensors or recent moves.",
  WEATHER_ONLY:
    "Change in NOx is mainly from weather, not from settings.",
  MULTIPLE_DRIVERS:
    "Several factors active together. Change one thing at a time.",
  PRIORITY_ORDER:
    "Suggested order: watch cold days → avoid ultra-clean filters on cold days → stay in recommended ranges → then adjust other settings.",
};

const ADV_LIBRARY = {
  NOX_UP:
    "NOx is higher than your usual reference under similar conditions.",
  NOX_DOWN:
    "NOx is lower than your usual reference under similar conditions.",
  RISK_HIGH:
    "High chance of nearing or crossing your NOx limit. Tune slowly.",
  RISK_WATCH:
    "Noticeable NOx change. Make small moves and watch the trend.",
  LOW_CONF:
    "Some inputs are outside the normal range, so this prediction is less certain.",
  WEATHER:
    "NOx here is mainly driven by weather, not by your settings.",
  FILTER_DRIVER:
    "On cold days, very clean filters increase airflow and can raise NOx.",
  TEMP_DRIVER:
    "Temperatures are usually at their limit, so only large shifts affect NOx.",
  LOAD_DRIVER:
    "Load has only a small effect on NOx. Adjust mainly for power needs.",
  AIRFLOW_DRIVER:
    "Airflow is influencing NOx, but cold, dense air is the main factor.",
};

// Utility
function pctDiff(v: number, base: number) {
  return (v - base) / base;
}

function bumpRiskUp(risk: RiskLevel, steps = 1): RiskLevel {
  if (risk === "Low confidence") return risk;
  const ladder: RiskLevel[] = ["Normal", "Watch", "High"];
  const idx = ladder.indexOf(risk);
  if (idx === -1) return risk;
  const newIdx = Math.min(idx + steps, ladder.length - 1);
  return ladder[newIdx];
}

function bumpRiskDown(risk: RiskLevel, steps = 1): RiskLevel {
  if (risk === "Low confidence") return risk;
  const ladder: RiskLevel[] = ["Normal", "Watch", "High"];
  const idx = ladder.indexOf(risk);
  if (idx === -1) return risk;
  const newIdx = Math.max(idx - steps, 0);
  return ladder[newIdx];
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

  const at = payload.AT;
  const afdpCurrent = payload.AFDP;
  const titCurrent = payload.TIT;

  // Simple thresholds from study
  const COLD_AT = 15;       // °C
  const VERY_COLD_AT = 12;  // °C
  const WARM_AT = 20;       // °C
  const AFDP_TOO_CLEAN = 3.2;
  const AFDP_TOO_LOADED = 4.5;

  // -----------------------------
  // 1) Change in NOx vs reference
  // -----------------------------
  const ref = baselineNOx ?? previousPrediction;
  const deltaPctVsPrev = ref ? (100 * (prediction - ref)) / ref : null;

  // -----------------------------
  // 2) Base risk level
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
  // 2a) Risk tweaks from ambient rules
  // -----------------------------
  if (typeof at === "number") {
    // Rule 2: very cold day → bump by 2 levels
    if (at < VERY_COLD_AT) {
      risk = bumpRiskUp(risk, 2);
    } else if (at < COLD_AT) {
      // Rule 1/2: cold day → bump at least one level
      risk = bumpRiskUp(risk, 1);
    } else if (at > WARM_AT) {
      // Rule 5: warm day → one level lower risk
      risk = bumpRiskDown(risk, 1);
    }
  }

  if (typeof at === "number" && typeof afdpCurrent === "number") {
    // Rule 1: cold + very clean filter → extra push toward High risk
    if (at < COLD_AT && afdpCurrent < AFDP_TOO_CLEAN) {
      risk = bumpRiskUp(risk, 1);
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

  // AFDP high (performance), not primary NOx driver
  const afdpHigh =
    afdpStats !== undefined && payload.AFDP > afdpStats.max;

  // TIT high: only meaningful when NOT at the control-limit band
  const titMedian = bandMedians.TIT;
  const titHigh =
    !isHighLoadBand &&
    titMedian !== undefined &&
    payload.TIT > titMedian * 1.03;

  // TAT high: above recommended max (or median-based)
  let tatHigh = false;
  if (tatStats) {
    tatHigh = payload.TAT > tatStats.max;
  } else if (bandMedians.TAT !== undefined) {
    tatHigh = payload.TAT > bandMedians.TAT * 1.02;
  }

  // CDP off: significant deviation from band median
  const cdpOff =
    cdpMedian !== undefined &&
    Math.abs(payload.CDP - cdpMedian) > 0.05 * cdpMedian;

  // We keep gtepMedian for completeness but do not treat high load as a NOx driver
  const gtepHigh =
    gtepMedian !== undefined &&
    payload.GTEP > gtepMedian * 1.10; // unused, but harmless

  const ahHigh = payload.AH > 80;

  // --- Single-driver checks ---

  // Ambient context first
  if (typeof at === "number") {
    if (at < COLD_AT) {
      triggered.push(REC_LIBRARY.COLD_DAY);
      advisory.push(ADV_LIBRARY.WEATHER);
    } else if (at > WARM_AT) {
      triggered.push(REC_LIBRARY.WARM_DAY);
    }
  }

  // Very cold + TIT near recommended max → limited tuning options
  if (
    typeof at === "number" &&
    at < COLD_AT &&
    titStats &&
    typeof titCurrent === "number" &&
    titCurrent > titStats.max * 0.99
  ) {
    triggered.push(REC_LIBRARY.TIT_LIMITED_COLD);
  }

  // Cold + very clean filter (low AFDP) → NOx risk
  if (
    typeof at === "number" &&
    typeof afdpCurrent === "number" &&
    at < COLD_AT &&
    afdpCurrent < AFDP_TOO_CLEAN
  ) {
    triggered.push(REC_LIBRARY.AFDP_TOO_CLEAN_COLD);
    if (NOxUp) advisory.push(ADV_LIBRARY.FILTER_DRIVER);
  }

  // High AFDP → performance warning, not primarily emissions
  if (typeof afdpCurrent === "number" && afdpCurrent > AFDP_TOO_LOADED) {
    triggered.push(REC_LIBRARY.AFDP_HIGH_PERF);
  } else if (afdpHigh) {
    triggered.push(REC_LIBRARY.AFDP_HIGH_PERF);
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

  if (ahHigh) {
    triggered.push(REC_LIBRARY.AH_HIGH);
  }

  // --- Ambient-only change relative to previous point ---
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
  if (
    previousPayload &&
    deltaPctVsPrev !== null &&
    Math.abs(deltaPctVsPrev) > 10
  ) {
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
    finalAdvisory.push(
      "Operating close to normal for this load band and ambient conditions."
    );
  }
  if (finalRecs.length === 0) {
    finalRecs.push(
      "Operating within the recommended range. No tuning action suggested."
    );
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