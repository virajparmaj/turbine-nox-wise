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
  recs: string[];
  diffs: DiffItem[];
}

interface EvaluationState {
  activeModel: 'full' | '130_136' | '160p';
  payload: Record<string, number>;
  prediction: number;
  previousPrediction: number | null;
  previousPayload: Record<string, number> | null;
  siteLimitNOx: number | null;
  baselineNOx: number | null;
  histMinMax: Record<string, { min: number; max: number }>;
  bandMedians: Record<string, number>;
}

// Short recommendation library
const REC_LIBRARY = {
  AFDP_HIGH: "Inspect/clean/replace filters. Keep AFDP in the green band.",
  TIT_HIGH: "Reduce firing temperature a step. Re-balance fuel–air.",
  TAT_RISING: "Check combustion spread and temp trims.",
  CDP_OFF: "Check IGVs/bleeds; clean compressor; fix leaks.",
  GTEP_HIGH: "Inspect stack/ducts/silencers; remove back-pressure.",
  AT_EXTREME: "Retime run or do small TIT/TAT retune for ambient.",
  AP_LOW: "Expect small drift; focus on airflow health.",
  AH_HIGH: "Verify water/steam injection setpoints if used.",
  BAND_MISMATCH: "Switch to the correct model for this load band.",
  LARGE_JUMP: "Undo last change; recheck sensors.",
  SENSOR_OUTLIER: "Flag instrumentation; don't tune on bad data.",
  POST_MAINTENANCE: "Re-run prediction and log NOx vs previous.",
  PRIORITY_LEVERS: "Work order: AFDP → TIT/TAT → GTEP → CDP.",
  MULTIPLE_DRIVERS: "Change one lever at a time; wait to stabilize.",
  OUT_OF_RANGE: "Return inputs to normal range before tuning.",
  WEATHER_ONLY: "Prefer scheduling over tuning.",
  AFDP_NOX_UP: "Check pre-filters/inlet leaks; verify ΔP transmitters.",
  NOX_DOWN_CO_UP: "You're too lean; step back toward previous mix."
};

export function renderRecommendations(state: EvaluationState): RecommendationResult {
  const { activeModel, payload, prediction, previousPrediction, previousPayload, baselineNOx, histMinMax, bandMedians } = state;
  
  const modelLabels = {
    full: 'Full Model (All Data)',
    '130_136': '130–136 Band Model',
    '160p': '160+ Band Model'
  };

  // Calculate delta percentage
  const ref = baselineNOx ?? previousPrediction;
  const deltaPctVsPrev = ref ? (100 * (prediction - ref) / ref) : null;

  // Determine risk level
  let risk: RiskLevel = "Normal";
  let outOfRange = false;

  // Check if any input is outside training range
  Object.keys(payload).forEach(key => {
    if (histMinMax[key]) {
      if (payload[key] < histMinMax[key].min || payload[key] > histMinMax[key].max) {
        outOfRange = true;
      }
    }
  });

  if (outOfRange) {
    risk = "Low confidence";
  } else if (deltaPctVsPrev !== null) {
    const absDelta = Math.abs(deltaPctVsPrev);
    if (deltaPctVsPrev > 15 || (state.siteLimitNOx && prediction > state.siteLimitNOx)) {
      risk = "High";
    } else if (absDelta > 5 && absDelta <= 15) {
      risk = "Watch";
    } else if (absDelta <= 5 && (!state.siteLimitNOx || prediction < state.siteLimitNOx)) {
      risk = "Normal";
    }
  }

  // Generate recommendations
  const triggered: string[] = [];
  let noxIncreasing = deltaPctVsPrev !== null && deltaPctVsPrev > 0;

  // Rule: Out of range (highest priority)
  if (outOfRange) {
    triggered.push(REC_LIBRARY.OUT_OF_RANGE);
  }

  // Rule: Band mismatch
  if (activeModel === '130_136' && (payload.TEY < 130 || payload.TEY > 136)) {
    triggered.push(REC_LIBRARY.BAND_MISMATCH);
  } else if (activeModel === '160p' && payload.TEY < 160) {
    triggered.push(REC_LIBRARY.BAND_MISMATCH);
  }

  // Rule: AFDP high
  const afdpHigh = payload.AFDP > bandMedians.AFDP * 1.05;
  if (afdpHigh) {
    triggered.push(REC_LIBRARY.AFDP_HIGH);
    if (noxIncreasing) {
      triggered.push(REC_LIBRARY.AFDP_NOX_UP);
    }
  }

  // Rule: TIT high
  if (payload.TIT > bandMedians.TIT * 1.03) {
    triggered.push(REC_LIBRARY.TIT_HIGH);
  }

  // Rule: TAT rising
  if (payload.TAT > bandMedians.TAT * 1.03) {
    triggered.push(REC_LIBRARY.TAT_RISING);
  }

  // Rule: CDP off-trend
  if (Math.abs(payload.CDP - bandMedians.CDP) > 0.05 * bandMedians.CDP) {
    triggered.push(REC_LIBRARY.CDP_OFF);
  }

  // Rule: GTEP high
  if (payload.GTEP > bandMedians.GTEP * 1.05) {
    triggered.push(REC_LIBRARY.GTEP_HIGH);
  }

  // Rule: Large NOx jump with small input change
  if (previousPayload && deltaPctVsPrev !== null && Math.abs(deltaPctVsPrev) > 10) {
    let totalInputChange = 0;
    let count = 0;
    Object.keys(payload).forEach(key => {
      if (previousPayload[key] !== undefined) {
        const pctChange = Math.abs((payload[key] - previousPayload[key]) / previousPayload[key]);
        totalInputChange += pctChange;
        count++;
      }
    });
    const avgInputChange = count > 0 ? totalInputChange / count : 0;
    if (avgInputChange < 0.02) {
      triggered.push(REC_LIBRARY.LARGE_JUMP);
    }
  }

  // Rule: Ambient extremes (only AT/AP/AH changes)
  const ambientOnly = previousPayload && 
    Math.abs(payload.AT - previousPayload.AT) / previousPayload.AT > 0.05 &&
    Math.abs(payload.TIT - previousPayload.TIT) / previousPayload.TIT < 0.02 &&
    Math.abs(payload.TAT - previousPayload.TAT) / previousPayload.TAT < 0.02;

  if (ambientOnly) {
    triggered.push(REC_LIBRARY.WEATHER_ONLY);
  } else if (Math.abs(payload.AT - bandMedians.AT) > bandMedians.AT * 0.15) {
    triggered.push(REC_LIBRARY.AT_EXTREME);
  }

  // Rule: AH high
  if (payload.AH > 80) {
    triggered.push(REC_LIBRARY.AH_HIGH);
  }

  // Rule: Multiple drivers
  if (triggered.length >= 3) {
    triggered.push(REC_LIBRARY.MULTIPLE_DRIVERS);
  }

  // Add priority guidance if multiple issues
  if (triggered.length >= 2) {
    triggered.push(REC_LIBRARY.PRIORITY_LEVERS);
  }

  // Cap to 5 recommendations by priority
  const finalRecs = triggered.slice(0, 5);

  // If no recommendations, default message
  if (finalRecs.length === 0) {
    finalRecs.push("Operating within normal limits.");
  }

  // Calculate diffs (What Changed)
  const diffs: DiffItem[] = [];
  if (previousPayload) {
    Object.keys(payload).forEach(key => {
      if (previousPayload[key] !== undefined) {
        const pctChange = ((payload[key] - previousPayload[key]) / previousPayload[key]) * 100;
        if (Math.abs(pctChange) >= 1) {
          diffs.push({
            name: key,
            old: previousPayload[key],
            new: payload[key],
            pct: pctChange
          });
        }
      }
    });
    // Sort by absolute percentage change
    diffs.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  }

  return {
    modelLabel: modelLabels[activeModel],
    predictedNOx: prediction,
    deltaPctVsPrev,
    risk,
    recs: finalRecs,
    diffs
  };
}
