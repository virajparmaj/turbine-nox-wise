import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface PredictedNoxCardProps {
  nox: number | null;
  delta: number | null;
}

const ADVISORY_MESSAGES = [
  "Keep a modest AFDP; avoid over-cleaning filters at 130–136 MW.",
  "Set a tighter AFDP threshold; replace or clean filters before AFDP spikes at ≥160 MW.",
  "Enable ambient-based fuel–air trimming or inlet heating/fogging when air is cold.",
  "Tighten TAT limits and retune fuel–air ratio to cap peak flame temperature.",
  "Inspect exhaust path for leaks or over-open dampers; restore normal back-pressure.",
  "Check compressor (CDP) settings for fouling or bleed issues; restore nominal pressure.",
  "If CO also rises, improve mixing and staging; verify DLN mode.",
  "Track AFDP–NOx trend for condition-based maintenance.",
  "Calibrate or replace sensors showing inconsistent readings (AFDP/TAT/GTEP/CDP).",
  "Avoid long dwell in problematic load bands; plan smoother ramps through mid-ranges.",
  "Add seasonal corrections for AT/AH/AP in control logic.",
  "Record maintenance and fuel data to link with emission behavior.",
  "Use dashboards to monitor NOx vs AFDP/TAT/GTEP and trigger auto-alerts.",
  "Run a quick backtest showing expected NOx reduction for each intervention."
];

export const PredictedNoxCard = ({ nox, delta }: PredictedNoxCardProps) => {
  const advisoryMessages = useMemo(() => {
    if (!delta || delta <= 0) return [];
    
    // Select 2-3 random messages
    const count = Math.floor(Math.random() * 2) + 2; // 2 or 3 messages
    const shuffled = [...ADVISORY_MESSAGES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, [delta]);
  const getChangeIcon = () => {
    if (!delta || Math.abs(delta) < 0.5) return <Minus className="h-5 w-5" />;
    return delta > 0 ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />;
  };

  const getChangeColor = () => {
    if (!delta || Math.abs(delta) < 0.5) return "text-muted-foreground";
    return delta > 0 ? "text-destructive" : "text-success";
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Predicted NOx</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <p className="text-6xl font-bold text-primary">
            {nox !== null ? nox.toFixed(1) : "—"}
          </p>
          <p className="text-sm text-muted-foreground">ppm</p>
        </div>
        
        {delta !== null && (
          <>
            <div className={cn("flex items-center justify-center gap-2 p-3 rounded-lg bg-secondary", getChangeColor())}>
              {getChangeIcon()}
              <span className="text-lg font-semibold">
                {delta > 0 ? "+" : ""}{delta.toFixed(1)} ppm
              </span>
            </div>
            
            {advisoryMessages.length > 0 && (
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-sm font-semibold text-muted-foreground mb-2">Advisory:</p>
                {advisoryMessages.map((msg, i) => (
                  <div key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span className="text-primary font-bold">•</span>
                    <span className="text-foreground">{msg}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
