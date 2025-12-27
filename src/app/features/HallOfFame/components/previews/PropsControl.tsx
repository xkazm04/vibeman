'use client';

import { PropConfig } from './types';

interface PropsControlProps {
  config: PropConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function PropsControl({ config, value, onChange }: PropsControlProps) {
  if (config.type === 'select' && config.options) {
    return (
      <div>
        <label className="block text-xs text-gray-400 mb-1">{config.label}</label>
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-cyan-500/50 focus:outline-none"
        >
          {config.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (config.type === 'toggle') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-cyan-500 focus:ring-cyan-500/20"
        />
        <span className="text-sm text-gray-300">{config.label}</span>
      </label>
    );
  }

  return null;
}
