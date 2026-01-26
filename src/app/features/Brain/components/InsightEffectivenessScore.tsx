'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { InsightEffectiveness } from '@/app/api/brain/insights/effectiveness/route';

interface Props {
  effectiveness: InsightEffectiveness;
  compact?: boolean;
}

/**
 * Per-insight effectiveness indicator.
 * Shows a colored badge with score and before/after rates.
 */
export default function InsightEffectivenessScore({ effectiveness, compact = false }: Props) {
  const { verdict, score, preRate, postRate, reliable, preTotal, postTotal } = effectiveness;

  const colorMap = {
    helpful: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: TrendingUp },
    neutral: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', text: 'text-zinc-400', icon: Minus },
    misleading: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: TrendingDown },
  };

  const style = colorMap[verdict];
  const Icon = style.icon;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${style.bg} ${style.border} border ${style.text}`}
        title={reliable
          ? `Score: ${score > 0 ? '+' : ''}${score}% | Before: ${Math.round(preRate * 100)}% (${preTotal}) → After: ${Math.round(postRate * 100)}% (${postTotal})`
          : `Insufficient data (${preTotal} before, ${postTotal} after)`
        }
      >
        <Icon className="w-3 h-3" />
        {reliable ? `${score > 0 ? '+' : ''}${score}%` : '?'}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${style.bg} ${style.border} border`}>
      <Icon className={`w-3.5 h-3.5 ${style.text}`} />
      <div className="flex flex-col">
        <div className={`text-xs font-medium ${style.text}`}>
          {reliable
            ? `${score > 0 ? '+' : ''}${score}% effectiveness`
            : 'Insufficient data'
          }
        </div>
        {reliable && (
          <div className="text-xs text-zinc-500">
            {Math.round(preRate * 100)}% → {Math.round(postRate * 100)}% acceptance
          </div>
        )}
        {!reliable && (
          <div className="text-xs text-zinc-600">
            Need {3 - Math.min(preTotal, postTotal)} more directions
          </div>
        )}
      </div>
    </div>
  );
}
