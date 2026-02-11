'use client';

import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { DesignTestResult } from '@/app/features/Personas/lib/designTypes';

interface DesignTestResultsProps {
  result: DesignTestResult;
}

const FEASIBILITY_CONFIG = {
  ready: {
    icon: CheckCircle,
    label: 'Ready',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/25',
    text: 'text-emerald-400',
  },
  partial: {
    icon: AlertTriangle,
    label: 'Partial',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/25',
    text: 'text-amber-400',
  },
  blocked: {
    icon: XCircle,
    label: 'Blocked',
    bg: 'bg-red-500/15',
    border: 'border-red-500/25',
    text: 'text-red-400',
  },
};

export function DesignTestResults({ result }: DesignTestResultsProps) {
  const config = FEASIBILITY_CONFIG[result.overall_feasibility] || FEASIBILITY_CONFIG.partial;
  const Icon = config.icon;

  return (
    <div className="space-y-3 py-1">
      {/* Feasibility badge */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg} border ${config.border}`}>
          <Icon className={`w-4 h-4 ${config.text}`} />
          <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
        </div>
        <span className="text-xs text-muted-foreground/50">Feasibility Assessment</span>
      </div>

      {/* Confirmed capabilities */}
      {result.confirmed_capabilities.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-wider">
            Confirmed Capabilities
          </h4>
          <div className="space-y-1">
            {result.confirmed_capabilities.map((cap, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-foreground/70">{cap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {result.issues.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-wider">
            Issues
          </h4>
          <div className="space-y-1">
            {result.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-foreground/70">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
