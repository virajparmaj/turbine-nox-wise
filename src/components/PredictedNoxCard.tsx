import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PredictedNoxCardProps {
  nox: number | null;
  delta: number | null;
}

export const PredictedNoxCard = ({ nox, delta }: PredictedNoxCardProps) => {
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
          <div className={cn("flex items-center justify-center gap-2 p-3 rounded-lg bg-secondary", getChangeColor())}>
            {getChangeIcon()}
            <span className="text-lg font-semibold">
              {delta > 0 ? "+" : ""}{delta.toFixed(1)} ppm
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
