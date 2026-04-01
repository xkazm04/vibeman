'use client';

import React from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  color?: 'purple' | 'cyan';
}

export function ToggleSwitch({ checked, onChange, label, color = 'purple' }: ToggleSwitchProps) {
  const activeColor = color === 'cyan' ? 'bg-cyan-500' : 'bg-purple-500';
  const ringColor = color === 'cyan' ? 'focus-visible:ring-cyan-500/30' : 'focus-visible:ring-purple-500/30';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 outline-none focus-visible:ring-2 ${ringColor} ${
        checked ? activeColor : 'bg-gray-600'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
