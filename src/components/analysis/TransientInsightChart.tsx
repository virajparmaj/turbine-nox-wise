import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { eventProfile, thresholdScan } from "@/data/analysis";
import { ChartFrame, ScrollableChart } from "./ChartFrame";
import { chartColors, tooltipStyle } from "./chartTheme";

const hourLabel = (hour: number) => (hour > 0 ? `+${hour} h` : `${hour} h`);

export const TransientInsightChart = () => {
  const initialIndex = thresholdScan.findIndex((point) => point.tit_cutoff_c === 1050);
  const [thresholdIndex, setThresholdIndex] = useState(initialIndex);
  const [view, setView] = useState("event");
  const selected = thresholdScan[thresholdIndex];
  const labelSlider = (element: HTMLDivElement | null) => {
    element?.querySelector('[role="slider"]')?.setAttribute(
      "aria-label",
      "Turbine inlet temperature threshold",
    );
  };

  return (
    <ChartFrame
      title="The spike arrives at excursion onset, then takes about eight hours to settle"
      description="Switch views to inspect the aligned 273-event profile or test how the concentration changes as the TIT cut-off moves."
    >
      <Tabs value={view} onValueChange={setView} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger value="event" className="py-2">Episode profile</TabsTrigger>
          <TabsTrigger value="threshold" className="py-2">TIT threshold</TabsTrigger>
        </TabsList>

        <TabsContent value="event" className="mt-0">
          <ScrollableChart
            minWidth="650px"
            ariaLabel="Line chart of NOx and CO from six hours before to twelve hours after a low TIT excursion begins"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eventProfile} margin={{ top: 10, right: 20, bottom: 15, left: 0 }}>
                <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="hours_from_onset"
                  tickFormatter={hourLabel}
                  label={{ value: "Hours from episode onset", position: "insideBottom", offset: -8 }}
                />
                <YAxis
                  yAxisId="nox"
                  tickFormatter={(value) => `${value}`}
                  label={{ value: "NOx (ppm)", angle: -90, position: "insideLeft" }}
                />
                <YAxis
                  yAxisId="co"
                  orientation="right"
                  label={{ value: "CO (ppm)", angle: 90, position: "insideRight" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(value) => `Episode time: ${hourLabel(Number(value))}`}
                  formatter={(value, name) => [
                    `${Number(value).toFixed(2)} ppm`,
                    name === "nox_ppm" ? "NOx" : "CO",
                  ]}
                />
                <Legend verticalAlign="top" formatter={(value) => (value === "nox_ppm" ? "NOx" : "CO")} />
                <ReferenceLine
                  x={0}
                  yAxisId="nox"
                  stroke={chartColors.destructive}
                  strokeDasharray="4 4"
                  label={{ value: "Onset", fill: chartColors.destructive, position: "top" }}
                />
                <Line
                  yAxisId="nox"
                  type="linear"
                  dataKey="nox_ppm"
                  stroke={chartColors.primary}
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="co"
                  type="linear"
                  dataKey="co_ppm"
                  stroke={chartColors.accent}
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ScrollableChart>
        </TabsContent>

        <TabsContent value="threshold" className="mt-0 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-muted/60 p-3">
              <div className="text-xs text-muted-foreground">Selected TIT cut-off</div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums">{selected.tit_cutoff_c} °C</div>
            </div>
            <div className="rounded-md bg-muted/60 p-3">
              <div className="text-xs text-muted-foreground">Operating hours captured</div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums">{selected.share_of_hours_pct}%</div>
            </div>
            <div className="rounded-md bg-muted/60 p-3">
              <div className="text-xs text-muted-foreground">Worst-NOx risk lift</div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-accent">{selected.risk_lift}×</div>
            </div>
          </div>

          <div className="space-y-2 px-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{thresholdScan[0].tit_cutoff_c} °C</span>
              <span>Move the cut-off</span>
              <span>{thresholdScan[thresholdScan.length - 1].tit_cutoff_c} °C</span>
            </div>
            <div ref={labelSlider}>
              <Slider
                value={[thresholdIndex]}
                min={0}
                max={thresholdScan.length - 1}
                step={1}
                onValueChange={([value]) => setThresholdIndex(value)}
              />
            </div>
          </div>

          <ScrollableChart
            minWidth="650px"
            ariaLabel="Threshold scan comparing the share of operating hours with the share of worst NOx hours"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={thresholdScan} margin={{ top: 10, right: 20, bottom: 15, left: 0 }}>
                <CartesianGrid stroke={chartColors.border} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="tit_cutoff_c"
                  unit=" °C"
                  label={{ value: "TIT cut-off", position: "insideBottom", offset: -8 }}
                />
                <YAxis unit="%" domain={[0, 85]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(value) => `TIT below ${value} °C`}
                  formatter={(value, name) => [
                    `${Number(value).toFixed(2)}%`,
                    name === "share_of_hours_pct" ? "Operating hours" : "Worst NOx hours",
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  formatter={(value) => (value === "share_of_hours_pct" ? "Operating hours" : "Worst NOx hours")}
                />
                <ReferenceLine x={selected.tit_cutoff_c} stroke={chartColors.destructive} strokeDasharray="4 4" />
                <Line
                  type="linear"
                  dataKey="share_of_hours_pct"
                  stroke={chartColors.primary}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="share_of_worst_nox_hours_pct"
                  stroke={chartColors.accent}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ScrollableChart>
        </TabsContent>
      </Tabs>
    </ChartFrame>
  );
};
