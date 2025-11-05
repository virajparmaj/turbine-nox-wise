import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultsPanelProps {
  nox: number;
  baselineNox: number;
  recommendation: string;
}

export const ResultsPanel = ({ nox, baselineNox, recommendation }: ResultsPanelProps) => {
  const change = nox - baselineNox;
  const changePercent = baselineNox > 0 ? ((change / baselineNox) * 100).toFixed(1) : "0";
  
  const getChangeIcon = () => {
    if (Math.abs(change) < 0.5) return <Minus className="h-5 w-5" />;
    return change > 0 ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />;
  };

  const getChangeColor = () => {
    if (Math.abs(change) < 0.5) return "text-muted-foreground";
    return change > 0 ? "text-destructive" : "text-success";
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-xl">Predicted Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* NOx Value */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            NOx Emissions
          </p>
          <p className="text-6xl font-bold text-primary">
            {nox.toFixed(1)}
          </p>
          <p className="text-sm text-muted-foreground">ppm</p>
        </div>

        {/* Change Indicator */}
        <div className={cn("flex items-center justify-center gap-2 p-3 rounded-lg bg-secondary", getChangeColor())}>
          {getChangeIcon()}
          <span className="text-lg font-semibold">
            {change > 0 ? "+" : ""}{change.toFixed(1)} ppm ({change > 0 ? "+" : ""}{changePercent}%)
          </span>
        </div>

        {/* Recommendation */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Recommendation
          </p>
          <div className="p-4 bg-accent/10 border-l-4 border-accent rounded">
            <p className="text-sm leading-relaxed text-foreground">
              {recommendation}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
