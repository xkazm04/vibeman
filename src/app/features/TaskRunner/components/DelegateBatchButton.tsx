'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Wifi } from 'lucide-react';
import { useZenStore } from '@/app/zen/lib/zenStore';
import { pushTasks } from '@/app/zen/sub_ZenControl/lib/offloadApi';
import type { BatchId, BatchState } from '../store';
import { useBatchTasks, isTaskQueued } from '../store';

interface DelegateBatchButtonProps {
  batchId: BatchId;
  batch: BatchState;
  requirements: Array<{
    projectId: string;
    projectName: string;
    projectPath: string;
    requirementName: string;
    content?: string;
  }>;
  onDelegated?: (remoteBatchId: string) => void;
}

/**
 * Delegate Batch Button
 * Appears when device is paired, allows sending batch to remote device
 */
export default function DelegateBatchButton({
  batchId,
  batch,
  requirements,
  onDelegated,
}: DelegateBatchButtonProps) {
  const { pairing } = useZenStore();
  const tasks = useBatchTasks(batchId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show when paired
  if (pairing.status !== 'paired' || !pairing.partnerUrl || !pairing.devicePairId) {
    return null;
  }

  // Get queued tasks that can be delegated
  const queuedTasks = tasks.filter(t => isTaskQueued(t.status));

  if (queuedTasks.length === 0) {
    return null;
  }

  const handleDelegate = async () => {
    if (!pairing.partnerUrl || !pairing.devicePairId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build task payloads from requirements
      const taskPayloads = queuedTasks.map(task => {
        // Parse composite task ID (format: "projectId:requirementName")
        const [taskProjectId, taskRequirementName] = task.id.includes(':')
          ? task.id.split(':')
          : [null, task.id];

        // Find matching requirement
        const req = requirements.find(r => {
          if (taskProjectId) {
            return r.projectId === taskProjectId && r.requirementName === taskRequirementName;
          }
          return r.requirementName === taskRequirementName;
        });

        return {
          requirementName: req?.requirementName || taskRequirementName || task.id,
          requirementContent: req?.content || '',
          priority: 5,
        };
      });

      // Push to remote device
      const result = await pushTasks(
        pairing.partnerUrl,
        pairing.devicePairId,
        taskPayloads
      );

      console.log(`✅ Delegated ${result.queued} tasks to remote device`);

      // Notify parent
      if (onDelegated) {
        onDelegated(`remote_${batchId}_${Date.now()}`);
      }

    } catch (err) {
      console.error('Failed to delegate batch:', err);
      setError(err instanceof Error ? err.message : 'Failed to delegate');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleDelegate}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/50 rounded text-purple-400 text-[10px] font-medium transition-all disabled:opacity-50"
        title={`Delegate ${queuedTasks.length} tasks to ${pairing.partnerDeviceName || 'remote device'}`}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Send className="w-3 h-3" />
        )}
        <span>Delegate</span>
        <span className="px-1 py-0.5 bg-purple-500/30 rounded text-[9px]">
          {queuedTasks.length}
        </span>
      </motion.button>

      {/* Connection indicator */}
      <div className="absolute -top-1 -right-1">
        <Wifi className="w-2.5 h-2.5 text-purple-400" />
      </div>

      {/* Error tooltip */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-1 left-0 right-0 p-2 bg-red-500/20 border border-red-500/50 rounded text-[9px] text-red-400 whitespace-nowrap z-50"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
