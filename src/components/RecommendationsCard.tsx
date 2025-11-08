import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { RiskLevel } from "@/utils/recommendations";

interface RecommendationsCardProps {
  messages: string[];
  risk: RiskLevel;
}

const riskConfig: Record<RiskLevel, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  "Normal": { label: "Normal", variant: "default", color: "text-green-600" },
  "Watch": { label: "Watch", variant: "secondary", color: "text-yellow-600" },
  "High": { label: "High", variant: "destructive", color: "text-red-600" },
  "Low confidence": { label: "Low confidence", variant: "outline", color: "text-muted-foreground" }
};

export const RecommendationsCard = ({ messages, risk }: RecommendationsCardProps) => {
  const config = riskConfig[risk];
  
  return (
    <Card className="border-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recommendations</CardTitle>
        <Badge variant={config.variant} className="gap-1">
          {risk === "Low confidence" && <AlertTriangle className="h-3 w-3" />}
          {config.label}
        </Badge>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {messages.map((msg, i) => (
            <li key={i} className="text-sm leading-relaxed flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>{msg}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
