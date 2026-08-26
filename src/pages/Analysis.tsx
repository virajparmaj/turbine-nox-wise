import { ArrowLeft, Clock3, Database, Search, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NavLink } from "@/components/NavLink";
import { FindingSection } from "@/components/analysis/FindingSection";
import { HumidityInsightChart } from "@/components/analysis/HumidityInsightChart";
import { TradeoffInsightChart } from "@/components/analysis/TradeoffInsightChart";
import { TransientInsightChart } from "@/components/analysis/TransientInsightChart";
import { ValidationInsightChart } from "@/components/analysis/ValidationInsightChart";
import { WeatherInsightChart } from "@/components/analysis/WeatherInsightChart";
import { YearShiftInsightChart } from "@/components/analysis/YearShiftInsightChart";
import { headlineMetrics } from "@/data/analysis";

const limitations = [
  {
    title: "Observational data only",
    detail: "No burner setting was deliberately varied. Everything is association; no causal claim is supported, and a what-if change to TIT would be extrapolation, not prediction.",
  },
  {
    title: "No dates, permit limit, or confirmed units",
    detail: "The 86.2 ppm threshold is the dataset's own 95th percentile, not a regulatory limit. Nothing here is a compliance assessment.",
  },
  {
    title: "The year-over-year cause is unresolved",
    detail: "A real combustion improvement and an analyser recalibration look identical in this record. The drop cannot be presented as a performance win.",
  },
  {
    title: "The physical NOx–CO trade-off is not disproven",
    detail: "It is not estimable from this observational record and is not what governs the observed emissions, but it can still exist at a fixed operating point.",
  },
  {
    title: "Load is chosen, not assigned",
    detail: "Operators select load partly in response to ambient conditions, so load-band weather slopes also reflect the dispatch decision.",
  },
  {
    title: "Time order is inferred",
    detail: "Chronological row order and the boundary at row 7,152 are strongly evidenced by autocorrelation and two annual cycles, but not documented in the source file.",
  },
  {
    title: "The deployed predictor was not audited",
    detail: "The validation finding concerns the analysis notebooks' RandomForest metrics, not the three live XGBoost models served by this site's backend.",
  },
];

const nextQuestions = [
  {
    title: "What changed on this unit between the two years?",
    detail: "Request the maintenance and analyser-calibration log to distinguish a genuine improvement worth replicating from an instrument recalibration that makes the years incomparable.",
  },
  {
    title: "What triggers the sub-1050 °C excursions?",
    detail: "Pair the 273 episodes with dispatch, trip, and planned-ramp logs to determine how many are avoidable and whether the largest joint NOx and CO opportunity is actionable.",
  },
  {
    title: "Do the deployed band models show the same cross-year bias?",
    detail: "Backtest the three XGBoost artifacts on a temporal split and monitor offset drift. They were not tested in this analysis.",
  },
  {
    title: "What does a designed fixed-load tuning test reveal?",
    detail: "Hold load constant and vary burner settings deliberately to measure the physical NOx–CO curve that this operating record cannot identify.",
  },
];

const Analysis = () => (
  <div className="min-h-screen overflow-x-hidden bg-background">
    <header className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src="/turbine-nox.png" alt="Turbine NOx logo" className="h-16 w-auto" />
            <div>
              <p className="text-2xl font-bold text-primary sm:text-3xl">Turbine NOx Advisor</p>
              <p className="text-sm text-muted-foreground">Data analysis</p>
            </div>
          </div>
          <Button variant="outline" asChild className="self-start sm:self-auto">
            <NavLink to="/">
              <ArrowLeft />
              Back to predictor
            </NavLink>
          </Button>
        </div>
      </div>
    </header>

    <main className="container mx-auto space-y-16 px-4 py-10 sm:py-12">
      <section aria-labelledby="analysis-title" className="max-w-4xl space-y-5">
        <div className="flex items-center gap-2 text-sm font-medium text-accent">
          <Search className="h-4 w-4" />
          14,310 hourly observations · two inferred annual cycles
        </div>
        <h1 id="analysis-title" className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          What the data tells us
        </h1>
        <div className="space-y-3 text-base leading-7 text-muted-foreground sm:text-lg">
          <p>
            A Turkish energy provider asked which operating conditions drive NOx emissions and what operators should do differently under changing weather. The predictor answers “what NOx would these settings produce?”; this analysis asks where emissions behaviour actually changes and what the plant should watch.
          </p>
          <p>
            The strongest answer is not one ideal setting. It is a pattern of short excursions, load-dependent weather sensitivity, and a machine whose emissions level moved between years.
          </p>
        </div>
      </section>

      <section aria-labelledby="headline-metrics-title" className="space-y-5">
        <h2 id="headline-metrics-title" className="text-2xl font-bold tracking-tight">The short version</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {headlineMetrics.map((metric) => (
            <Card key={metric.id} className="h-full">
              <CardContent className="p-5">
                <div className="font-mono text-3xl font-bold tabular-nums text-primary">{metric.value}</div>
                <p className="mt-3 font-medium leading-snug">{metric.label}</p>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">{metric.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="structure-title" className="space-y-5">
        <div className="max-w-4xl">
          <h2 id="structure-title" className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            The rows are a time series, not independent samples
          </h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Although the source has no date column, ambient temperature traces exactly two annual cycles. Strong hour-to-hour and daily autocorrelation, plus a simultaneous discontinuity in every variable at row 7,152, establish chronological hour order. That structural fact exposes the year shift and changes how model performance must be tested.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex gap-3 rounded-lg border bg-card p-4 shadow-sm">
            <Waves className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div><div className="font-mono text-xl font-bold tabular-nums">0.992</div><div className="text-sm text-muted-foreground">ambient temperature autocorrelation at lag 1</div></div>
          </div>
          <div className="flex gap-3 rounded-lg border bg-card p-4 shadow-sm">
            <Clock3 className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div><div className="font-mono text-xl font-bold tabular-nums">0.917</div><div className="text-sm text-muted-foreground">ambient temperature autocorrelation at lag 24</div></div>
          </div>
          <div className="flex gap-3 rounded-lg border bg-card p-4 shadow-sm">
            <Database className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div><div className="font-mono text-xl font-bold tabular-nums">7,152</div><div className="text-sm text-muted-foreground">inferred Year 1 / Year 2 boundary row</div></div>
          </div>
        </div>
      </section>

      <Separator />

      <FindingSection
        number={1}
        title="Five percent of hours carry half the worst NOx"
        finding={<p>Below approximately 1050 °C TIT, NOx and CO surge together. These hours are 273 short excursion episodes with a clear spike-and-decay profile, not a steady load band the plant occupies.</p>}
        keyFigures={[
          { value: "5.2% → 48.9%", label: "of hours → of the worst-5% NOx hours (95% CI 45.3–52.4)" },
          { value: "9.4×", label: "risk lift below 1050 °C TIT" },
          { value: "273", label: "episodes in two years; median length 2 hours" },
          { value: "~8 h", label: "for the aligned emissions spike to recover" },
        ]}
        whyItMatters={<p>The target is episodic, not average. Low-load mean NOx is only about 4% above mid-load after de-trending, but dispersion is 2.3× higher; averages hide the event burden.</p>}
        implication={<p>Track the monthly count of TIT &lt; 1050 °C episodes, investigate dispatch/trip/ramp triggers, and report steady-operation emissions separately from excursion hours. The predictor's existing full-model TIT range starts at 1054 °C, just above this independently identified marker.</p>}
        caveat={<>The cut-off is data-chosen and the risk curve rises smoothly as it tightens. TIT marks an excursion and may fall because load was cut; it is not established as the cause.</>}
      >
        <TransientInsightChart />
      </FindingSection>

      <Separator />

      <FindingSection
        number={2}
        title="The physical NOx–CO trade-off is not estimable from this record"
        finding={<p>In the observed record, NOx and CO rise together in every operating regime, most strongly at part load. The association stays positive after controlling for load, firing temperature, weather, and the multi-year drift.</p>}
        keyFigures={[
          { value: "+0.79", label: "part-load Spearman correlation" },
          { value: "+0.43", label: "partial Spearman after all controls" },
          { value: "4.4×", label: "joint worst-10% hours versus chance" },
          { value: "69%", label: "of joint-high hours below 1050 °C TIT" },
        ]}
        whyItMatters={<p>The observed constraint behaves like a common-cause combustion-stability problem, not a choice between two opposing pollutants. That changes the practical recommendation from balancing to stabilising.</p>}
        implication={<p>Use joint NOx-and-CO exceedance as a diagnostic signal for unstable combustion, and investigate the shared excursion state rather than treating CO as a simple constraint to trade against.</p>}
        caveat={<>This does not disprove the physical trade-off at a fixed operating point. No burner setting was deliberately varied, so that curve is unobservable here and swamped by regime variation.</>}
      >
        <TradeoffInsightChart />
      </FindingSection>

      <Separator />

      <FindingSection
        number={3}
        title="Weather sensitivity is a part-load problem"
        finding={<p>Ambient temperature is the strongest raw correlate of NOx, but its effect depends on load. A 1 °C drop adds about 2.4 ppm at 100–120 MW, about 0.4 ppm in the main band, and no statistically distinguishable amount above 150 MW.</p>}
        keyFigures={[
          { value: "−2.44", label: "ppm/°C at 100–120 MW (95% CI −2.82 to −2.07)" },
          { value: "−0.15", label: "ppm/°C at 150–175 MW (CI crosses zero)" },
          { value: "6.6×", label: "stronger at part load than the main band" },
          { value: "18.2% vs 0%", label: "cold-vs-warm rate above 86.2 ppm" },
        ]}
        whyItMatters={<p>The honest weather answer is conditional, not one coefficient. Cold weather and part-load operation compound the transient risk identified in Finding 1.</p>}
        implication={<p>Use seasonal, load-aware guidance: minimise part-load excursions in cold conditions and ambient-adjust performance targets so winter does not automatically look like an underperforming quarter.</p>}
        caveat={<>Load is chosen partly in response to ambient conditions, so the band slopes mix weather with dispatch. The 137–150 MW transitional control region also breaks the otherwise declining gradient.</>}
      >
        <WeatherInsightChart />
      </FindingSection>

      <Separator />

      <FindingSection
        number={4}
        title="Matched Year 2 hours remain 5.45 ppm lower"
        finding={<p>Year 2 mean NOx is 14.2% lower. The plant's primary setpoints barely moved, while AFDP, GTEP, temperature, and humidity moved more; matching balances all nine input sensors before comparing like with like.</p>}
        keyFigures={[
          { value: "70.0 → 60.1", label: "raw mean NOx in ppm (−14.2%)" },
          { value: "−5.45 ppm", label: "matched difference (95% CI −7.93 to −4.25)" },
          { value: "88%", label: "of 955 matched pairs lower in Year 2" },
          { value: "7.7% → 2.3%", label: "hours above 86.2 ppm; a 3.3× reduction" },
        ]}
        whyItMatters={<p>A roughly 10 ppm raw shift is larger than any effect found inside the operating envelope, yet its cause is absent from the data. It could be a real improvement or a measurement change.</p>}
        implication={<p>Ask what changed between years — combustor work, hardware, or analyser calibration — and report NOx by year rather than pooling until that question is resolved.</p>}
        caveat={<>This is association with time, not a cause. Matching balances observed sensors only; fuel composition, water or steam injection, or analyser drift could produce the same result.</>}
      >
        <YearShiftInsightChart />
      </FindingSection>

      <Separator />

      <FindingSection
        number={5}
        title="Random validation masks a cross-year offset"
        finding={<p>The analysis notebooks used random splits on hourly data with 0.91 lag-1 NOx autocorrelation. Neighbouring hours leak across that split, so apparent accuracy collapses under blocked and cross-year tests; rank ordering survives, pointing to recalibration rather than a complete rebuild.</p>}
        keyFigures={[
          { value: "0.86 → 0.03", label: "R² from random split to blocked CV" },
          { value: "−0.16", label: "R² training Year 1 and testing Year 2" },
          { value: "+8.0 ppm", label: "systematic Year-2 over-prediction" },
          { value: "0.50", label: "R² after monthly offset recalibration" },
        ]}
        whyItMatters={<p>It separates a model that scores well in a report from one evaluated as it would be used on a changing plant. The surviving Spearman 0.77 means relative risk ranking remains informative.</p>}
        implication={<p>Re-report notebook metrics with temporal splits, add a monitored monthly offset for models showing the same behaviour, and describe performance according to the actual task: level prediction or risk ranking.</p>}
        scopeNote={<><span className="font-semibold">Scope limit:</span> this finding evaluates a RandomForest reconstruction of the analysis notebooks. The live predictor's three XGBoost artifacts were not tested, so no claim about their accuracy or bias is made here.</>}
        caveat={<>Blocked CV can be pessimistic because some folds extrapolate to unseen seasons. With recalibration, the honest out-of-sample R² range is roughly 0.3–0.5 — neither 0.03 nor 0.70.</>}
      >
        <ValidationInsightChart />
      </FindingSection>

      <Separator />

      <FindingSection
        number={6}
        title="Humidity's raw sign flips after proper conditioning"
        finding={<p>Raw humidity appears positively associated with NOx because humid air is also warm air. After conditioning, the sign is negative in every temperature band. The earlier AT × AH feature is mostly ambient temperature rescaled, not a useful humidity interaction.</p>}
        keyFigures={[
          { value: "+0.086 → −0.171", label: "raw to fully conditioned slope in ppm/%RH" },
          { value: "−7.5 ppm", label: "adjusted change across the observed humidity range" },
          { value: "−0.51", label: "correlation between ambient temperature and humidity" },
          { value: "0.84 vs 0.01", label: "AT × AH correlation with AT versus AH" },
        ]}
        whyItMatters={<p>Correlation-ranked feature selection elevated a feature that teaches little while suppressing variables whose within-band variance was mechanically restricted. Held-out permutation importance gives the more defensible ranking.</p>}
        implication={<p>Use held-out permutation importance, correct reported NOx for humidity when comparing periods, and model the genuine ambient-temperature × load interaction instead of AT × AH.</p>}
        caveat={<>The adjusted slope depends on the control set; humidity, temperature, and air density are physically entangled. It is not a clean causal elasticity, and its magnitude is modest beside load and the year shift.</>}
      >
        <HumidityInsightChart />
      </FindingSection>

      <Separator />

      <section aria-labelledby="synthesis-title" className="space-y-6">
        <div className="max-w-4xl">
          <h2 id="synthesis-title" className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">What the data collectively tells us</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">The six findings reduce to three operating ideas.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2"><div className="font-mono text-sm text-accent">01</div><h3 className="text-lg font-semibold">The problem is concentrated and episodic</h3><p className="text-sm leading-6 text-muted-foreground">Means are nearly flat across load bands; dispersion is not. Five percent of hours carry half the worst NOx, so average reporting hides the target.</p></div>
          <div className="space-y-2"><div className="font-mono text-sm text-accent">02</div><h3 className="text-lg font-semibold">Stability is the observed constraint</h3><p className="text-sm leading-6 text-muted-foreground">NOx and CO rise together across regimes. In this record they share a common operating state rather than presenting an estimable tuning trade-off.</p></div>
          <div className="space-y-2"><div className="font-mono text-sm text-accent">03</div><h3 className="text-lg font-semibold">The machine is not stationary</h3><p className="text-sm leading-6 text-muted-foreground">The year shift and validation result both require year-aware reporting, temporal backtests, and periodic recalibration.</p></div>
        </div>
      </section>

      <section aria-labelledby="limitations-title" className="space-y-6">
        <div className="max-w-4xl">
          <h2 id="limitations-title" className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Limitations</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">These boundaries are part of the result, not footnotes to it.</p>
        </div>
        <ol className="grid gap-4 md:grid-cols-2">
          {limitations.map((limitation, index) => (
            <li key={limitation.title} className="flex gap-4 rounded-lg border bg-card p-4 shadow-sm">
              <span className="font-mono text-sm font-semibold text-accent">{String(index + 1).padStart(2, "0")}</span>
              <div><h3 className="font-semibold">{limitation.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{limitation.detail}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="next-title" className="space-y-6">
        <div className="max-w-4xl">
          <h2 id="next-title" className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">What I would investigate next</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">Four questions would turn the strongest associations into decisions the plant can act on.</p>
        </div>
        <ol className="space-y-4">
          {nextQuestions.map((question, index) => (
            <li key={question.title} className="grid gap-2 border-l-2 border-primary/25 pl-5 sm:grid-cols-[2rem_1fr]">
              <span className="font-mono text-sm font-semibold text-accent">{index + 1}</span>
              <div><h3 className="font-semibold">{question.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{question.detail}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex justify-center pt-2">
        <Button asChild>
          <NavLink to="/">
            <ArrowLeft />
            Return to the predictor
          </NavLink>
        </Button>
      </div>
    </main>
  </div>
);

export default Analysis;
