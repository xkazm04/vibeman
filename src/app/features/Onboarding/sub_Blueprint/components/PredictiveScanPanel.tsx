'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, TrendingUp, X, Play, RefreshCw, Calendar } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface ScanRecommendation {
  scanType: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  confidenceScore: number;
  stalenessScore: number;
  reasoning: string;
  lastScanAt?: string;
  lastChangeAt?: string;
  nextRecommendedAt?: string;
  predictedFindings?: number;
}

interface PredictiveScanPanelProps {
  onRunScan?: (scanType: string) => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxRecommendations?: number;
}

const positionClasses = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};

export default function PredictiveScanPanel({
  onRunScan,
  position = 'bottom-right',
  maxRecommendations = 3,
}: PredictiveScanPanelProps) {
  const { activeProject } = useActiveProjectStore();
  const [recommendations, setRecommendations] = useState<ScanRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [autoScheduled, setAutoScheduled] = useState(false);

  useEffect(() => {
    if (activeProject?.id) {
      fetchRecommendations();
    }
  }, [activeProject?.id]);

  const fetchRecommendations = async () => {
    if (!activeProject?.id) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/blueprint/scan-predictions?projectId=${activeProject.id}&limit=${maxRecommendations}`
      );
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Error fetching scan recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (scanType: string) => {
    setDismissed((prev) => new Set(prev).add(scanType));
  };

  const handleRunScan = (scanType: string) => {
    if (onRunScan) {
      onRunScan(scanType);
    }
    setDismissed((prev) => new Set(prev).add(scanType));
  };

  const handleAutoSchedule = async () => {
    if (!activeProject?.id) return;

    try {
      const response = await fetch('/api/blueprint/scan-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          action: 'auto-schedule',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAutoScheduled(true);
        setTimeout(() => setAutoScheduled(false), 3000);
      }
    } catch (error) {
      console.error('Error auto-scheduling scans:', error);
    }
  };

  const handleRefresh = async () => {
    if (!activeProject?.id) return;

    setLoading(true);
    try {
      // Generate fresh predictions
      const response = await fetch('/api/blueprint/scan-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProject.id }),
      });

      if (response.ok) {
        await fetchRecommendations();
      }
    } catch (error) {
      console.error('Error refreshing predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const visibleRecommendations = recommendations.filter(
    (rec) => !dismissed.has(rec.scanType) && rec.priority !== 'low'
  );

  if (visibleRecommendations.length === 0) {
    return null;
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 max-w-md`}>
      <AnimatePresence mode="popLayout">
        {/* Panel container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="backdrop-blur-xl bg-gray-900/90 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden"
          data-testid="predictive-scan-panel"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 px-4 py-3 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Smart Scan Recommendations</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
                  data-testid="refresh-predictions-btn"
                  title="Refresh predictions"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Recommendations list */}
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {visibleRecommendations.map((rec, index) => (
              <motion.div
                key={rec.scanType}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`
                  relative rounded-xl p-3 border backdrop-blur-sm
                  ${
                    rec.priority === 'immediate'
                      ? 'bg-red-500/5 border-red-500/30'
                      : rec.priority === 'high'
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-cyan-500/5 border-cyan-500/30'
                  }
                `}
                data-testid={`scan-recommendation-${rec.scanType}`}
              >
                {/* Priority badge */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {rec.priority === 'immediate' ? (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : rec.priority === 'high' ? (
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    )}
                    <h4 className="text-sm font-medium text-white capitalize">
                      {rec.scanType.replace(/_/g, ' ')}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleDismiss(rec.scanType)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                    data-testid={`dismiss-${rec.scanType}-btn`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Reasoning */}
                <p className="text-xs text-gray-400 mb-2 leading-relaxed">{rec.reasoning}</p>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-gray-500">Staleness:</span>
                    <span className="text-white font-medium">{rec.stalenessScore}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-gray-500">Confidence:</span>
                    <span className="text-white font-medium">{rec.confidenceScore}%</span>
                  </div>
                  {rec.predictedFindings !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs col-span-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span className="text-gray-500">Estimated findings:</span>
                      <span className="text-white font-medium">{rec.predictedFindings}</span>
                    </div>
                  )}
                </div>

                {/* Action button */}
                <button
                  onClick={() => handleRunScan(rec.scanType)}
                  className={`
                    w-full px-3 py-2 rounded-lg font-medium text-xs
                    flex items-center justify-center gap-1.5
                    transition-all duration-200 hover:scale-[1.02]
                    ${
                      rec.priority === 'immediate'
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                        : rec.priority === 'high'
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30'
                    }
                  `}
                  data-testid={`run-scan-${rec.scanType}-btn`}
                >
                  <Play className="w-3.5 h-3.5" />
                  Run Scan Now
                </button>
              </motion.div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700/50">
            <button
              onClick={handleAutoSchedule}
              disabled={loading || autoScheduled}
              className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20
                hover:from-cyan-500/30 hover:to-blue-500/30
                border border-cyan-500/30 rounded-lg
                text-sm font-medium text-cyan-100
                flex items-center justify-center gap-2
                transition-all duration-200 disabled:opacity-50
                hover:scale-[1.02]"
              data-testid="auto-schedule-btn"
            >
              <Calendar className="w-4 h-4" />
              {autoScheduled ? 'Scheduled Successfully!' : 'Auto-Schedule All'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
