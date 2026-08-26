import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ErrorBar,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  coldWarm,
  type WeatherSensitivityPoint,
  weatherSensitivity,
} from "@/data/analysis";
import { ChartFrame, ScrollableChart } from "./ChartFrame";
import { chartColors } from "./chartTheme";

interface WeatherTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WeatherSensitivityPoint }>;
}

const WeatherTooltip = ({ active, payload }: WeatherTooltipProps) => {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-md border bg-card p-3 text-xs shadow-lg">
      <div className="font-semibold text-foreground">{point.load_band_mw} MW</div>
      <div className="mt-1 text-muted-foreground">Slope: {point.nox_ppm_per_degc.toFixed(3)} ppm/°C</div>
      <div className="text-muted-foreground">95% CI: [{point.ci95_low.toFixed(3)}, {point.ci95_high.toFixed(3)}]</div>
      <div className="text-muted-foreground">n = {point.n_hours.toLocaleString()} hours</div>
      {point.crosses_zero ? <div className="mt-1 font-medium text-warning">Includes zero</div> : null}
    </div>
  );
};

const weatherGroupLabel: Record<string, string> = {
  coldest_10pct: "Coldest 10%",
  warmest_10pct: "Warmest 10%",
};

export const WeatherInsightChart = () => (
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
    <ChartFrame
      title="Cold weather matters most at part load — and fades to zero above 150 MW"
      description="Each bar is the estimated NOx change per 1 °C increase; whiskers are the 95% confidence interval. More negative means a stronger cold-weather penalty."
    >
      <div className="flex justify-end">
        <Badge variant="outline" className="border-warning/60 text-warning">
          Top-load CI crosses zero
        </Badge>
      </div>
      <ScrollableChart
        minWidth="680px"
        height="390px"
        ariaLabel="Horizontal bars with confidence intervals showing NOx temperature sensitivity by turbine load band"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={weatherSensitivity}
            layout="vertical"
            margin={{ top: 5, right: 35, bottom: 25, left: 5 }}
          >
            <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[-3, 0.5]}
              tickFormatter={(value) => Number(value).toFixed(1)}
              label={{ value: "NOx change per 1 °C increase (ppm/°C)", position: "insideBottom", offset: -15 }}
            />
            <YAxis type="category" dataKey="load_band_mw" width={82} unit=" MW" />
            <Tooltip content={<WeatherTooltip />} />
            <ReferenceLine x={0} stroke={chartColors.foreground} strokeWidth={1.5} />
            <Bar dataKey="nox_ppm_per_degc" barSize={12} radius={[4, 0, 0, 4]} isAnimationActive={false}>
              {weatherSensitivity.map((point) => (
                <Cell
                  key={point.load_band_mw}
                  fill={point.crosses_zero ? chartColors.warning : chartColors.primary}
                />
              ))}
              <ErrorBar dataKey="ci_error" direction="x" width={8} stroke={chartColors.foreground} strokeWidth={1.5} />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </ScrollableChart>
      <p className="text-xs leading-5 text-muted-foreground">
        Slopes hold humidity and the multi-year trend fixed and use HAC (Newey–West) standard errors. The 137–150 MW control region breaks the otherwise declining pattern.
      </p>
    </ChartFrame>

    <ChartFrame
      title="The coldest hours carry the exceedance burden"
      description="The 86.2 ppm line is the dataset's own 95th percentile, not a permit or compliance limit."
    >
      <div className="space-y-3">
        {coldWarm.map((point) => (
          <div key={point.group} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{weatherGroupLabel[point.group]}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {point.group === "coldest_10pct" ? `≤ ${point.at_bound_c} °C` : `≥ ${point.at_bound_c} °C`} · n={point.n_hours.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl font-bold tabular-nums text-primary">{point.exceedance_rate_pct.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">above 86.2 ppm</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-muted/60 p-2">
                <div className="text-xs text-muted-foreground">Mean NOx</div>
                <div className="mt-1 font-mono font-semibold tabular-nums">{point.mean_nox_ppm.toFixed(1)} ppm</div>
              </div>
              <div className="rounded-md bg-muted/60 p-2">
                <div className="text-xs text-muted-foreground">95th percentile</div>
                <div className="mt-1 font-mono font-semibold tabular-nums">{point.p95_nox_ppm.toFixed(1)} ppm</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ChartFrame>
  </div>
);
