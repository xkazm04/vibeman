'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DbScanQueueItem } from '@/app/db/models/types';
import { Loader2, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';

interface ScanQueueProgressProps {
  projectId: string;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export function ScanQueueProgress({
  projectId,
  autoRefresh = true,
  refreshIntervalMs = 2000
}: ScanQueueProgressProps) {
  const [queueItems, setQueueItems] = useState<DbScanQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueueItems = async () => {
    try {
      const response = await fetch(`/api/scan-queue?projectId=${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch queue items');
      }

      setQueueItems(data.queueItems);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueItems();

    if (autoRefresh) {
      const interval = setInterval(fetchQueueItems, refreshIntervalMs);
      return () => clearInterval(interval);
    }
  }, [projectId, autoRefresh, refreshIntervalMs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  // Filter active queue items (queued or running)
  const activeItems = queueItems.filter(
    item => item.status === 'queued' || item.status === 'running'
  );

  // Show recent completed/failed items (last 5)
  const recentItems = queueItems
    .filter(item => item.status === 'completed' || item.status === 'failed')
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Active Queue Items */}
      {activeItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Active Scans
          </h3>
          {activeItems.map(item => (
            <QueueItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Recent Items */}
      {recentItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Scans
          </h3>
          {recentItems.map(item => (
            <QueueItemCard key={item.id} item={item} compact />
          ))}
        </div>
      )}

      {activeItems.length === 0 && recentItems.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          <p>No scan activity</p>
        </div>
      )}
    </div>
  );
}

interface QueueItemCardProps {
  item: DbScanQueueItem;
  compact?: boolean;
}

function QueueItemCard({ item, compact = false }: QueueItemCardProps) {
  const getScanTypeName = (scanType: string): string => {
    const names: Record<string, string> = {
      zen_architect: 'Zen Architect',
      bug_hunter: 'Bug Hunter',
      perf_optimizer: 'Performance Optimizer',
      security_protector: 'Security Protector',
      insight_synth: 'Insight Synthesizer',
      ambiguity_guardian: 'Ambiguity Guardian',
      business_visionary: 'Business Visionary',
      ui_perfectionist: 'UI Perfectionist',
      feature_scout: 'Feature Scout',
      onboarding_optimizer: 'Onboarding Optimizer',
      ai_integration_scout: 'AI Integration Scout',
      delight_designer: 'Delight Designer'
    };

    return names[scanType] || scanType;
  };

  const getStatusIcon = () => {
    switch (item.status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (item.status) {
      case 'running':
        return 'border-blue-500/50 bg-blue-500/5';
      case 'completed':
        return 'border-green-500/50 bg-green-500/5';
      case 'failed':
        return 'border-red-500/50 bg-red-500/5';
      case 'queued':
        return 'border-yellow-500/50 bg-yellow-500/5';
      default:
        return 'border-gray-500/50 bg-gray-500/5';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-4 rounded-lg border ${getStatusColor()}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white truncate">
              {getScanTypeName(item.scan_type)}
            </h4>
            {!compact && item.progress_message && (
              <p className="text-xs text-gray-400 mt-1">{item.progress_message}</p>
            )}
            {compact && item.result_summary && (
              <p className="text-xs text-gray-400 mt-1">{item.result_summary}</p>
            )}
          </div>
        </div>

        {item.status === 'running' && !compact && (
          <div className="text-xs text-gray-400">
            {item.current_step && item.total_steps && (
              <span>
                {item.current_step}/{item.total_steps}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar for Running Items */}
      {item.status === 'running' && !compact && (
        <div className="mt-3">
          <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${item.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">{item.progress}%</span>
            {item.auto_merge_enabled === 1 && (
              <span className="text-xs text-purple-400">Auto-merge enabled</span>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {item.status === 'failed' && item.error_message && !compact && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          {item.error_message}
        </div>
      )}
    </motion.div>
  );
}
