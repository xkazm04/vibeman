/**
 * ToggleGroup — Segmented button group for selecting one of N options.
 */

'use client';

interface ToggleGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export default function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: ToggleGroupProps<T>) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex rounded-lg overflow-hidden border border-gray-700">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-2 py-1.5 text-caption font-medium transition-all
              ${value === opt.value
                ? 'bg-cyan-600/30 text-cyan-300 border-cyan-600/50'
                : 'bg-gray-800/50 text-gray-500 hover:bg-gray-700/50'
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
