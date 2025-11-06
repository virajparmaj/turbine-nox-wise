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
import { evaluateRecommendations } from "@/utils/recommendations";

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

const Index = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<StatsMap | null>(null);
  const [baseline, setBaseline] = useState<Record<string, number>>({});
  const [parameters, setParameters] = useState<Record<string, number>>({});
  const [nox, setNox] = useState<number | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<{ messages: string[]; severity: 'green' | 'yellow' | 'orange' | 'red' }>({
    messages: ["Click Calculate to see recommendations"],
    severity: 'green'
  });
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    parseCSV('/TurbineGroup2.csv').then(csvStats => {
      setStats(csvStats);
      const medians: Record<string, number> = {};
      Object.keys(csvStats).forEach(key => {
        if (key !== 'CO' && key !== 'NOX') {
          medians[key] = csvStats[key as keyof StatsMap].median;
        }
      });
      setBaseline(medians);
      setParameters(medians);
    });
  }, []);

  const handleCalculate = () => {
    setIsCalculating(true);
    
    // Clear previous results to ensure fresh calculation
    setNox(null);
    setDelta(null);
    setRecommendations({ messages: [], severity: 'green' });
    
    // Recalculate NOx with current parameters
    const noxPred = 0.5 * parameters.TIT - 0.3 * parameters.AT + 4.0 * parameters.AFDP + 0.1 * parameters.TEY - 0.2 * parameters.TAT;
    const baselineNox = 0.5 * baseline.TIT - 0.3 * baseline.AT + 4.0 * baseline.AFDP + 0.1 * baseline.TEY - 0.2 * baseline.TAT;
    
    // Set fresh results
    setNox(noxPred);
    setDelta(noxPred - baselineNox);
    setRecommendations(evaluateRecommendations(parameters));
    setIsCalculating(false);
    
    toast({
      title: "Calculation complete",
      description: `NOx emissions: ${noxPred.toFixed(1)} ppm`
    });
  };

  const handleReset = () => {
    setParameters({ ...baseline });
    setNox(null);
    setDelta(null);
    setRecommendations({ messages: ["Click Calculate to see recommendations"], severity: 'green' });
    toast({
      title: "Reset to baseline",
      description: "All parameters reset to median values from dataset"
    });
  };

  const updateParameter = (key: string, value: number) => {
    setParameters(prev => ({ ...prev, [key]: value }));
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

  return (
    <div className="min-h-screen bg-background">
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

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
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

          {/* Right Column - Results */}
          <div className="space-y-6">
            <PredictedNoxCard nox={nox} delta={delta} />
            <RecommendationsCard 
              messages={recommendations.messages} 
              severity={recommendations.severity} 
            />
            <WhatChangedCard baseline={baseline} current={parameters} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
