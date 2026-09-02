import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartFrameProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export const ChartFrame = ({
  title,
  description,
  children,
  className,
  contentClassName,
}: ChartFrameProps) => (
  <Card className={className}>
    <CardHeader className="space-y-2">
      <CardTitle className="text-lg leading-snug">{title}</CardTitle>
      {description ? <CardDescription className="leading-relaxed">{description}</CardDescription> : null}
    </CardHeader>
    <CardContent className={cn("space-y-4", contentClassName)}>{children}</CardContent>
  </Card>
);

interface ScrollableChartProps {
  children: ReactNode;
  minWidth?: string;
  height?: string;
  ariaLabel: string;
}

export const ScrollableChart = ({
  children,
  minWidth = "640px",
  height = "360px",
  ariaLabel,
}: ScrollableChartProps) => (
  <div
    className="w-full min-w-0 max-w-full overflow-x-auto pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    role="img"
    aria-label={ariaLabel}
    tabIndex={0}
  >
    <div style={{ minWidth, height }}>{children}</div>
  </div>
);
