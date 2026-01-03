'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import {
  GripVertical,
  Loader2,
  Clock,
  Pause,
  Play,
  X,
  Zap,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { DbScanQueueItem } from '@/app/db/models/types';
import { getScanTypeName, type ScanType } from '@/app/features/Ideas/lib/scanTypes';

interface DraggableQueueProps {
  projectId: string;
  onReorder?: (items: DbScanQueueItem[]) => void;
  className?: string;
}

/**
 * DraggableQueue - Allows reordering of queued scan items via drag-and-drop
 *
 * Only queued items can be reordered. Running items stay at the top.
 */
export default function DraggableQueue({
  projectId,
  onReorder,
  className = '',
}: DraggableQueueProps) {
  const [queueItems, setQueueItems] = useState<DbScanQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchQueueItems = useCallback(async () => {
    try {
      const response = await fetch(`/api/scan-queue?projectId=${projectId}`);
      const data = await response.json();
      if (response.ok) {
        setQueueItems(data.queueItems || []);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchQueueItems();
    const interval = setInterval(fetchQueueItems, 5000);
    return () => clearInterval(interval);
  }, [fetchQueueItems]);

  // Get queued items (reorderable) and running items (fixed at top)
  const runningItems = queueItems.filter(item => item.status === 'running');
  const queuedItems = queueItems.filter(item => item.status === 'queued');

  const handleReorder = (newOrder: DbScanQueueItem[]) => {
    // Update local state immediately for smooth UX
    const updatedItems = [...runningItems, ...newOrder];
    setQueueItems(updatedItems);
    onReorder?.(newOrder);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const orderUpdate = queuedItems.map((item, index) => ({
        id: item.id,
        priority: queuedItems.length - index, // Higher priority = executed first
      }));

      await fetch('/api/scan-queue/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: orderUpdate }),
      });
    } catch (error) {
      console.error('Failed to save order:', error);
    } finally {
      setSaving(false);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= queuedItems.length) return;

    const newItems = [...queuedItems];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    handleReorder(newItems);
  };

  const cancelItem = async (itemId: string) => {
    try {
      await fetch(`/api/scan-queue/${itemId}`, { method: 'DELETE' });
      setQueueItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Failed to cancel item:', error);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (queueItems.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Clock className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Queue is empty</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          Scan Queue
          <span className="text-xs text-gray-500">({queuedItems.length} pending)</span>
        </h3>

        {queuedItems.length > 1 && (
          <button
            onClick={saveOrder}
            disabled={saving}
            className="text-xs px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400
                       rounded-lg border border-cyan-500/30 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Order'}
          </button>
        )}
      </div>

      {/* Running Items (Fixed, not draggable) */}
      {runningItems.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Running</span>
          {runningItems.map(item => (
            <RunningItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Queued Items (Draggable) */}
      {queuedItems.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Queued</span>
          <Reorder.Group
            axis="y"
            values={queuedItems}
            onReorder={handleReorder}
            className="space-y-2"
          >
            {queuedItems.map((item, index) => (
              <DraggableItem
                key={item.id}
                item={item}
                index={index}
                totalItems={queuedItems.length}
                onMoveUp={() => moveItem(index, 'up')}
                onMoveDown={() => moveItem(index, 'down')}
                onCancel={() => cancelItem(item.id)}
              />
            ))}
          </Reorder.Group>
        </div>
      )}

      {/* Instructions */}
      {queuedItems.length > 1 && (
        <p className="text-xs text-gray-600 text-center">
          Drag items to reorder or use arrows. Higher items run first.
        </p>
      )}
    </div>
  );
}

/**
 * Running item card (not draggable)
 */
function RunningItemCard({ item }: { item: DbScanQueueItem }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
    >
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white">
            {getScanTypeName(item.scan_type as ScanType)}
          </span>
          {item.progress_message && (
            <p className="text-xs text-gray-400 truncate">{item.progress_message}</p>
          )}
        </div>
        <div className="text-xs text-blue-400">{item.progress}%</div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${item.progress}%` }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Draggable queue item
 */
function DraggableItem({
  item,
  index,
  totalItems,
  onMoveUp,
  onMoveDown,
  onCancel,
}: {
  item: DbScanQueueItem;
  index: number;
  totalItems: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCancel: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="relative"
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg
                   hover:border-gray-600/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <button
            onPointerDown={(e) => controls.start(e)}
            className="cursor-grab active:cursor-grabbing p-1 -m-1 text-gray-600
                       hover:text-gray-400 transition-colors touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Position Badge */}
          <div className="w-6 h-6 rounded-full bg-gray-700/50 flex items-center justify-center
                          text-xs font-mono text-gray-400">
            {index + 1}
          </div>

          {/* Item Info */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-white">
              {getScanTypeName(item.scan_type as ScanType)}
            </span>
            {item.context_id && (
              <p className="text-xs text-gray-500 truncate">
                Context: {item.context_id.slice(0, 8)}...
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalItems - 1}
              className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

/**
 * Compact queue timeline for sidebar use
 */
export function QueueTimeline({
  items,
  className = '',
}: {
  items: DbScanQueueItem[];
  className?: string;
}) {
  const activeItems = items.filter(i => i.status === 'queued' || i.status === 'running');

  if (activeItems.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-xs text-gray-600">No active scans</p>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {activeItems.slice(0, 5).map((item, index) => (
        <div
          key={item.id}
          className="flex items-center gap-2 text-xs"
        >
          {/* Timeline indicator */}
          <div className="flex flex-col items-center">
            <div
              className={`w-2 h-2 rounded-full ${
                item.status === 'running' ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'
              }`}
            />
            {index < activeItems.length - 1 && (
              <div className="w-px h-4 bg-gray-700" />
            )}
          </div>

          {/* Item name */}
          <span className={item.status === 'running' ? 'text-blue-400' : 'text-gray-500'}>
            {getScanTypeName(item.scan_type as ScanType)}
          </span>

          {/* Status */}
          {item.status === 'running' && (
            <span className="text-blue-400 ml-auto">{item.progress}%</span>
          )}
        </div>
      ))}

      {activeItems.length > 5 && (
        <p className="text-xs text-gray-600 pl-4">
          +{activeItems.length - 5} more in queue
        </p>
      )}
    </div>
  );
}
