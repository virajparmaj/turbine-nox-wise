import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  recalibrationEffect,
  type ValidationPoint,
  validationComparison,
} from "@/data/analysis";
import { ChartFrame, ScrollableChart } from "./ChartFrame";
import { chartColors } from "./chartTheme";

interface ValidationTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ValidationPoint }>;
}

const ValidationTooltip = ({ active, payload }: ValidationTooltipProps) => {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="max-w-xs rounded-md border bg-card p-3 text-xs shadow-lg">
      <div className="font-semibold">{point.scheme}</div>
      <div className="mt-1 text-muted-foreground">R² {point.r2.toFixed(3)}</div>
      <div className="mt-1 text-muted-foreground">{point.detail}</div>
      <div className="mt-1 font-medium">{point.honest ? "Time-aware validation" : "Random split; neighbouring hours leak across the split"}</div>
    </div>
  );
};

export const ValidationInsightChart = () => (
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
    <ChartFrame
      title="Random validation looks strong; time-aware validation does not"
      description="These are RandomForest results from the analysis notebooks. They are not performance measurements of this site's deployed XGBoost models."
    >
      <ScrollableChart
        minWidth="680px"
        height="340px"
        ariaLabel="Bar chart comparing random split, blocked, cross-year, and recalibrated RandomForest validation results"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={validationComparison} layout="vertical" margin={{ top: 5, right: 25, bottom: 20, left: 15 }}>
            <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[-0.25, 0.95]}
              tickFormatter={(value) => Number(value).toFixed(1)}
              label={{ value: "R²", position: "insideBottom", offset: -10 }}
            />
            <YAxis type="category" dataKey="scheme" width={175} tick={{ fontSize: 11 }} />
            <Tooltip content={<ValidationTooltip />} />
            <ReferenceLine x={0} stroke={chartColors.foreground} />
            <Bar dataKey="r2" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {validationComparison.map((point) => (
                <Cell
                  key={point.scheme}
                  fill={!point.honest ? chartColors.warning : point.r2 < 0 ? chartColors.destructive : chartColors.primary}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ScrollableChart>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-warning" />Random split</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-primary" />Time-aware, positive R²</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-destructive" />Time-aware, negative R²</span>
      </div>
    </ChartFrame>

    <ChartFrame
      title="Monthly re-zeroing recovers the level"
      description="The model kept much of the rank ordering (Spearman 0.77); the larger failure was a systematic offset."
    >
      <div className="space-y-3">
        {recalibrationEffect.map((point) => (
          <div key={point.condition} className="rounded-lg border p-4">
            <div className="font-semibold">{point.condition}</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-muted/60 p-3">
                <div className="text-xs text-muted-foreground">MAE</div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums">{point.mae_ppm.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">ppm</div>
              </div>
              <div className="rounded-md bg-muted/60 p-3">
                <div className="text-xs text-muted-foreground">Bias</div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums">{point.bias_ppm > 0 ? "+" : ""}{point.bias_ppm.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">ppm</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        The honest out-of-sample range is roughly R² 0.3–0.5 with recalibration: blocked folds can be pessimistic when they must extrapolate to unseen seasons.
      </p>
    </ChartFrame>
  </div>
);
