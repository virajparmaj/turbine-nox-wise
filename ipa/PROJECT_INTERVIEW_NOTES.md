# Gas Turbine NOx Project — IPA Interview Notes

## 1. The project in 20 seconds

**Problem →** understand when gas-turbine NOx emissions become unusually high. **Data →** 14,310 hourly sensor averages covering two inferred annual cycles. **Analysis →** I examined operating regimes, weather, time drift, pollutant co-movement, and model validation. **Main finding →** 5.2% of hours contained 48.9% of the worst NOx hours, mostly in short sub-1050 °C turbine-inlet-temperature excursions. **Why it matters →** monitoring and investigating those episodes is more useful than optimizing an overall average.

## 2. The project in 60–90 seconds

> This was a team consulting project using gas-turbine data from a Turkish energy provider. The question was which operating and weather conditions were associated with high nitrogen-oxide emissions and what the plant should monitor.
>
> I worked with 14,310 hourly observations and 11 sensor variables. I started with distributions, correlations, load bands, and baseline models, then revisited the structure of the data. Even though there was no timestamp column, very strong hourly and 24-hour autocorrelation showed that the rows were chronological and covered two annual cycles. That changed both the findings and how the models needed to be validated.
>
> The strongest result was that 5.2% of hours contained almost half of the worst NOx hours. They occurred in 273 short episodes below roughly 1050 °C turbine inlet temperature, and CO rose at the same time. I also found that cold weather mattered much more at part load than at full load, and that matched Year 2 hours still averaged 5.45 ppm lower than comparable Year 1 hours, although the cause is unknown. The useful output was a set of monitorable KPIs and better questions for operations—not a causal tuning prescription.

## 3. Know these facts

| Fact | Exact project value |
|---|---|
| Dataset | 14,310 rows × 11 numeric variables; hourly sensor averages |
| Time coverage | Two annual cycles inferred from row order; boundary at row 7,152 |
| Data completeness | 0 missing values; 0 infinite values; 7 duplicate occurrences |
| Inputs | AT, AP, AH, AFDP, GTEP, TIT, TAT, TEY, CDP |
| Outcomes | NOX is the main target; CO is a secondary emissions measure/diagnostic |
| NOx distribution | Mean 65.04; median 63.25; SD 12.12; 95th percentile 86.16; max 119.91 |
| Original TEY segments | ≤136: 10,621 rows; 136–160: 3,012; >160: 677 |
| Main concentration result | TIT <1050: 5.22% of hours, 48.9% of worst-5% NOx hours, 9.36× risk lift |
| Episode result | 747 hours across 273 episodes; median 2 hours; about 136 episodes/year |
| Year comparison | Raw mean NOx 70.01 → 60.07 (−14.2%); matched difference −5.45 ppm, 95% CI [−7.93, −4.25] |
| Weather result | NOx slope −2.44 ppm/°C at 100–120 load versus −0.15 at 150–175, whose CI includes zero |
| Honest model check | Random-split R² 0.862 → blocked-CV R² 0.029 → cross-year R² −0.156 |
| Recalibration result | Year-2 MAE 9.05 → 4.47 ppm; R² recovered to 0.495; Spearman rank correlation 0.772 |

**VERIFY with the client:** the raw file has no dates, permit threshold, or unit metadata. The project labels variables as °C, mbar, bar, %RH, MW, and ppm, but those units are not confirmed in the source file. The 86.16 value is the sample's 95th percentile, **not** a compliance limit.

**Do not mix up model claims:** the final validation finding reconstructs the notebooks' Random Forest approach. It does not evaluate the website's three deployed XGBoost artifacts.

## 4. Three strongest data insights

### 1. A small number of short excursions contain much of the worst NOx

**Finding:** Below roughly 1050 °C TIT, NOx and CO rise sharply in short episodes rather than a sustained load band.

**Evidence:** 5.2% of hours contain 48.9% of worst-5% NOx hours (95% CI 45.3–52.4), a 9.4× lift. There were 273 episodes, median length 2 hours; at onset, mean NOx was 80.1 ppm and mean CO was 7.3 ppm.

**Why it matters:** Averages by load band hide concentrated operational risk.

**Possible implication:** Track episode count and hours below 1050 °C monthly; connect them to dispatch, trip, and ramp logs.

**Caveat:** The threshold was selected from the data and is not a physical constant. TIT may mark an excursion caused by a load cut rather than cause the emissions spike.

### 2. The machine's emissions level shifted between the two inferred years

**Finding:** Year 2 remained cleaner after comparing hours with similar observed operating and ambient conditions.

**Evidence:** Raw mean NOx fell 14.2%. Nearest-neighbour matching across nine standardized sensors retained 955 well-matched comparisons and estimated −5.45 ppm [−7.93, −4.25]; 88.2% of pairs were lower in Year 2.

**Why it matters:** Pooling both years would hide non-stationarity and distort comparisons and models.

**Possible implication:** Request maintenance and analyser-calibration records; report results by year until the shift is explained.

**Caveat:** Matching balances observed variables only. Fuel composition, injection, hardware changes, or analyser drift could create the same pattern.

### 3. Weather sensitivity depends strongly on load

**Finding:** Cold weather is associated with much higher NOx at part load, while the estimated effect above 150 load units is indistinguishable from zero.

**Evidence:** The adjusted slope was −2.44 ppm/°C at 100–120 versus −0.37 at 134–137 and −0.15 [−0.40, +0.10] at 150–175. The coldest decile had mean NOx 76.6 versus 56.5 in the warmest decile; 18.2% versus 0% exceeded the sample's 86.2 threshold.

**Why it matters:** One overall weather coefficient describes no actual operating state.

**Possible implication:** Use load-aware seasonal monitoring and compare performance after ambient adjustment.

**Caveat:** Load was chosen by operators, not randomly assigned, so these slopes mix weather with dispatch decisions.

## 5. Why did I do it this way?

| Likely challenge | Short defensible answer |
|---|---|
| Why focus on NOx? | Reducing NOx was the client's primary question. The final analysis retained CO as a secondary emissions measure and diagnostic because both pollutants rose together during excursions. |
| Why segment by load? | The distribution showed discrete operating modes, and relationships changed across them. The original bands came from the client's operating ranges; the weather analysis used finer bands so a single pooled slope would not hide effect modification. |
| Why use a 95th-percentile threshold? | No permit limit was supplied. I needed an explicit, reproducible definition of an unusually high hour, so I used the worst 5% and clearly avoided calling it a compliance threshold. |
| Why approximately 1050 °C TIT? | I scanned cut-offs from 1035 to 1080 °C and examined risk lift, then checked episode structure with an event study. I treat 1050 as a useful empirical marker, not an exact engineering limit. |
| Why temporal rather than random validation? | Lag-1 NOx autocorrelation was 0.907. A random split puts neighbouring hours in both training and test sets, so it tests interpolation rather than future performance. |
| Why nearest-neighbour matching for the year comparison? | The two years differed in weather and some process variables. Matching compared Year 2 hours with similar Year 1 hours across all nine observed inputs instead of relying on the raw mean difference. |
| Why Spearman/partial correlation for NOx and CO? | CO is skewed and the relationship is not well represented by a straight line. Rank correlation is less sensitive to scale and outliers; residualizing both outcomes tested whether positive co-movement remained after observed controls. |
| Why not trust the highest model score? | The 0.94 per-band Random Forest scores were calculated on the same rows used to fit those models. High in-sample fit is not evidence of deployment performance. |

## 6. Data quality / cleaning

- **Missing values:** none; all 11 columns were numeric.
- **Duplicates:** 7 duplicate occurrences, appearing in two short consecutive runs. They were identified but retained in the final reproducible analysis.
- **Outliers:** the first notebook flagged 194 rows using an absolute z-score above 4 and created a separate `df_clean`, but later work and the final analysis used the full 14,310 rows. No claim should be made that outliers were removed.
- **Physical-range checks:** a later audit used placeholder limits that marked all AFDP and GTEP values out of bounds, plus 245 AH and 19 TEY values. Because the units/bounds were unconfirmed, those flags were not valid grounds for deletion.
- **Inconsistent metadata:** no timestamp or unit dictionary. Time order was inferred from lag structure, daily periodicity, two annual temperature cycles, and a simultaneous seam at row 7,152.
- **Transformations:** the final analysis added a row-time index and inferred year; used spline-de-trended NOx for operating comparisons; log-transformed CO in a controlled regression; standardized nine inputs for matching; and defined TIT/load regimes.
- **Merging:** no raw datasets were merged—the analysis used one CSV. Matching paired comparable observations; the website chart files came from a companion export script using the same source data and validated definitions.
- **Validation:** random split, five contiguous blocked folds, and Year-1-to-Year-2 testing were compared. Weekly block bootstrap confidence intervals and HAC standard errors respected serial dependence.

**How did I know the data/results were reliable enough to analyze?** The file was complete and numeric, its time structure was supported by several independent patterns, and the final results were generated by one reproducible script and carried unchanged into the report, JSON output, chart exports, and website. I also used uncertainty intervals and time-aware validation. That makes the data suitable for exploratory monitoring insights—not for causal, compliance, or cross-turbine claims.

## 7. Theory I must understand

| Concept | Intuitive project-specific explanation |
|---|---|
| Autocorrelation and leakage | Adjacent hours resemble each other. Randomly separating them lets the model learn from near-copies of test observations, making performance look better than a true future forecast. |
| Stationarity and drift | A stationary process keeps the same relationship over time. The Year 1/Year 2 NOx level shift shows that this turbine's response was not stable, so year-aware reporting and recalibration matter. |
| R², MAE, and Spearman | R² measures variance explained and can be negative when a model is worse than predicting the mean. MAE gives average error in outcome units. Spearman measures whether risk ranking survives even when the predicted level is biased. |
| Correlation versus causation | Association shows variables move together; it does not show what would happen if an operator deliberately changed one. TIT can be a marker of a load excursion without causing the emission spike. |
| Confounding / partial correlation | A third variable can create or reverse an apparent relationship. Humidity looked positively related to NOx because humidity and temperature were related; conditioning reversed the sign. |
| Segmentation and interaction | An average effect can hide different behavior in different operating regimes. Weather's relationship with NOx was much stronger at part load, which is an ambient-temperature-by-load interaction. |
| Matching | Matching compares observations that are similar on measured inputs, approximating a like-for-like comparison. It cannot balance variables that were never observed. |
| Confidence intervals with dependent data | Ordinary uncertainty formulas assume independent rows, which hourly data violates. Block bootstrap and HAC methods preserve or adjust for serial dependence, producing more credible intervals. |

## 8. Visualization / KPI defense

| Metric or graph | Why this choice? | What it reveals that a simpler view hides |
|---|---|---|
| Sub-1050 °C episode count and hours | It is observable, repeatable, and tied to the concentrated tail. | Mean NOx by load is nearly flat and hides short high-variance excursions. |
| Worst-5% share and risk lift | It measures concentration without pretending 86.2 is a permit limit. | A mean difference does not show that a small share of time contains almost half the worst hours. |
| Event-study lines around episode onset | Aligning 273 events shows timing and recovery for both pollutants. | A scatterplot cannot show the joint spike at onset and roughly eight-hour decay. |
| Load-band weather slopes with 95% CIs | The estimate and uncertainty are shown together by regime. | A pooled correlation hides that the full-load interval crosses zero. |
| Monthly NOx line plus matched estimate | The line shows persistence and the year seam; matching tests like-for-like hours. | A two-bar yearly mean chart would hide seasonality and operating-condition differences. |
| R² + MAE + Spearman under temporal tests | They separate level accuracy, error size, and rank ordering. | One random-split R² hides leakage and the recoverable cross-year offset. |

**If I could show only one visualization:** the transient event-study plus TIT threshold scan. It tells the entire strongest story: where the risk concentrates, that NOx and CO spike together, that the state is episodic, and why episode count is a practical KPI. I would state that 1050 °C is an empirical marker, not a causal limit.

## 9. Limitations

### What the analysis supports

- Associations and conditional patterns within this turbine's two inferred annual cycles.
- A conservative matched Year 2–Year 1 difference after balancing the nine observed inputs.
- The conclusion that time-aware validation is required for the reconstructed notebook model.

### What I should NOT claim

1. **Causality:** I cannot say lowering TIT causes lower NOx, that weather causes the estimated slope, or that an operational change caused the year shift.
2. **Compliance or precise chronology:** there are no confirmed units, dates, permit limit, maintenance log, or calibration log. The 95th-percentile threshold is not a regulatory standard.
3. **Generalization:** this is one turbine record. I cannot generalize to other assets or claim the deployed XGBoost predictor has the same bias without a separate temporal backtest.

## 10. What I would do next

1. **Resolve the metadata gaps:** obtain timestamps, confirmed units, permit limits, maintenance history, and analyser-calibration records. This would test whether the year shift is real performance or measurement drift.
2. **Explain the episodes:** join the 273 events to dispatch, alarm, trip, and ramp logs. Quantify which events are avoidable and monitor episode rate and duration over time.
3. **Validate forward and test causally:** backtest the deployed XGBoost models on chronological holdouts and new months, monitor offset drift, and—if the client needs the true NOx–CO tuning curve—run a designed fixed-load test with controlled burner-setting changes.

## 11. IPA / public-sector connection

- **Build decision-useful KPIs:** I moved from an average to an episode-based KPI and from one weather coefficient to load-aware segments. The transferable skill is defining metrics that reflect the actual policy or operational risk.
- **Make comparisons fair and auditable:** I checked missingness, duplicate records, hidden time order, drift, and leakage; then used like-for-like matching and temporal validation. Public-sector analysis also needs reproducible methods and defensible comparisons.
- **Communicate uncertainty without losing the decision:** I paired every recommendation with a limitation—especially no causal or compliance claim—while still identifying what to monitor and what data to request next.

## 12. Different audiences

### Data analyst

“TIT below 1050 °C covered 5.22% of observations but 48.9% of the top-5% NOx hours, a 9.36× lift with a bootstrap 95% CI of 45.3%–52.4% for the concentration share. Run-length encoding found 273 episodes, and an aligned event study showed both NOx and CO peaking at onset. The cut-off is data-selected and may be a state marker rather than a causal driver.”

### Agency leadership / policymaker

“A small number of short operating events contained almost half of the highest-emission hours. That suggests monitoring event frequency and duration, then investigating what triggers them, could be more useful than focusing only on annual averages. The data identifies a pattern, not proof that one temperature setting caused it.”

### General public

“Most of the highest pollution readings happened during a relatively small number of short operating disruptions. Finding out why those events occur could help the operator focus attention where the problem is most concentrated.”
