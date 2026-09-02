import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { humiditySlopes } from "@/data/analysis";
import { ChartFrame, ScrollableChart } from "./ChartFrame";
import { chartColors, tooltipStyle } from "./chartTheme";

export const HumidityInsightChart = () => (
  <div className="space-y-5">
    <ChartFrame
      title="Conditioning on temperature reverses humidity's apparent effect"
      description="The supplied static scatter preserves the full multi-line evidence. It is intentionally kept as an image rather than made interactive."
      contentClassName="overflow-hidden"
    >
      <div className="max-w-full overflow-x-auto rounded-md border bg-white p-2">
        <img
          src="/analysis/chart-06-humidity-sign-reversal.png"
          alt="Scatter plots showing humidity's raw positive association with NOx reversing after conditioning on ambient temperature"
          className="h-auto min-w-[760px] max-w-none"
        />
      </div>
    </ChartFrame>

    <ChartFrame
      title="The fully adjusted slope stays negative in every temperature band"
      description="The pooled raw slope is positive; after full adjustment, every estimate points in the physically expected direction."
    >
      <ScrollableChart
        minWidth="720px"
        height="380px"
        ariaLabel="Grouped horizontal bars comparing temperature-split and fully adjusted humidity slopes"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={humiditySlopes} layout="vertical" margin={{ top: 5, right: 25, bottom: 20, left: 15 }}>
            <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[-0.5, 0.2]}
              tickFormatter={(value) => Number(value).toFixed(1)}
              label={{ value: "NOx slope (ppm/%RH)", position: "insideBottom", offset: -10 }}
            />
            <YAxis type="category" dataKey="at_band" width={125} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [
                `${Number(value).toFixed(3)} ppm/%RH`,
                name === "slope_temperature_split_only" ? "Temperature split only" : "Fully adjusted",
              ]}
            />
            <Legend
              verticalAlign="top"
              formatter={(value) => (value === "slope_temperature_split_only" ? "Temperature split only" : "Fully adjusted")}
            />
            <ReferenceLine x={0} stroke={chartColors.foreground} />
            <Bar dataKey="slope_temperature_split_only" fill={chartColors.warning} radius={[3, 0, 0, 3]} isAnimationActive={false} />
            <Bar dataKey="slope_fully_adjusted" fill={chartColors.primary} radius={[3, 0, 0, 3]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ScrollableChart>
    </ChartFrame>
  </div>
);
