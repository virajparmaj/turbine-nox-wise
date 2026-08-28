import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface KeyFigure {
  value: string;
  label: string;
}

interface FindingSectionProps {
  number: number;
  title: string;
  finding: ReactNode;
  keyFigures: KeyFigure[];
  whyItMatters: ReactNode;
  implication: ReactNode;
  caveat: ReactNode;
  children: ReactNode;
  scopeNote?: ReactNode;
}

export const FindingSection = ({
  number,
  title,
  finding,
  keyFigures,
  whyItMatters,
  implication,
  caveat,
  children,
  scopeNote,
}: FindingSectionProps) => (
  <section id={`finding-${number}`} aria-labelledby={`finding-${number}-title`} className="scroll-mt-6 space-y-6">
    <div className="max-w-4xl space-y-3">
      <Badge variant="secondary">Finding {number}</Badge>
      <h2 id={`finding-${number}-title`} className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
        {title}
      </h2>
      <div className="max-w-3xl text-base leading-7 text-muted-foreground">{finding}</div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {keyFigures.map((figure) => (
        <div key={`${figure.value}-${figure.label}`} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="font-mono text-xl font-bold tabular-nums text-primary">{figure.value}</div>
          <div className="mt-1 text-sm leading-snug text-muted-foreground">{figure.label}</div>
        </div>
      ))}
    </div>

    {children}

    <div className="grid gap-5 border-l-2 border-primary/25 pl-5 md:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">In plain English</h3>
        <div className="mt-2 text-sm leading-6 text-muted-foreground">{whyItMatters}</div>
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">What to do</h3>
        <div className="mt-2 text-sm leading-6 text-muted-foreground">{implication}</div>
      </div>
    </div>

    {scopeNote ? (
      <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm leading-6 text-foreground">
        {scopeNote}
      </div>
    ) : null}

    <details className="rounded-md bg-muted/60 px-4 py-3 text-sm leading-6 text-muted-foreground">
      <summary className="cursor-pointer font-semibold text-foreground">Read the caveat</summary>
      <div className="pt-2">{caveat}</div>
    </details>
  </section>
);
