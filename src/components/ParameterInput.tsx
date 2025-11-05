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
  const handleAdjustment = (percentage: number) => {
    const newValue = value * (1 + percentage / 100);
    const clampedValue = min !== undefined && max !== undefined 
      ? Math.max(min, Math.min(max, newValue))
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
        step="0.01"
        min={min}
        max={max}
      />
      {showAdjustments && (
        <div className="flex gap-1 flex-wrap">
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
      )}
    </div>
  );
};
