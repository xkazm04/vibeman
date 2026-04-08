/**
 * AnomalyBanner – Compact anomaly alert strip for Brain dashboard
 *
 * Displays detected signal anomalies with severity chips and a dismiss button.
 */

'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { SignalAnomaly, AnomalySeverity } from '@/lib/brain/anomalyDetector';

const SEVERITY_STYLES: Record<AnomalySeverity, string> = {
  critical: 'text-red-400 border-red-500/30',
  warning: 'text-amber-400 border-amber-500/30',
  info: 'text-zinc-500 border-zinc-700/50',
};

function AnomalyChip({ anomaly }: { anomaly: SignalAnomaly }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1 py-0.5 rounded-sm border text-2xs font-mono ${SEVERITY_STYLES[anomaly.severity]}`}
      title={anomaly.description}
    >
      <span className="truncate max-w-[180px]">{anomaly.title}</span>
    </span>
  );
}

interface AnomalyBannerProps {
  anomalies: SignalAnomaly[];
  onDismiss: () => void;
}

export default function AnomalyBanner({ anomalies, onDismiss }: AnomalyBannerProps) {
  if (anomalies.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-b border-amber-500/30 bg-zinc-950/80 flex-shrink-0 font-mono">
      <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
      <span className="text-2xs text-amber-400">
        {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'}
      </span>
      {anomalies.some((a) => a.severity === 'critical') && (
        <span className="text-2xs font-mono text-red-400 border border-red-500/30 px-1 py-0.5 rounded-sm">CRIT</span>
      )}
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
        {anomalies.slice(0, 4).map((a) => (
          <AnomalyChip key={a.id} anomaly={a} />
        ))}
        {anomalies.length > 4 && (
          <span className="text-2xs text-zinc-600">+{anomalies.length - 4}</span>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-zinc-600 hover:text-zinc-400 transition-colors"
        aria-label="Dismiss anomaly alerts"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
