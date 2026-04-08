/**
 * useAnomalyDetection – Anomaly state management for Brain dashboard
 *
 * Manages the anomaly list, dismissed state, and provides a callback
 * for useBrainDashboardData to push detected anomalies into.
 */

'use client';

import { useState, useCallback } from 'react';
import type { SignalAnomaly } from '@/lib/brain/anomalyDetector';

export interface AnomalyDetectionState {
  anomalies: SignalAnomaly[];
  anomaliesDismissed: boolean;
  dismissAnomalies: () => void;
  /** Stable callback to pass to useBrainDashboardData's onAnomaliesDetected */
  handleAnomaliesDetected: (detected: SignalAnomaly[]) => void;
}

export function useAnomalyDetection(): AnomalyDetectionState {
  const [anomalies, setAnomalies] = useState<SignalAnomaly[]>([]);
  const [anomaliesDismissed, setAnomaliesDismissed] = useState(false);

  const handleAnomaliesDetected = useCallback((detected: SignalAnomaly[]) => {
    if (detected.length > 0) {
      setAnomalies(detected);
      setAnomaliesDismissed(false);
    } else {
      setAnomalies([]);
    }
  }, []);

  const dismissAnomalies = useCallback(() => {
    setAnomaliesDismissed(true);
  }, []);

  return {
    anomalies,
    anomaliesDismissed,
    dismissAnomalies,
    handleAnomaliesDetected,
  };
}
