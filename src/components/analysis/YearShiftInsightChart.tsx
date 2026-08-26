import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  exceedanceByYear,
  type MonthlyTrendPoint,
  monthlyTrend,
  yearComparison,
} from "@/data/analysis";
import { ChartFrame, ScrollableChart } from "./ChartFrame";
import { chartColors } from "./chartTheme";

interface MonthlyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyTrendPoint }>;
}

const MonthlyTooltip = ({ active, payload }: MonthlyTooltipProps) => {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-md border bg-card p-3 text-xs shadow-lg">
      <div className="font-semibold">Year {point.year}, period {point.year === 1 ? point.period_index : point.period_index - 12}</div>
      <div className="mt-1 text-muted-foreground">Median NOx: {point.median_nox_ppm.toFixed(2)} ppm</div>
      <div className="text-muted-foreground">IQR: {point.q25_nox_ppm.toFixed(2)}–{point.q75_nox_ppm.toFixed(2)} ppm</div>
      <div className="text-muted-foreground">Ambient temperature: {point.mean_at_c.toFixed(2)} °C</div>
      <div className="text-muted-foreground">Load: {point.mean_tey_mw.toFixed(2)} MW</div>
      <div className="text-muted-foreground">n = {point.n_hours.toLocaleString()} hours</div>
    </div>
  );
};

const unitLabel = (unit: string) => (unit === "degC" ? "°C" : unit);
const signedPct = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

export const YearShiftInsightChart = () => {
  const inputs = yearComparison.filter((item) => item.category !== "outcome");
  const stable = inputs.filter((item) => Math.abs(item.pct_change) <= 0.6);
  const movers = inputs.filter((item) => Math.abs(item.pct_change) > 0.6);
  const outcomes = yearComparison.filter((item) => item.category === "outcome");
  const exceedance = exceedanceByYear[0];

  return (
    <div className="space-y-5">
      <ChartFrame
        title="The monthly NOx level steps down at the inferred year boundary"
        description="The band shows each period's interquartile range. Hover to compare ambient temperature and load alongside the NOx shift."
      >
        <ScrollableChart
          minWidth="720px"
          height="390px"
          ariaLabel="Monthly NOx median and interquartile range across two inferred annual cycles"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyTrend} margin={{ top: 10, right: 20, bottom: 25, left: 5 }}>
              <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="period_index"
                ticks={[1, 4, 7, 10, 13, 16, 19, 22, 24]}
                tickFormatter={(value) => (Number(value) <= 12 ? `Y1 · ${value}` : `Y2 · ${Number(value) - 12}`)}
                label={{ value: "Equal 596-hour periods (source has no dates)", position: "insideBottom", offset: -15 }}
              />
              <YAxis
                domain={["dataMin - 4", "dataMax + 4"]}
                unit=" ppm"
                label={{ value: "NOx (ppm)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip content={<MonthlyTooltip />} />
              <ReferenceLine
                x={12.5}
                stroke={chartColors.destructive}
                strokeDasharray="4 4"
                label={{ value: "Row 7,152", fill: chartColors.destructive, position: "top" }}
              />
              <Area
                type="linear"
                dataKey="iqr"
                stroke="none"
                fill={chartColors.primary}
                fillOpacity={0.14}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="median_nox_ppm"
                stroke={chartColors.primary}
                strokeWidth={2.5}
                dot={{ r: 2.5 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ScrollableChart>
      </ChartFrame>

      <ChartFrame
        title="Stable setpoints, visible movers, and a drop that survives matching"
        description="The raw years are not identical. The matched estimate is the headline because all nine operating and ambient sensors — including AFDP and GTEP — are balanced before comparing NOx."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold">Primary setpoints</h4>
              <Badge variant="secondary">within 0.6%</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {stable.map((item) => (
                <div key={item.variable} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{item.variable}</span>
                  <span className="font-mono font-semibold tabular-nums">{signedPct(item.pct_change)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold">Larger movers</h4>
              <Badge variant="outline">matched</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {movers.map((item) => (
                <div key={item.variable} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{item.variable}</span>
                  <span className="font-mono font-semibold tabular-nums">{signedPct(item.pct_change)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
            <h4 className="font-semibold">Observed outcomes</h4>
            <div className="mt-3 space-y-3">
              {outcomes.map((item) => (
                <div key={item.variable}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{item.variable}</span>
                    <span className="font-mono text-lg font-bold tabular-nums text-primary">{signedPct(item.pct_change)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.year_1.toFixed(2)} → {item.year_2.toFixed(2)} {unitLabel(item.unit)}
                  </div>
                </div>
              ))}
              <div className="border-t pt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Hours above 86.2 ppm</span>
                  <span className="font-mono text-lg font-bold tabular-nums text-primary">
                    {exceedance.year_1.toFixed(2)}% → {exceedance.year_2.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
          After nearest-neighbour matching across the nine input sensors, Year 2 remains <span className="font-mono font-semibold text-foreground">5.45 ppm lower</span> (95% CI −7.93 to −4.25; 955 well-matched pairs). This is association with time, not proof of what changed.
        </div>
      </ChartFrame>
    </div>
  );
};
