/**
 * IndicatorDots
 *
 * Renders a row of small colored dots for a project button.
 * Each dot has a tooltip (title) explaining its meaning.
 * Dots are sorted by priority (lower = first).
 */

'use client';

import type { ProjectIndicator } from './types';

interface Props {
  indicators: ProjectIndicator[];
}

export function IndicatorDots({ indicators }: Props) {
  if (indicators.length === 0) return null;

  const sorted = [...indicators].sort((a, b) => a.priority - b.priority);

  return (
    <span className="absolute -top-1 -right-1 z-50 flex gap-0.5 pointer-events-auto">
      {sorted.map((indicator) => (
        <span
          key={indicator.id}
          title={indicator.title}
          className={`w-2 h-2 rounded-full ${indicator.color} ring-1 ring-zinc-900 shadow-sm shadow-black/50`}
        />
      ))}
    </span>
  );
}
