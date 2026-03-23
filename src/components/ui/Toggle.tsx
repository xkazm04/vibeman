/**
 * Toggle — Reusable boolean toggle switch with label.
 */

'use client';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export default function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative ${
          checked ? 'bg-cyan-600' : 'bg-gray-700'
        }`}
      >
        <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`} />
      </button>
    </div>
  );
}
