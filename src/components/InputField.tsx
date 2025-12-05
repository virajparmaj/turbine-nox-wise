import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  tooltip: string;
  min: number;
  max: number;
  datasetMin: number;
  datasetMax: number;

  // NEW OPTIONAL PROPS (CORRECT)
  recommendedMin?: number;
  recommendedMax?: number;
}

export const InputField = ({
  label,
  value,
  onChange,
  unit,
  tooltip,
  min,
  max,
  datasetMin,
  datasetMax,
  recommendedMin,
  recommendedMax
}: InputFieldProps) => {

  // Step is calculated correctly
  const step = (max - min) / 20;

  const adjustStep = (dir: "inc" | "dec") => {
    const newValue = dir === "inc" ? value + step : value - step;
    const clamped = Math.max(min, Math.min(max, newValue));
    onChange(Number(clamped.toFixed(2)));
  };

  return (
    <div className="space-y-2">

      {/* Label + Tooltip */}
      <div className="flex items-center gap-2">
        <Label htmlFor={label} className="text-sm font-medium text-foreground">
          {label} <span className="text-muted-foreground">({unit})</span>
        </Label>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Input field */}
      <Input
        id={label}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-mono text-base"
        step={step}
        min={min}
        max={max}
      />

      {/* Increment / Decrement buttons */}
      <div className="flex gap-2 justify-between">
        <Button size="sm" variant="outline" onClick={() => adjustStep("dec")} className="text-xs w-1/2">
          –
        </Button>

        <Button size="sm" variant="outline" onClick={() => adjustStep("inc")} className="text-xs w-1/2">
          +
        </Button>
      </div>

      {/* Dataset Typical Range */}
      <p className="text-xs text-muted-foreground mt-1">
        Typical Range: {datasetMin.toFixed(2)} – {datasetMax.toFixed(2)} (from dataset)
      </p>

      {/* NEW — Recommended Range */}
      {recommendedMin !== undefined && recommendedMax !== undefined && (
        <p className="text-xs font-medium text-green-600 mt-1">
          Recommended Range: {recommendedMin} – {recommendedMax}
        </p>
      )}
    </div>
  );
};