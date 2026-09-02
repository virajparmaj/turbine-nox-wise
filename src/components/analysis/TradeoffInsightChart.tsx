import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  type Regime,
  regimeCorrelations,
  scatterSample,
} from "@/data/analysis";
import { ChartFrame, ScrollableChart } from "./ChartFrame";
import { chartColors, tooltipStyle } from "./chartTheme";

const regimeColors: Record<Regime, string> = {
  part_load: chartColors.destructive,
  transition: chartColors.warning,
  normal: chartColors.primary,
  high_fire: chartColors.success,
};

export const TradeoffInsightChart = () => {
  const allRegimes = regimeCorrelations.map((item) => item.regime);
  const [activeRegimes, setActiveRegimes] = useState<Regime[]>(allRegimes);

  const pointsByRegime = useMemo(
    () => Object.fromEntries(
      allRegimes.map((regime) => [regime, scatterSample.filter((point) => point.regime === regime)]),
    ) as Record<Regime, typeof scatterSample>,
    [allRegimes],
  );

  const toggleRegime = (regime: Regime) => {
    setActiveRegimes((current) => {
      if (!current.includes(regime)) return [...current, regime];
      if (current.length === 1) return current;
      return current.filter((item) => item !== regime);
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
      <ChartFrame
        title="NOx and CO rise together inside every operating regime"
        description="Toggle regimes to isolate the part-load cluster. CO uses a logarithmic axis; NOx is de-trended to remove the multi-year level shift."
      >
        <div className="flex flex-wrap gap-2" aria-label="Operating regime filters">
          {regimeCorrelations.map((item) => {
            const active = activeRegimes.includes(item.regime);
            return (
              <Button
                key={item.regime}
                type="button"
                size="sm"
                variant={active ? "secondary" : "outline"}
                aria-pressed={active}
                onClick={() => toggleRegime(item.regime)}
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: regimeColors[item.regime] }}
                />
                {item.regime_label}
              </Button>
            );
          })}
        </div>

        <ScrollableChart
          minWidth="680px"
          height="410px"
          ariaLabel="Log scale scatter plot of carbon monoxide against de-trended NOx, colored by operating regime"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 15, bottom: 25, left: 10 }}>
              <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="co_ppm"
                name="CO"
                unit=" ppm"
                scale="log"
                domain={["auto", "auto"]}
                tickFormatter={(value) => Number(value).toFixed(Number(value) < 1 ? 1 : 0)}
                label={{ value: "CO (ppm, log scale)", position: "insideBottom", offset: -15 }}
              />
              <YAxis
                type="number"
                dataKey="nox_detrended_ppm"
                name="De-trended NOx"
                unit=" ppm"
                label={{ value: "De-trended NOx (ppm)", angle: -90, position: "insideLeft" }}
              />
              <ZAxis range={[14, 14]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  `${Number(value).toFixed(2)} ppm`,
                  name,
                ]}
              />
              {allRegimes.map((regime) => (
                activeRegimes.includes(regime) ? (
                  <Scatter
                    key={regime}
                    name={regimeCorrelations.find((item) => item.regime === regime)?.regime_label}
                    data={pointsByRegime[regime]}
                    fill={regimeColors[regime]}
                    fillOpacity={0.55}
                    isAnimationActive={false}
                  />
                ) : null
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </ScrollableChart>

        <p className="text-xs leading-5 text-muted-foreground">
          Plotting sample: 2,547 of 14,310 hours. All 747 part-load hours are retained; the other regimes are sampled to 600 each. The correlations shown alongside use the full dataset.
        </p>
      </ChartFrame>

      <ChartFrame
        title="The full-data correlation is strongest at part load"
        description="Spearman correlation by regime. All four estimates are positive."
      >
        <ScrollableChart
          minWidth="410px"
          height="300px"
          ariaLabel="Bar chart of full-dataset NOx and CO Spearman correlations by operating regime"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={regimeCorrelations} layout="vertical" margin={{ left: 5, right: 25 }}>
              <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 0.85]} tickFormatter={(value) => Number(value).toFixed(1)} />
              <YAxis type="category" dataKey="regime_label" width={125} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [Number(value).toFixed(3), "Spearman ρ"]}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="spearman_co_vs_nox" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {regimeCorrelations.map((item) => (
                  <Cell key={item.regime} fill={regimeColors[item.regime]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ScrollableChart>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {regimeCorrelations.map((item) => (
            <div key={item.regime} className="flex items-center justify-between gap-4 rounded-md bg-muted/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{item.tit_range}</span>
              <span className="font-mono font-semibold tabular-nums">ρ {item.spearman_co_vs_nox.toFixed(2)} · n={item.n_hours.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </ChartFrame>
    </div>
  );
};
