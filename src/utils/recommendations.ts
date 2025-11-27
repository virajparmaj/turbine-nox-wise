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

// Short recommendation library (cleaner, UI-friendly)
const REC_LIBRARY = {
  AFDP_HIGH: "Inlet filters may be restrictive. Inspect/clean/replace.",
  TIT_HIGH: "Reduce TIT a step; re-balance fuel–air.",
  TAT_RISING: "TAT rising. Check combustor spread and trims.",
  CDP_OFF: "CDP off trend. Inspect IGVs/bleeds; check compressor fouling.",
  GTEP_HIGH: "High exhaust pressure. Inspect stack/silencers.",
  AT_EXTREME: "High ambient heat. Small TIT/TAT trim may help.",
  AP_LOW: "Low atmospheric pressure. Expect small drift in flow.",
  AH_HIGH: "Very high humidity. Verify water/steam injection if active.",
  BAND_MISMATCH: "Load not in model band. Switch band model.",
  LARGE_JUMP: "Large NOx jump. Undo last change and recheck sensors.",
  SENSOR_OUTLIER: "Possible bad sensor input. Do not tune on outliers.",
  POST_MAINTENANCE: "Post-maintenance change. Re-run and compare.",
  MULTIPLE_DRIVERS: "Several drivers active. Change one lever at a time.",
  OUT_OF_RANGE: "Inputs outside training envelope. Low confidence result.",
  WEATHER_ONLY: "Weather-driven change. Consider scheduling vs tuning.",
  AFDP_NOX_UP: "High AFDP with NOx rise. Check pre-filters/inlet leaks.",
  NOX_DOWN_CO_UP: "NOx down but CO up. Possibly too lean.",
  PRIORITY_ORDER:
    "Work order: AFDP → TIT/TAT → GTEP → CDP (highest leverage first).",
};

// Interaction-aware helper checks
function pctDiff(v: number, base: number) {
  return (v - base) / base;
}

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

  // Delta %
  const ref = baselineNOx ?? previousPrediction;
  const deltaPctVsPrev = ref ? (100 * (prediction - ref)) / ref : null;

  // Risk computation
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
    if (deltaPctVsPrev > 15 || (state.siteLimitNOx && prediction > state.siteLimitNOx)) {
      risk = "High";
    } else if (abs > 5 && abs <= 15) {
      risk = "Watch";
    } else {
      risk = "Normal";
    }
  }

  // ------------------------------
  // Generate Recommendations
  // ------------------------------
  const triggered: string[] = [];
  const incNOx = deltaPctVsPrev !== null && deltaPctVsPrev > 0;

  // Out of range
  if (outOfRange) triggered.push(REC_LIBRARY.OUT_OF_RANGE);

  // Band mismatch
  if (
    (activeModel === "130_136" && (payload.TEY < 130 || payload.TEY > 136)) ||
    (activeModel === "160p" && payload.TEY < 160)
  ) {
    triggered.push(REC_LIBRARY.BAND_MISMATCH);
  }

  // Baseline rules (simple)
  if (payload.AFDP > bandMedians.AFDP * 1.05) {
    triggered.push(REC_LIBRARY.AFDP_HIGH);
    if (incNOx) triggered.push(REC_LIBRARY.AFDP_NOX_UP);
  }

  if (payload.TIT > bandMedians.TIT * 1.03)
    triggered.push(REC_LIBRARY.TIT_HIGH);

  if (payload.TAT > bandMedians.TAT * 1.03)
    triggered.push(REC_LIBRARY.TAT_RISING);

  if (Math.abs(payload.CDP - bandMedians.CDP) > 0.05 * bandMedians.CDP)
    triggered.push(REC_LIBRARY.CDP_OFF);

  if (payload.GTEP > bandMedians.GTEP * 1.05)
    triggered.push(REC_LIBRARY.GTEP_HIGH);

  if (payload.AH > 80) triggered.push(REC_LIBRARY.AH_HIGH);

  // ------------------------------------
  // Interaction-aware rules (NEW)
  // ------------------------------------

  // (1) TAT × AT → combustion instability when hot
  if (
    payload.TAT >
    bandMedians.TAT * (1 + 0.02 * (payload.AT / bandMedians.AT))
  ) {
    triggered.push("High TAT amplified by high ambient. Check trims.");
  }

  // (2) AFDP × AT → inlet restriction worse in heat
  if (
    payload.AFDP >
    bandMedians.AFDP * (1 + 0.03 * (payload.AT / bandMedians.AT))
  ) {
    triggered.push("AFDP elevated due to heat. Inspect inlet filters.");
  }

  // (3) GTEP × AFDP → back-pressure + inlet restriction combo
  if (
    payload.GTEP > bandMedians.GTEP * 1.04 &&
    payload.AFDP > bandMedians.AFDP * 1.04
  ) {
    triggered.push(
      "Back-pressure + inlet ΔP high. Check stack and inlet path together."
    );
  }

  // (4) AT × TEY → high load during hot ambient
  if (
    payload.TEY > bandMedians.TEY * 1.03 &&
    payload.AT > bandMedians.AT * 1.1
  ) {
    triggered.push("High load during hot ambient. Small TIT trim may help.");
  }

  // (5) AT × AP → low AP + heat reduces compressor flow
  if (
    payload.AT > bandMedians.AT * 1.12 &&
    payload.AP < bandMedians.AP * 0.95
  ) {
    triggered.push("Hot + low pressure day. Expect reduced airflow.");
  }

  // (6) CDP × AFDP → compressor under strain
  if (
    payload.CDP < bandMedians.CDP * 0.97 &&
    payload.AFDP > bandMedians.AFDP * 1.05
  ) {
    triggered.push("CDP sag with high AFDP. Possible inlet restriction.");
  }

  // (7) TIT × TAT → combustion imbalance
  if (
    payload.TIT > bandMedians.TIT * 1.03 &&
    payload.TAT > bandMedians.TAT * 1.03
  ) {
    triggered.push("TIT and TAT both high. Re-check fuel split.");
  }

  // Ambient-only shifts
  const ambientOnly =
    previousPayload &&
    Math.abs(pctDiff(payload.AT, previousPayload.AT)) > 0.05 &&
    Math.abs(pctDiff(payload.TIT, previousPayload.TIT)) < 0.02 &&
    Math.abs(pctDiff(payload.TAT, previousPayload.TAT)) < 0.02;

  if (ambientOnly) triggered.push(REC_LIBRARY.WEATHER_ONLY);

  // Large jump
  if (previousPayload && deltaPctVsPrev !== null && Math.abs(deltaPctVsPrev) > 10) {
    let total = 0;
    let count = 0;
    Object.keys(payload).forEach((key) => {
      if (previousPayload[key] !== undefined) {
        const ch = Math.abs(pctDiff(payload[key], previousPayload[key]));
        total += ch;
        count++;
      }
    });
    if (count > 0 && total / count < 0.02) triggered.push(REC_LIBRARY.LARGE_JUMP);
  }

  // Multiple drivers = stabilizing message
  if (triggered.length >= 3) triggered.push(REC_LIBRARY.MULTIPLE_DRIVERS);

  // Priority order
  if (triggered.length >= 2) triggered.push(REC_LIBRARY.PRIORITY_ORDER);

  // Cap at 5 recs
  const finalRecs = triggered.slice(0, 5);

  if (finalRecs.length === 0)
    finalRecs.push("Operating within normal limits.");

  // Diffs
  const diffs: DiffItem[] = [];
  if (previousPayload) {
    Object.keys(payload).forEach((key) => {
      if (previousPayload[key] !== undefined) {
        const pct = pctDiff(payload[key], previousPayload[key]) * 100;
        if (Math.abs(pct) >= 1)
          diffs.push({
            name: key,
            old: previousPayload[key],
            new: payload[key],
            pct,
          });
      }
    });
    diffs.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  }

  return {
    modelLabel: modelLabels[activeModel],
    predictedNOx: prediction,
    deltaPctVsPrev,
    risk,
    recs: finalRecs,
    diffs,
  };
}