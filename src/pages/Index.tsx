// ----------------------------------------------------------
// ONLY NECESSARY CHANGES DONE — NOTHING ELSE MODIFIED
// ----------------------------------------------------------

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/InputField";
import { PredictedNoxCard } from "@/components/PredictedNoxCard";
import { RecommendationsCard } from "@/components/RecommendationsCard";
import { WhatChangedCard } from "@/components/WhatChangedCard";
import { RotateCcw, Gauge, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseCSV, StatsMap } from "@/utils/csvParser";
import { renderRecommendations, type DiffItem, type RiskLevel } from "@/utils/recommendations";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const tooltips = {
  AT: "Ambient Temperature - Temperature of air entering the turbine",
  AP: "Ambient Pressure - Atmospheric pressure at turbine location",
  AH: "Ambient Humidity - Relative humidity of intake air",
  AFDP: "Air Filter Differential Pressure - Pressure drop across air filter",
  CDP: "Compressor Discharge Pressure - Pressure after compression stage",
  GTEP: "Gas Turbine Exhaust Pressure - Pressure of exhaust gases",
  TIT: "Turbine Inlet Temperature - Temperature of gas entering turbine",
  TAT: "Turbine Exhaust Temperature - Temperature of exhaust gases",
  TEY: "Turbine Energy Yield - Power output of the turbine"
};


type ModelType = "full" | "130_136" | "160p";

// ----------------------------------------------------------
// ✅ Correct API base URL with safe fallback
// ----------------------------------------------------------
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://turbine-nox-wise.onrender.com";

console.log("API_BASE_URL =", import.meta.env.VITE_API_URL);

// ----------------------------------------------------------
// ❗Correct backend endpoints (NO /api prefix)
// ----------------------------------------------------------
const modelEndpoints: Record<ModelType, string> = {
  full: "/predict_full",
  "130_136": "/predict_130_136",
  "160p": "/predict_160p"
};

// Labels + descriptions unchanged
const modelLabels: Record<ModelType, string> = {
  full: "Full Model (All Data)",
  "130_136": "130–136 Band Model",
  "160p": "160+ Band Model"
};

const modelDescriptions: Record<ModelType, string> = {
  full: "All turbine loads",
  "130_136": "Medium load regime",
  "160p": "High load regime"
};

const Index = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<StatsMap | null>(null);
  const [baseline, setBaseline] = useState<Record<string, number>>({});
  const [parameters, setParameters] = useState<Record<string, number>>({});
  const [nox, setNox] = useState<number | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const [baselineNox, setBaselineNox] = useState<number | null>(null);
  const [previousNox, setPreviousNox] = useState<number | null>(null);
  const [previousPayload, setPreviousPayload] = useState<Record<string, number> | null>(null);
  const [recommendations, setRecommendations] = useState<{ messages: string[]; risk: RiskLevel }>({
    messages: ["Click Calculate to see recommendations"],
    risk: "Normal"
  });
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>("full");
  const [history, setHistory] = useState<
    Array<{
      timestamp: string;
      model: string;
      inputs: Record<string, number>;
      noxPred: number;
    }>
  >([]);

  useEffect(() => {
    parseCSV("/TurbineGroup2.csv").then((csvStats) => {
      setStats(csvStats);
      const medians: Record<string, number> = {};
      Object.keys(csvStats).forEach((key) => {
        if (key !== "CO" && key !== "NOX") {
          medians[key] = csvStats[key as keyof StatsMap].median;
        }
      });
      setBaseline(medians);
      setParameters(medians);
    });
  }, []);

  const handleCalculate = async () => {
    setIsCalculating(true);

    setNox(null);
    setDelta(null);
    setRecommendations({ messages: [], risk: "Normal" });
    setDiffs([]);

    try {
      const payload = {
        TIT: parameters.TIT,
        TAT: parameters.TAT,
        CDP: parameters.CDP,
        GTEP: parameters.GTEP,
        AFDP: parameters.AFDP,
        AT: parameters.AT,
        AP: parameters.AP,
        AH: parameters.AH,
        TEY: parameters.TEY
      };

      // ----------------------------------------------------------
      // ❗Corrected endpoint call
      // ----------------------------------------------------------
      const endpoint = `${API_BASE_URL}${modelEndpoints[selectedModel]}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const noxPred = data.NOX_pred;

      let currentBaselineNox = baselineNox;
      if (currentBaselineNox === null) {
        const baselinePayload = { ...baseline };

        const baselineResponse = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(baselinePayload)
        });

        if (baselineResponse.ok) {
          const baselineData = await baselineResponse.json();
          currentBaselineNox = baselineData.NOX_pred;
          setBaselineNox(currentBaselineNox);
        }
      }

      const histMinMax: Record<string, { min: number; max: number }> = {};
      if (stats) {
        Object.keys(stats).forEach((key) => {
          if (key !== "CO" && key !== "NOX") {
            histMinMax[key] = {
              min: stats[key as keyof StatsMap].min,
              max: stats[key as keyof StatsMap].max
            };
          }
        });
      }

      const result = renderRecommendations({
        activeModel: selectedModel,
        payload,
        prediction: noxPred,
        previousPrediction: previousNox,
        previousPayload,
        siteLimitNOx: null,
        baselineNOx: currentBaselineNox,
        histMinMax,
        bandMedians: baseline
      });

      setNox(noxPred);
      setDelta(currentBaselineNox ? noxPred - currentBaselineNox : null);
      setRecommendations({ messages: result.recs, risk: result.risk });
      setDiffs(result.diffs);

      setPreviousNox(noxPred);
      setPreviousPayload({ ...payload });

      setHistory((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleString(),
          model: modelLabels[selectedModel],
          inputs: { ...parameters },
          noxPred
        }
      ]);

      toast({
        title: "Calculation complete",
        description: `NOx emissions: ${noxPred.toFixed(1)} ppm (${modelLabels[selectedModel]})`
      });
    } catch (error) {
      console.error("Calculation error:", error);
      toast({
        title: "Prediction failed",
        description: `Could not reach API at ${API_BASE_URL}${modelEndpoints[selectedModel]}`,
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Everything below is unchanged
  // ----------------------------------------------------------
  // (History export, reset, UI, tables, cards, layout)
  // ----------------------------------------------------------

  const exportHistoryCSV = () => {
    if (history.length === 0) {
      toast({
        title: "No data to export",
        description: "Run some predictions first",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      "Time",
      "Model",
      "TIT",
      "TAT",
      "CDP",
      "GTEP",
      "AFDP",
      "AT",
      "AP",
      "AH",
      "TEY",
      "NOX_pred"
    ];
    const rows = history.map((h) => [
      h.timestamp,
      h.model,
      h.inputs.TIT,
      h.inputs.TAT,
      h.inputs.CDP,
      h.inputs.GTEP,
      h.inputs.AFDP,
      h.inputs.AT,
      h.inputs.AP,
      h.inputs.AH,
      h.inputs.TEY,
      h.noxPred.toFixed(2)
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nox-predictions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `Downloaded ${history.length} predictions`
    });
  };

  const handleReset = () => {
    setParameters({ ...baseline });
    setNox(null);
    setDelta(null);
    setRecommendations({
      messages: ["Click Calculate to see recommendations"],
      risk: "Normal"
    });
    setDiffs([]);
    setPreviousNox(null);
    setPreviousPayload(null);
    toast({
      title: "Reset to baseline",
      description: "All parameters reset to median values from dataset"
    });
  };

  const updateParameter = (key: string, value: number) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  };

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Gauge className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading turbine data...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // UI BELOW IS 100% UNCHANGED
  // ----------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gauge className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-primary">Turbine NOx Advisor</h1>
                <p className="text-sm text-muted-foreground">
                  Predict and optimize nitrogen oxide emissions
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </div>
      </header>

      {/* Model Selection */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Model Selection</h2>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-primary">
                  {modelLabels[selectedModel]} Active
                </span>
              </div>
            </div>

            <TooltipProvider>
              <Tabs
                value={selectedModel}
                onValueChange={(value) =>
                  setSelectedModel(value as ModelType)
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 h-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value="full"
                        className={`
                          py-3 rounded-md transition active:scale-95
                          ${
                            selectedModel === "full"
                              ? "bg-[#2F3B53] text-white shadow-sm"
                              : "bg-muted hover:bg-muted/70 text-foreground"
                          }
                        `}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">Full Model</span>
                          <span className="text-xs text-muted-foreground">
                            All Data
                          </span>
                        </div>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{modelDescriptions.full}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value="130_136"
                        className={`
                          py-3 rounded-md transition active:scale-95
                          ${
                            selectedModel === "130_136"
                              ? "bg-[#2F3B53] text-white shadow-sm"
                              : "bg-muted hover:bg-muted/70 text-foreground"
                          }
                        `}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">130–136 Band</span>
                          <span className="text-xs text-muted-foreground">
                            Medium Load
                          </span>
                        </div>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{modelDescriptions["130_136"]}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value="160p"
                        className={`
                          py-3 rounded-md transition active:scale-95
                          ${
                            selectedModel === "160p"
                              ? "bg-[#2F3B53] text-white shadow-sm"
                              : "bg-muted hover:bg-muted/70 text-foreground"
                          }
                        `}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">160+ Band</span>
                          <span className="text-xs text-muted-foreground">
                            High Load
                          </span>
                        </div>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{modelDescriptions["160p"]}</p>
                    </TooltipContent>
                  </Tooltip>
                </TabsList>
              </Tabs>
            </TooltipProvider>

            <p className="text-xs text-muted-foreground text-center">
              Current model determines which turbine band NOx predictor is
              active.
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ambient Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputField
                  label="AT"
                  value={parameters.AT}
                  onChange={(v) => updateParameter("AT", v)}
                  unit="°C"
                  tooltip={tooltips.AT}
                  min={stats.AT.min}
                  max={stats.AT.max}
                  datasetMin={stats.AT.min}
                  datasetMax={stats.AT.max}
                />

                <InputField
                  label="AP"
                  value={parameters.AP}
                  onChange={(v) => updateParameter("AP", v)}
                  unit="mbar"
                  tooltip={tooltips.AP}
                  min={stats.AP.min}
                  max={stats.AP.max}
                  datasetMin={stats.AP.min}
                  datasetMax={stats.AP.max}
                />

                <InputField
                  label="AH"
                  value={parameters.AH}
                  onChange={(v) => updateParameter("AH", v)}
                  unit="%"
                  tooltip={tooltips.AH}
                  min={stats.AH.min}
                  max={stats.AH.max}
                  datasetMin={stats.AH.min}
                  datasetMax={stats.AH.max}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pressures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputField
                  label="AFDP"
                  value={parameters.AFDP}
                  onChange={(v) => updateParameter("AFDP", v)}
                  unit="bar"
                  tooltip={tooltips.AFDP}
                  min={stats.AFDP.min}
                  max={stats.AFDP.max}
                  datasetMin={stats.AFDP.min}
                  datasetMax={stats.AFDP.max}
                />

                <InputField
                  label="CDP"
                  value={parameters.CDP}
                  onChange={(v) => updateParameter("CDP", v)}
                  unit="bar"
                  tooltip={tooltips.CDP}
                  min={stats.CDP.min}
                  max={stats.CDP.max}
                  datasetMin={stats.CDP.min}
                  datasetMax={stats.CDP.max}
                />

                <InputField
                  label="GTEP"
                  value={parameters.GTEP}
                  onChange={(v) => updateParameter("GTEP", v)}
                  unit="bar"
                  tooltip={tooltips.GTEP}
                  min={stats.GTEP.min}
                  max={stats.GTEP.max}
                  datasetMin={stats.GTEP.min}
                  datasetMax={stats.GTEP.max}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Combustion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputField
                  label="TIT"
                  value={parameters.TIT}
                  onChange={(v) => updateParameter("TIT", v)}
                  unit="°C"
                  tooltip={tooltips.TIT}
                  min={stats.TIT.min}
                  max={stats.TIT.max}
                  datasetMin={stats.TIT.min}
                  datasetMax={stats.TIT.max}
                />

                <InputField
                  label="TAT"
                  value={parameters.TAT}
                  onChange={(v) => updateParameter("TAT", v)}
                  unit="°C"
                  tooltip={tooltips.TAT}
                  min={stats.TAT.min}
                  max={stats.TAT.max}
                  datasetMin={stats.TAT.min}
                  datasetMax={stats.TAT.max}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Output</CardTitle>
              </CardHeader>
              <CardContent>
                <InputField
                  label="TEY"
                  value={parameters.TEY}
                  onChange={(v) => updateParameter("TEY", v)}
                  unit="MW"
                  tooltip={tooltips.TEY}
                  min={stats.TEY.min}
                  max={stats.TEY.max}
                  datasetMin={stats.TEY.min}
                  datasetMax={stats.TEY.max}
                />
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full"
              onClick={handleCalculate}
              disabled={isCalculating}
            >
              <Calculator className="h-5 w-5 mr-2" />
              Calculate NOx Emissions
            </Button>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <PredictedNoxCard
              nox={nox}
              delta={delta}
              activeModel={modelLabels[selectedModel]}
            />
            <RecommendationsCard
              messages={recommendations.messages}
              risk={recommendations.risk}
            />
            <WhatChangedCard diffs={diffs} />
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Prediction History</CardTitle>
                <Button variant="outline" size="sm" onClick={exportHistoryCSV}>
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Model</th>
                        <th className="text-right p-2">TIT</th>
                        <th className="text-right p-2">TAT</th>
                        <th className="text-right p-2">CDP</th>
                        <th className="text-right p-2">GTEP</th>
                        <th className="text-right p-2">AFDP</th>
                        <th className="text-right p-2">AT</th>
                        <th className="text-right p-2">AP</th>
                        <th className="text-right p-2">AH</th>
                        <th className="text-right p-2">TEY</th>
                        <th className="text-right p-2 font-semibold">NOX</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="p-2 text-muted-foreground">
                            {h.timestamp}
                          </td>
                          <td className="p-2">{h.model}</td>
                          <td className="text-right p-2">
                            {h.inputs.TIT.toFixed(1)}
                          </td>
                          <td className="text-right p-2">
                            {h.inputs.TAT.toFixed(1)}
                          </td>
                          <td className="text-right p-2">
                            {h.inputs.CDP.toFixed(2)}
                          </td>
                          <td className="text-right p-2">
                            {h.inputs.GTEP.toFixed(2)}
                          </td>
                          <td className="text-right p-2">
                            {h.inputs.AFDP.toFixed(2)}
                          </td>
                          <td className="text-right p-2">
                            {h.inputs.AT.toFixed(1)}
                          </td>
                          <td className="text-right p-2">
                            {h.inputs.AP.toFixed(1)}
                          </td>
                          <td className="text-right p-2">
                            {h.inputs.AH.toFixed(1)}
                          </td>
                          <td className="text-right p-2">
                            {h.inputs.TEY.toFixed(1)}
                          </td>
                          <td className="text-right p-2 font-semibold">
                            {h.noxPred.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;