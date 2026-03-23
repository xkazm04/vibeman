/**
 * SliderControl — Reusable range slider with label and value display.
 */

'use client';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  valueColor?: string;
}

export default function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = '',
  valueColor = 'text-cyan-400',
}: SliderControlProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-xs font-mono font-bold ${valueColor}`}>
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-gray-700 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-cyan-400/30"
      />
    </div>
  );
}
