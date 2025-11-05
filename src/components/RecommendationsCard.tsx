import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RecommendationsCardProps {
  messages: string[];
  severity: 'green' | 'yellow' | 'orange' | 'red';
}

const severityConfig = {
  green: { label: "🟢 Normal", variant: "default" as const },
  yellow: { label: "🟡 Monitor", variant: "secondary" as const },
  orange: { label: "🟠 Adjust", variant: "outline" as const },
  red: { label: "🔴 High Risk", variant: "destructive" as const }
};

export const RecommendationsCard = ({ messages, severity }: RecommendationsCardProps) => {
  const config = severityConfig[severity];
  
  return (
    <Card className="border-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recommendations</CardTitle>
        <Badge variant={config.variant}>{config.label}</Badge>
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
