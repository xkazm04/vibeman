'use client';

/**
 * Remote Batch Monitor
 * Shows progress of active batches running on remote device.
 */

import { Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RemoteBatchInfo } from '@/stores/remoteWorkStore';
import RemoteBatchCard from './RemoteBatchCard';

interface RemoteBatchMonitorProps {
  batches: RemoteBatchInfo[];
  isLoading?: boolean;
}

export default function RemoteBatchMonitor({
  batches,
  isLoading,
}: RemoteBatchMonitorProps) {
  // Sort: running first, then pending, then completed/failed
  const sortedBatches = [...batches].sort((a, b) => {
    const statusOrder = { running: 0, pending: 1, paused: 2, completed: 3, failed: 4 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // Keep only recent batches (max 5)
  const displayBatches = sortedBatches.slice(0, 5);

  if (displayBatches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-gray-400">
            Active Batches
          </span>
          {isLoading && (
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          )}
        </div>
      </div>

      {/* Batch Cards */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {displayBatches.map((batch) => (
            <RemoteBatchCard key={batch.batch_id} batch={batch} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
