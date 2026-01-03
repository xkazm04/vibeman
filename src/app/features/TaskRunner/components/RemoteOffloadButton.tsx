'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Wifi, WifiOff, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { useSupabaseRealtimeStore, useIsPaired } from '@/app/zen/sub_ZenControl/lib/supabaseRealtimeStore';

interface RemoteOffloadButtonProps {
  taskIds: string[];
  requirements: Array<{
    projectId: string;
    projectPath: string;
    requirementName: string;
  }>;
  onSuccess?: () => void;
}

/**
 * Remote Offload Button
 * Delegates selected tasks to a paired remote device via Supabase
 */
export default function RemoteOffloadButton({
  taskIds,
  requirements,
  onSuccess,
}: RemoteOffloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const store = useSupabaseRealtimeStore();
  const isPaired = useIsPaired();
  const { deviceId, projectId, pairing, connection } = store;

  // Filter requirements that match the selected task IDs
  const selectedRequirements = requirements.filter((req) =>
    taskIds.includes(`${req.projectId}:${req.requirementName}`)
  );

  const handleOffload = async () => {
    if (!deviceId || !projectId || selectedRequirements.length === 0) {
      setError('No tasks selected or not connected');
      return;
    }

    setIsSending(true);
    setSentCount(0);
    setError(null);

    try {
      // Send each requirement as an offload task
      for (const req of selectedRequirements) {
        const response = await fetch('/api/bridge/realtime/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            sourceDeviceId: deviceId,
            requirementName: req.requirementName,
            requirementContent: `Execute requirement: ${req.requirementName}`,
            contextPath: req.projectPath,
            targetDeviceId: pairing.partnerId || undefined,
            priority: 5,
            metadata: {
              projectId: req.projectId,
              projectPath: req.projectPath,
            },
          }),
        });

        const result = await response.json();
        if (result.success) {
          setSentCount((prev) => prev + 1);
        } else {
          console.error('Failed to offload task:', result.error);
        }
      }

      // Success - close panel after brief delay
      setTimeout(() => {
        setIsOpen(false);
        setSentCount(0);
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to offload tasks');
    }

    setIsSending(false);
  };

  // Don't render if not connected
  if (!connection.isConnected) {
    return null;
  }

  // Disabled state if not paired
  if (!isPaired) {
    return (
      <button
        disabled
        className="text-xs px-2 py-1 bg-gray-700/30 text-gray-500 rounded flex items-center gap-1 cursor-not-allowed"
        title="Pair with another device to offload tasks"
      >
        <WifiOff className="w-3 h-3" />
        <span>Remote</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={taskIds.length === 0}
        className={`
          text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors
          ${taskIds.length > 0
            ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30'
            : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
          }
        `}
        data-testid="remote-offload-button"
      >
        <Upload className="w-3 h-3" />
        <span>Remote ({taskIds.length})</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full mt-2 right-0 z-50 w-80 bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500/30 rounded-lg shadow-xl p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-400">
                  Remote Offload
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Partner info */}
            <div className="mb-4 p-2 bg-gray-800/50 rounded border border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-gray-300">
                  {pairing.partnerName || 'Partner Device'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedRequirements.length} task{selectedRequirements.length !== 1 ? 's' : ''} will be sent
              </p>
            </div>

            {/* Task list */}
            <div className="mb-4 max-h-32 overflow-y-auto space-y-1">
              {selectedRequirements.map((req) => (
                <div
                  key={`${req.projectId}:${req.requirementName}`}
                  className="text-xs text-gray-400 truncate p-1 bg-gray-800/30 rounded"
                >
                  {req.requirementName}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            )}

            {/* Progress */}
            {isSending && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Sending...</span>
                  <span>{sentCount} / {selectedRequirements.length}</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(sentCount / selectedRequirements.length) * 100}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleOffload}
                disabled={isSending || selectedRequirements.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : sentCount === selectedRequirements.length && sentCount > 0 ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>
                  {isSending
                    ? 'Sending...'
                    : sentCount === selectedRequirements.length && sentCount > 0
                    ? 'Sent!'
                    : `Offload ${selectedRequirements.length} Tasks`}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
