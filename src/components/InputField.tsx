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
}

export const InputField = ({ label, value, onChange, unit, tooltip, min, max, datasetMin, datasetMax }: InputFieldProps) => {
  const handleAdjustment = (percentage: number) => {
    const newValue = value * (1 + percentage / 100);
    const clampedValue = Math.max(min, Math.min(max, newValue));
    onChange(Number(clampedValue.toFixed(2)));
  };

  return (
    <div className="space-y-2">
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
      <Input
        id={label}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-mono"
        step="0.01"
        min={min}
        max={max}
      />
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAdjustment(-10)}
          className="text-xs flex-1"
        >
          −10%
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAdjustment(-5)}
          className="text-xs flex-1"
        >
          −5%
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAdjustment(5)}
          className="text-xs flex-1"
        >
          +5%
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAdjustment(10)}
          className="text-xs flex-1"
        >
          +10%
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Typical Range: {datasetMin.toFixed(2)} – {datasetMax.toFixed(2)} (from dataset)
      </p>
    </div>
  );
};
