'use client';

import {
  Plug,
  Zap,
  Shield,
  Clock,
  Code,
  Brain,
  Settings,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import type { DesignHighlight } from '@/app/features/Personas/lib/designTypes';

const ICON_MAP: Record<string, LucideIcon> = {
  Plug,
  Zap,
  Shield,
  Clock,
  Code,
  Brain,
  Settings,
  AlertTriangle,
};

interface DesignHighlightsGridProps {
  highlights: DesignHighlight[];
}

export function DesignHighlightsGrid({ highlights }: DesignHighlightsGridProps) {
  if (!highlights || highlights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
      {highlights.map((highlight, index) => {
        const IconComponent = ICON_MAP[highlight.icon] || Settings;

        return (
          <div
            key={index}
            className="bg-secondary/30 backdrop-blur-sm border border-primary/15 shadow-[0_0_20px_rgba(59,130,246,0.03)] rounded-2xl p-3 space-y-2.5"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center flex-shrink-0">
                <IconComponent className={`w-4 h-4 ${highlight.color || 'text-muted-foreground/60'}`} />
              </div>
              <h4 className="text-sm font-medium text-foreground/80 leading-tight">
                {highlight.category}
              </h4>
            </div>

            {/* Bullet points */}
            <ul className="space-y-1.5 pl-0.5">
              {highlight.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="flex items-start gap-2 text-sm text-muted-foreground/60 leading-relaxed"
                >
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    highlight.color?.replace('text-', 'bg-') || 'bg-muted-foreground/30'
                  }`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
