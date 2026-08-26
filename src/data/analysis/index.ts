import eventProfileCsv from "./chart-01-transient-event-profile.csv?raw";
import thresholdScanCsv from "./chart-01-tit-threshold-scan.csv?raw";
import scatterSampleCsv from "./chart-02-nox-co-scatter-sample.csv?raw";
import regimeCorrelationsCsv from "./chart-02-regime-correlations.csv?raw";
import weatherSensitivityCsv from "./chart-03-weather-sensitivity-by-load.csv?raw";
import coldWarmCsv from "./chart-03-cold-vs-warm.csv?raw";
import monthlyTrendCsv from "./chart-04-monthly-nox-trend.csv?raw";
import yearComparisonCsv from "./chart-04-year-comparison.csv?raw";
import exceedanceByYearCsv from "./chart-04-exceedance-by-year.csv?raw";
import validationComparisonCsv from "./chart-05-validation-comparison.csv?raw";
import recalibrationEffectCsv from "./chart-05-recalibration-effect.csv?raw";
import humiditySlopesCsv from "./chart-06-humidity-slopes.csv?raw";
import headlineMetricsJson from "./headline-metrics.json";

export type Regime = "part_load" | "transition" | "normal" | "high_fire";

export interface HeadlineMetric {
  id: string;
  value: string;
  label: string;
  detail: string;
  supports_insight: number;
}

export interface EventProfilePoint {
  hours_from_onset: number;
  nox_ppm: number;
  co_ppm: number;
  tit_c: number;
  tey_mw: number;
}

export interface ThresholdPoint {
  tit_cutoff_c: number;
  share_of_hours_pct: number;
  share_of_worst_nox_hours_pct: number;
  risk_lift: number;
}

export interface ScatterPoint {
  co_ppm: number;
  nox_detrended_ppm: number;
  tit_c: number;
  tey_mw: number;
  regime: Regime;
}

export interface RegimeCorrelation {
  regime: Regime;
  regime_label: string;
  tit_range: string;
  n_hours: number;
  share_of_hours_pct: number;
  spearman_co_vs_nox: number;
  median_co_ppm: number;
  median_nox_ppm: number;
}

export interface WeatherSensitivityPoint {
  load_band_mw: string;
  load_band_midpoint_mw: number;
  n_hours: number;
  nox_ppm_per_degc: number;
  ci95_low: number;
  ci95_high: number;
  ci_error: [number, number];
  crosses_zero: boolean;
}

export interface ColdWarmPoint {
  group: string;
  at_bound_c: number;
  mean_nox_ppm: number;
  median_nox_ppm: number;
  p95_nox_ppm: number;
  exceedance_rate_pct: number;
  n_hours: number;
}

export interface MonthlyTrendPoint {
  start_hour: number;
  mid_hour: number;
  median_nox_ppm: number;
  q25_nox_ppm: number;
  q75_nox_ppm: number;
  mean_co_ppm: number;
  mean_at_c: number;
  mean_tey_mw: number;
  n_hours: number;
  period_index: number;
  year: number;
  iqr: [number, number];
}

export type ComparisonCategory = "setpoint" | "process" | "ambient" | "outcome";

export interface YearComparisonPoint {
  variable: string;
  unit: string;
  category: ComparisonCategory;
  year_1: number;
  year_2: number;
  pct_change: number;
}

export interface ExceedanceByYearPoint {
  metric: string;
  year_1: number;
  year_2: number;
  unit: string;
}

export interface ValidationPoint {
  scheme: string;
  detail: string;
  r2: number;
  honest: boolean;
  order: number;
}

export interface RecalibrationPoint {
  condition: string;
  mae_ppm: number;
  bias_ppm: number;
}

export interface HumiditySlopePoint {
  at_band: string;
  n_hours: number;
  slope_temperature_split_only: number;
  slope_fully_adjusted: number;
}

const splitCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current);
  return values;
};

const parseRows = (source: string) => {
  const [headerLine, ...lines] = source.trim().split(/\r?\n/);
  const headers = splitCsvLine(headerLine);

  return lines.map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index];
      return row;
    }, {});
  });
};

const number = (value: string) => Number.parseFloat(value);

export const headlineMetrics = headlineMetricsJson as HeadlineMetric[];

export const eventProfile: EventProfilePoint[] = parseRows(eventProfileCsv).map((row) => ({
  hours_from_onset: number(row.hours_from_onset),
  nox_ppm: number(row.nox_ppm),
  co_ppm: number(row.co_ppm),
  tit_c: number(row.tit_c),
  tey_mw: number(row.tey_mw),
}));

export const thresholdScan: ThresholdPoint[] = parseRows(thresholdScanCsv).map((row) => ({
  tit_cutoff_c: number(row.tit_cutoff_c),
  share_of_hours_pct: number(row.share_of_hours_pct),
  share_of_worst_nox_hours_pct: number(row.share_of_worst_nox_hours_pct),
  risk_lift: number(row.risk_lift),
}));

export const scatterSample: ScatterPoint[] = parseRows(scatterSampleCsv).map((row) => ({
  co_ppm: number(row.co_ppm),
  nox_detrended_ppm: number(row.nox_detrended_ppm),
  tit_c: number(row.tit_c),
  tey_mw: number(row.tey_mw),
  regime: row.regime as Regime,
}));

export const regimeCorrelations: RegimeCorrelation[] = parseRows(regimeCorrelationsCsv).map((row) => ({
  regime: row.regime as Regime,
  regime_label: row.regime_label,
  tit_range: row.tit_range,
  n_hours: number(row.n_hours),
  share_of_hours_pct: number(row.share_of_hours_pct),
  spearman_co_vs_nox: number(row.spearman_co_vs_nox),
  median_co_ppm: number(row.median_co_ppm),
  median_nox_ppm: number(row.median_nox_ppm),
}));

export const weatherSensitivity: WeatherSensitivityPoint[] = parseRows(weatherSensitivityCsv).map((row) => {
  const slope = number(row.nox_ppm_per_degc);
  const low = number(row.ci95_low);
  const high = number(row.ci95_high);
  return {
    load_band_mw: row.load_band_mw,
    load_band_midpoint_mw: number(row.load_band_midpoint_mw),
    n_hours: number(row.n_hours),
    nox_ppm_per_degc: slope,
    ci95_low: low,
    ci95_high: high,
    ci_error: [slope - low, high - slope],
    crosses_zero: low <= 0 && high >= 0,
  };
});

export const coldWarm: ColdWarmPoint[] = parseRows(coldWarmCsv).map((row) => ({
  group: row.group,
  at_bound_c: number(row.at_bound_c),
  mean_nox_ppm: number(row.mean_nox_ppm),
  median_nox_ppm: number(row.median_nox_ppm),
  p95_nox_ppm: number(row.p95_nox_ppm),
  exceedance_rate_pct: number(row.exceedance_rate_pct),
  n_hours: number(row.n_hours),
}));

export const monthlyTrend: MonthlyTrendPoint[] = parseRows(monthlyTrendCsv).map((row) => {
  const q25 = number(row.q25_nox_ppm);
  const q75 = number(row.q75_nox_ppm);
  return {
    start_hour: number(row.start_hour),
    mid_hour: number(row.mid_hour),
    median_nox_ppm: number(row.median_nox_ppm),
    q25_nox_ppm: q25,
    q75_nox_ppm: q75,
    mean_co_ppm: number(row.mean_co_ppm),
    mean_at_c: number(row.mean_at_c),
    mean_tey_mw: number(row.mean_tey_mw),
    n_hours: number(row.n_hours),
    period_index: number(row.period_index),
    year: number(row.year),
    iqr: [q25, q75],
  };
});

export const yearComparison: YearComparisonPoint[] = parseRows(yearComparisonCsv).map((row) => ({
  variable: row.variable,
  unit: row.unit,
  category: row.category as ComparisonCategory,
  year_1: number(row.year_1),
  year_2: number(row.year_2),
  pct_change: number(row.pct_change),
}));

export const exceedanceByYear: ExceedanceByYearPoint[] = parseRows(exceedanceByYearCsv).map((row) => ({
  metric: row.metric,
  year_1: number(row.year_1),
  year_2: number(row.year_2),
  unit: row.unit,
}));

export const validationComparison: ValidationPoint[] = parseRows(validationComparisonCsv)
  .map((row) => ({
    scheme: row.scheme,
    detail: row.detail,
    r2: number(row.r2),
    honest: row.honest.toLowerCase() === "true",
    order: number(row.order),
  }))
  .sort((a, b) => a.order - b.order);

export const recalibrationEffect: RecalibrationPoint[] = parseRows(recalibrationEffectCsv).map((row) => ({
  condition: row.condition,
  mae_ppm: number(row.mae_ppm),
  bias_ppm: number(row.bias_ppm),
}));

export const humiditySlopes: HumiditySlopePoint[] = parseRows(humiditySlopesCsv).map((row) => ({
  at_band: row.at_band,
  n_hours: number(row.n_hours),
  slope_temperature_split_only: number(row.slope_temperature_split_only),
  slope_fully_adjusted: number(row.slope_fully_adjusted),
}));
