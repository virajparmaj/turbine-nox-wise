export const chartColors = {
  primary: "hsl(var(--primary))",
  accent: "hsl(var(--accent))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))",
  border: "hsl(var(--border))",
  card: "hsl(var(--card))",
  foreground: "hsl(var(--foreground))",
} as const;

export const tooltipStyle = {
  backgroundColor: chartColors.card,
  border: `1px solid ${chartColors.border}`,
  borderRadius: "var(--radius)",
  color: chartColors.foreground,
};
