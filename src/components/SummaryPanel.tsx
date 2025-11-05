import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

interface SummaryPanelProps {
  nox: number;
  primaryDriver: string;
  recommendation: string;
}

export const SummaryPanel = ({ nox, primaryDriver, recommendation }: SummaryPanelProps) => {
  return (
    <Card className="bg-primary text-primary-foreground">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <Info className="h-6 w-6 flex-shrink-0 mt-1" />
          <div className="space-y-2">
            <p className="text-sm leading-relaxed">
              Under current operating conditions, NOx emissions are estimated at{" "}
              <span className="font-bold">{nox.toFixed(1)} ppm</span>.
              The primary driver appears to be <span className="font-bold">{primaryDriver}</span>.
            </p>
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Recommended action:</span> {recommendation}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
