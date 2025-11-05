import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WhatChangedCardProps {
  baseline: Record<string, number>;
  current: Record<string, number>;
}

export const WhatChangedCard = ({ baseline, current }: WhatChangedCardProps) => {
  const changes = Object.keys(current).filter(key => 
    Math.abs(current[key] - baseline[key]) > 0.01
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">What Changed</CardTitle>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes from baseline</p>
        ) : (
          <div className="space-y-2">
            {changes.map(key => (
              <div key={key} className="flex justify-between text-sm">
                <span className="font-medium">{key}:</span>
                <span>
                  <span className="text-muted-foreground">{baseline[key].toFixed(2)}</span>
                  {" → "}
                  <span className="text-primary font-semibold">{current[key].toFixed(2)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
