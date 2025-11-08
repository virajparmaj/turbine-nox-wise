import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { DiffItem } from "@/utils/recommendations";

interface WhatChangedCardProps {
  diffs: DiffItem[];
}

export const WhatChangedCard = ({ diffs }: WhatChangedCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">What Changed</CardTitle>
      </CardHeader>
      <CardContent>
        {diffs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes from previous run</p>
        ) : (
          <div className="space-y-2">
            {diffs.map((diff, i) => (
              <div key={i} className="flex items-center justify-between text-sm gap-4">
                <span className="font-medium min-w-[60px]">{diff.name}:</span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-muted-foreground">{diff.old.toFixed(2)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-primary font-semibold">{diff.new.toFixed(2)}</span>
                  <div className={`flex items-center gap-1 min-w-[70px] justify-end ${diff.pct > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {diff.pct > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    <span className="font-semibold">{diff.pct > 0 ? '+' : ''}{diff.pct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
