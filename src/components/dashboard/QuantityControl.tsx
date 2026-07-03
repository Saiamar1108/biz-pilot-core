import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuantityControl({
  value,
  onChange,
  min = 1,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const boundedValue = max != null ? Math.min(max, value) : value;
  const canIncrease = max == null ? true : boundedValue < max;

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => onChange(Math.max(min, boundedValue - 1))}
        disabled={boundedValue <= min}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        value={boundedValue}
        onChange={(e) => {
          const next = Math.max(min, +e.target.value || min);
          onChange(max != null ? Math.min(max, next) : next);
        }}
        className="w-16 text-center bg-background"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => onChange(max != null ? Math.min(max, boundedValue + 1) : boundedValue + 1)}
        disabled={!canIncrease}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
