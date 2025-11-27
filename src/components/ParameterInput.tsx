import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ParameterInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  showAdjustments?: boolean;
  min?: number;
  max?: number;
}

export const ParameterInput = ({
  label,
  value,
  onChange,
  unit,
  showAdjustments = false,
  min,
  max,
}: ParameterInputProps) => {

  // Dynamic step = 1/20th of full range
  const step =
    min !== undefined && max !== undefined
      ? (max - min) / 20
      : 1; // fallback if no range given

  const adjustStep = (dir: "inc" | "dec") => {
    const newValue = dir === "inc" ? value + step : value - step;

    // clamp within range
    const clampedValue =
      min !== undefined && max !== undefined
        ? Math.min(max, Math.max(min, newValue))
        : newValue;

    onChange(Number(clampedValue.toFixed(2)));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={label} className="text-sm font-medium text-foreground">
        {label} <span className="text-muted-foreground">({unit})</span>
      </Label>

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

      {showAdjustments && (
        <div className="flex justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => adjustStep("dec")}
            className="text-xs w-1/2"
          >
            ➖
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => adjustStep("inc")}
            className="text-xs w-1/2"
          >
            ➕
          </Button>
        </div>
      )}
    </div>
  );
};