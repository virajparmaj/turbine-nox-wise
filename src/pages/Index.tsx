import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParameterInput } from "@/components/ParameterInput";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SummaryPanel } from "@/components/SummaryPanel";
import { RotateCcw, Gauge } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Default baseline values
const BASELINE_VALUES = {
  AT: 20,
  AP: 1013,
  AH: 50,
  AFDP: 0.02,
  CDP: 15,
  TIT: 1200,
  TAT: 550,
  TEY: 150,
  GTEP: 1.5,
};

const Index = () => {
  const { toast } = useToast();
  const [parameters, setParameters] = useState(BASELINE_VALUES);
  const [nox, setNox] = useState(0);
  const [baselineNox, setBaselineNox] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate NOx using the mock formula
  const calculateNox = (params: typeof parameters) => {
    return (
      0.5 * params.TIT -
      0.3 * params.AT +
      4 * params.AFDP * 100 + // Scale AFDP for visibility
      0.1 * params.TEY -
      0.2 * params.TAT
    );
  };

  // Generate recommendation based on parameters
  const getRecommendation = () => {
    const { AFDP, AT, TEY, AH, TAT } = parameters;
    
    if (AFDP > 0.03) {
      return "Air filter likely restricted — clean or replace filters.";
    }
    if (AT < 10) {
      return "Cold intake air increasing NOx — adjust firing or use inlet heating.";
    }
    if (TEY > 160) {
      return "Operating at peak load — consider temporary load reduction.";
    }
    if (AH < 30) {
      return "Dry air — expect higher NOx; monitor closely.";
    }
    if (TAT < 520) {
      return "Check exhaust temperature balance — possible combustion inefficiency.";
    }
    return "Operating within normal limits.";
  };

  // Identify primary driver
  const getPrimaryDriver = () => {
    const { AFDP, AT, TEY, AH, TAT } = parameters;
    
    if (AFDP > 0.03) return "air filter differential pressure";
    if (AT < 10) return "low ambient temperature";
    if (TEY > 160) return "high energy yield (peak load)";
    if (AH < 30) return "low ambient humidity";
    if (TAT < 520) return "low turbine exhaust temperature";
    return "standard operating parameters";
  };

  // Calculate on mount and when parameters change
  useEffect(() => {
    setIsCalculating(true);
    // Simulate API delay
    const timer = setTimeout(() => {
      const calculatedNox = calculateNox(parameters);
      setNox(calculatedNox);
      setIsCalculating(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [parameters]);

  // Set baseline on mount
  useEffect(() => {
    setBaselineNox(calculateNox(BASELINE_VALUES));
  }, []);

  const handleReset = () => {
    setParameters(BASELINE_VALUES);
    toast({
      title: "Reset to baseline",
      description: "All parameters have been reset to default values.",
    });
  };

  const updateParameter = (key: keyof typeof parameters, value: number) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Gauge className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-primary">Turbine NOx Advisor</h1>
              <p className="text-sm text-muted-foreground">
                Real-time nitrogen oxide emission prediction and optimization
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input Panel - Spans 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl">Operating Parameters</CardTitle>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <ParameterInput
                    label="Ambient Temperature"
                    value={parameters.AT}
                    onChange={(v) => updateParameter("AT", v)}
                    unit="°C"
                    showAdjustments
                    min={-20}
                    max={50}
                  />
                  <ParameterInput
                    label="Ambient Pressure"
                    value={parameters.AP}
                    onChange={(v) => updateParameter("AP", v)}
                    unit="mbar"
                    min={900}
                    max={1100}
                  />
                  <ParameterInput
                    label="Ambient Humidity"
                    value={parameters.AH}
                    onChange={(v) => updateParameter("AH", v)}
                    unit="%"
                    min={0}
                    max={100}
                  />
                  <ParameterInput
                    label="Air Filter Diff. Pressure"
                    value={parameters.AFDP}
                    onChange={(v) => updateParameter("AFDP", v)}
                    unit="bar"
                    showAdjustments
                    min={0}
                    max={0.1}
                  />
                  <ParameterInput
                    label="Compressor Discharge Pressure"
                    value={parameters.CDP}
                    onChange={(v) => updateParameter("CDP", v)}
                    unit="bar"
                    min={10}
                    max={25}
                  />
                  <ParameterInput
                    label="Turbine Inlet Temperature"
                    value={parameters.TIT}
                    onChange={(v) => updateParameter("TIT", v)}
                    unit="°C"
                    showAdjustments
                    min={1000}
                    max={1500}
                  />
                  <ParameterInput
                    label="Turbine Exhaust Temperature"
                    value={parameters.TAT}
                    onChange={(v) => updateParameter("TAT", v)}
                    unit="°C"
                    showAdjustments
                    min={400}
                    max={650}
                  />
                  <ParameterInput
                    label="Turbine Energy Yield"
                    value={parameters.TEY}
                    onChange={(v) => updateParameter("TEY", v)}
                    unit="MW"
                    showAdjustments
                    min={100}
                    max={200}
                  />
                  <ParameterInput
                    label="Gas Turbine Exhaust Pressure"
                    value={parameters.GTEP}
                    onChange={(v) => updateParameter("GTEP", v)}
                    unit="bar"
                    min={1}
                    max={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary Panel */}
            <SummaryPanel
              nox={nox}
              primaryDriver={getPrimaryDriver()}
              recommendation={getRecommendation()}
            />
          </div>

          {/* Results Panel - Spans 1 column on large screens */}
          <div className="lg:col-span-1">
            <ResultsPanel
              nox={nox}
              baselineNox={baselineNox}
              recommendation={getRecommendation()}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
