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
    detail: "Settings were not deliberately changed, so these results show patterns—not cause and effect.",
  },
  {
    title: "No dates, permit limit, or confirmed units",
    detail: "86.2 ppm is a data marker, not a legal or permit limit.",
  },
  {
    title: "The year-over-year cause is unresolved",
    detail: "The drop could be plant improvement or analyser recalibration.",
  },
  {
    title: "The physical NOx–CO trade-off is not disproven",
    detail: "This dataset cannot measure the fixed-setting NOx–CO trade-off.",
  },
  {
    title: "Load is chosen, not assigned",
    detail: "Operators choose load partly because of the weather, so the two effects are mixed.",
  },
  {
    title: "Time order is inferred",
    detail: "The time order and row 7,152 split are inferred, not documented.",
  },
  {
    title: "The deployed predictor was not audited",
    detail: "Validation covers the notebook RandomForest, not this site's three live XGBoost models.",
  },
];

const nextQuestions = [
  {
    title: "What changed on this unit between the two years?",
    detail: "Check maintenance and analyser-calibration logs to explain the year shift.",
  },
  {
    title: "What triggers the sub-1050 °C excursions?",
    detail: "Match the 273 episodes to dispatch, trip, and ramp logs.",
  },
  {
    title: "Do the deployed band models show the same cross-year bias?",
    detail: "Backtest the live XGBoost models on future time periods.",
  },
  {
    title: "What does a designed fixed-load tuning test reveal?",
    detail: "Hold load steady and vary burner settings to measure the real NOx–CO trade-off.",
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
          14,310 hourly readings · two inferred years
        </div>
        <h1 id="analysis-title" className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          What the data tells us
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          This page turns the plant data into practical signals: when NOx spikes, how weather changes the risk, and why the two years do not line up.
        </p>
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
            The data follows time
          </h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            The file has no dates, but temperature repeats two yearly cycles and nearby hours look alike. That makes row 7,152 the likely year boundary—and means the model must be tested on future periods, not random rows.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex gap-3 rounded-lg border bg-card p-4 shadow-sm">
            <Waves className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div><div className="font-mono text-xl font-bold tabular-nums">0.992</div><div className="text-sm text-muted-foreground">Adjacent-hour similarity</div></div>
          </div>
          <div className="flex gap-3 rounded-lg border bg-card p-4 shadow-sm">
            <Clock3 className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div><div className="font-mono text-xl font-bold tabular-nums">0.917</div><div className="text-sm text-muted-foreground">Similarity one day apart</div></div>
          </div>
          <div className="flex gap-3 rounded-lg border bg-card p-4 shadow-sm">
            <Database className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div><div className="font-mono text-xl font-bold tabular-nums">7,152</div><div className="text-sm text-muted-foreground">Likely Year 1 / Year 2 split</div></div>
          </div>
        </div>
      </section>

      <Separator />

      <FindingSection
        number={1}
        title="NOx spikes during short low-temperature events"
        finding={<p>Below 1050 °C TIT, NOx and CO rise together. These are brief events, not a normal operating band.</p>}
        keyFigures={[
          { value: "5% → 49%", label: "normal hours → worst-NOx hours" },
          { value: "9.4×", label: "higher risk below 1050 °C TIT" },
          { value: "273", label: "episodes; usually 2 hours" },
          { value: "~8 h", label: "typical recovery time" },
        ]}
        whyItMatters={<p>Averages hide the problem. A small number of unstable hours create much of the worst NOx.</p>}
        implication={<p>Count low-TIT events each month and check dispatch, trips, and ramps around them. Report event hours separately from steady operation.</p>}
        caveat={<>The cut-off is data-chosen and the risk curve rises smoothly as it tightens. TIT marks an excursion and may fall because load was cut; it is not established as the cause.</>}
      >
        <TransientInsightChart />
      </FindingSection>

      <Separator />

      <FindingSection
        number={2}
        title="NOx and CO rise together"
        finding={<p>Across every operating regime, higher NOx comes with higher CO—especially at part load.</p>}
        keyFigures={[
          { value: "+0.79", label: "part-load relationship" },
          { value: "+0.43", label: "relationship after controls" },
          { value: "4.4×", label: "more joint-high hours than chance" },
          { value: "69%", label: "of joint-high hours below 1050 °C TIT" },
        ]}
        whyItMatters={<p>This looks like one shared instability, not a simple choice between two pollutants.</p>}
        implication={<p>Use simultaneous NOx-and-CO highs as an instability alert and investigate the shared event.</p>}
        caveat={<>This does not disprove the physical trade-off at a fixed operating point. No burner setting was deliberately varied, so that curve is unobservable here and swamped by regime variation.</>}
      >
        <TradeoffInsightChart />
      </FindingSection>

      <Separator />

      <FindingSection
        number={3}
        title="Cold weather matters most at part load"
        finding={<p>A 1 °C drop adds about 2.4 ppm NOx at 100–120 MW, but has little measurable effect above 150 MW.</p>}
        keyFigures={[
          { value: "−2.44", label: "ppm per °C at 100–120 MW" },
          { value: "−0.15", label: "ppm per °C at 150–175 MW" },
          { value: "6.6×", label: "stronger at part load" },
          { value: "18.2% vs 0%", label: "cold vs warm high-NOx rate" },
        ]}
        whyItMatters={<p>Weather risk depends on load. Cold and part-load operation can stack together.</p>}
        implication={<p>Watch part-load operation more closely in cold weather and compare seasons using ambient-adjusted targets.</p>}
        caveat={<>Load is chosen partly in response to ambient conditions, so the band slopes mix weather with dispatch. The 137–150 MW transitional control region also breaks the otherwise declining gradient.</>}
      >
        <WeatherInsightChart />
      </FindingSection>

      <Separator />

      <FindingSection
        number={4}
        title="NOx is lower in Year 2"
        finding={<p>Year 2 NOx is 14.2% lower. The drop remains after comparing hours with similar sensor readings.</p>}
        keyFigures={[
          { value: "70.0 → 60.1", label: "mean NOx, in ppm" },
          { value: "−5.45 ppm", label: "difference after matching" },
          { value: "88%", label: "of matched pairs lower in Year 2" },
          { value: "7.7% → 2.3%", label: "hours above the 86.2 ppm marker" },
        ]}
        whyItMatters={<p>The shift is too large to ignore, but the data cannot say whether the plant improved or the measurement changed.</p>}
        implication={<p>Check maintenance and analyser-calibration logs. Report the years separately until the cause is known.</p>}
        caveat={<>This is association with time, not a cause. Matching balances observed sensors only; fuel composition, water or steam injection, or analyser drift could produce the same result.</>}
      >
        <YearShiftInsightChart />
      </FindingSection>

      <Separator />

      <FindingSection
        number={5}
        title="Random testing overstates model accuracy"
        finding={<p>Random splits let nearby hours appear in both training and testing. When tested on future periods, the model's level accuracy drops—but its risk ranking still helps.</p>}
        keyFigures={[
          { value: "0.86 → 0.03", label: "R²: random test → time-aware test" },
          { value: "−0.16", label: "R² when Year 1 predicts Year 2" },
          { value: "+8.0 ppm", label: "Year 2 over-prediction" },
          { value: "0.50", label: "R² after monthly recalibration" },
        ]}
        whyItMatters={<p>R² measures how well the model gets the level right. The model is better at ranking high-risk hours than predicting the exact level.</p>}
        implication={<p>Use time-based validation and monitor a monthly correction for level drift.</p>}
        scopeNote={<><span className="font-semibold">Scope limit:</span> this finding evaluates a RandomForest reconstruction of the analysis notebooks. The live predictor's three XGBoost artifacts were not tested, so no claim about their accuracy or bias is made here.</>}
        caveat={<>Blocked CV can be pessimistic because some folds extrapolate to unseen seasons. With recalibration, the honest out-of-sample R² range is roughly 0.3–0.5 — neither 0.03 nor 0.70.</>}
      >
        <ValidationInsightChart />
      </FindingSection>

      <Separator />

      <FindingSection
        number={6}
        title="Humidity looks different after accounting for temperature"
        finding={<p>Humidity first looks positive because humid hours are also warmer. Once temperature is accounted for, the relationship becomes negative.</p>}
        keyFigures={[
          { value: "+0.086 → −0.171", label: "raw → adjusted slope" },
          { value: "−7.5 ppm", label: "adjusted change across the range" },
          { value: "−0.51", label: "temperature–humidity relationship" },
          { value: "0.84 vs 0.01", label: "AT × AH tracks AT, not AH" },
        ]}
        whyItMatters={<p>A raw correlation can be misleading when two weather variables move together.</p>}
        implication={<p>Rank features using held-out tests and model temperature × load directly instead of AT × AH.</p>}
        caveat={<>The adjusted slope depends on the control set; humidity, temperature, and air density are physically entangled. It is not a clean causal elasticity, and its magnitude is modest beside load and the year shift.</>}
      >
        <HumidityInsightChart />
      </FindingSection>

      <Separator />

      <section aria-labelledby="synthesis-title" className="space-y-6">
        <div className="max-w-4xl">
          <h2 id="synthesis-title" className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">What the data collectively tells us</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">Three ideas to remember.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2"><div className="font-mono text-sm text-accent">01</div><h3 className="text-lg font-semibold">Spikes are concentrated</h3><p className="text-sm leading-6 text-muted-foreground">A few unstable hours create much of the worst NOx.</p></div>
          <div className="space-y-2"><div className="font-mono text-sm text-accent">02</div><h3 className="text-lg font-semibold">Stability is the signal</h3><p className="text-sm leading-6 text-muted-foreground">NOx and CO rise together, especially during low-TIT events.</p></div>
          <div className="space-y-2"><div className="font-mono text-sm text-accent">03</div><h3 className="text-lg font-semibold">The machine changes</h3><p className="text-sm leading-6 text-muted-foreground">Compare years separately and test models on future data.</p></div>
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
