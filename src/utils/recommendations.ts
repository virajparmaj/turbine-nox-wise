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

// ----------------------------------------------------------------------
// USER-FRIENDLY RECOMMENDATION LIBRARY (PLAIN ENGLISH, NO JARGON)
// ----------------------------------------------------------------------

const REC_LIBRARY = {
  // Fine-tuning levers (adjustable)
  AFDP_HIGH: "Air filter may be clogged. Clean or replace the filter.",
  TIT_HIGH: "Firing temperature is high. Lower TIT slightly.",
  TAT_RISING: "Hot exhaust readings. Re-check how evenly fuel is being shared.",
  CDP_OFF: "Airflow not normal. Inspect for dirt, leaks, or stuck guide vanes.",
  GTEP_HIGH: "Exhaust path may be blocked. Check outlet/duct for restriction.",
  AH_HIGH: "Humid weather increases NOx. If using water/steam injection, verify settings.",

  // Non-tuning messages
  OUT_OF_RANGE: "Inputs outside the model’s usual range. Results may be unreliable.",
  BAND_MISMATCH: "Machine not in this load band. Switch to the matching model.",
  LARGE_JUMP: "A big NOx jump happened with very small changes. Check sensors.",
  WEATHER_ONLY: "Change mainly due to weather. Tuning may not help.",
  MULTIPLE_DRIVERS: "Several issues at once. Adjust one thing at a time.",
  PRIORITY_ORDER: "Fix order: Air filter → TIT/TAT → Exhaust path → Airflow.",
};

// Small utility
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

  // Compute NOx delta %
  const ref = baselineNOx ?? previousPrediction;
  const deltaPctVsPrev = ref ? (100 * (prediction - ref)) / ref : null;

  // Risk level
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
    }
  }

  // ----------------------------------------------------------------------
  // RECOMMENDATION LOGIC (Fully simplified + interaction-aware)
  // ----------------------------------------------------------------------

  const triggered: string[] = [];
  const NOxUp = deltaPctVsPrev !== null && deltaPctVsPrev > 0;

  // Range check
  if (outOfRange) triggered.push(REC_LIBRARY.OUT_OF_RANGE);

  // Load-band model mismatch
  if (
    (activeModel === "130_136" && (payload.TEY < 130 || payload.TEY > 136)) ||
    (activeModel === "160p" && payload.TEY < 160)
  ) {
    triggered.push(REC_LIBRARY.BAND_MISMATCH);
  }

  // ----------------------------
  // Basic fine-tuning levers
  // ----------------------------

  // Air filter / inlet restriction
  if (payload.AFDP > bandMedians.AFDP * 1.05) {
    triggered.push(REC_LIBRARY.AFDP_HIGH);
  }

  // High firing temperature
  if (payload.TIT > bandMedians.TIT * 1.03) {
    triggered.push(REC_LIBRARY.TIT_HIGH);
  }

  // Uneven hot exhaust
  if (payload.TAT > bandMedians.TAT * 1.03) {
    triggered.push(REC_LIBRARY.TAT_RISING);
  }

  // Reduced airflow efficiency
  if (Math.abs(payload.CDP - bandMedians.CDP) > 0.05 * bandMedians.CDP) {
    triggered.push(REC_LIBRARY.CDP_OFF);
  }

  // Exhaust blockage
  if (payload.GTEP > bandMedians.GTEP * 1.05) {
    triggered.push(REC_LIBRARY.GTEP_HIGH);
  }

  // High humidity effect
  if (payload.AH > 80) {
    triggered.push(REC_LIBRARY.AH_HIGH);
  }

  // ----------------------------
  // Simplified interaction rules
  // ----------------------------

  // AFDP × AT → filter feels "worse" on hot days
  if (
    payload.AFDP > bandMedians.AFDP * 1.05 &&
    payload.AT > bandMedians.AT * 1.10
  ) {
    triggered.push("Hot air + clogged filter → stronger restriction. Check filter.");
  }

  // GTEP × AFDP → both inlet and outlet restricted
  if (
    payload.GTEP > bandMedians.GTEP * 1.04 &&
    payload.AFDP > bandMedians.AFDP * 1.04
  ) {
    triggered.push("Both air entry and exhaust seem restricted. Inspect both paths.");
  }

  // TIT × TAT → combustion imbalance
  if (
    payload.TIT > bandMedians.TIT * 1.03 &&
    payload.TAT > bandMedians.TAT * 1.03
  ) {
    triggered.push("Temperatures uneven. Re-check fuel distribution.");
  }

  // Ambient-driven only
  const ambientOnly =
    previousPayload &&
    Math.abs(pctDiff(payload.AT, previousPayload.AT)) > 0.05 &&
    Math.abs(pctDiff(payload.TIT, previousPayload.TIT)) < 0.02 &&
    Math.abs(pctDiff(payload.TAT, previousPayload.TAT)) < 0.02;

  if (ambientOnly) triggered.push(REC_LIBRARY.WEATHER_ONLY);

  // Big jump with tiny changes → likely sensor issue
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

  // If many issues → advise slow tuning
  if (triggered.length >= 3) triggered.push(REC_LIBRARY.MULTIPLE_DRIVERS);
  if (triggered.length >= 2) triggered.push(REC_LIBRARY.PRIORITY_ORDER);

  // Limit to 5 for UI
  const finalRecs = triggered.slice(0, 5);
  if (finalRecs.length === 0) finalRecs.push("Operating within normal limits.");

  // Build “what changed” panel
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
    recs: finalRecs,
    diffs,
  };
}