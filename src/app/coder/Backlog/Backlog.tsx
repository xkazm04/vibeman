import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Code2, RefreshCw, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBacklogQuery } from '../../../hooks/useBacklogQuery';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useAnalysisStore } from '../../../stores/analysisStore';
import { useRealtimeStore, REALTIME_INDICATORS } from '../../../stores/realtimeStore';
import BacklogItem from './BacklogItem';
import { GlowCard } from '@/components/GlowCard';
import { startCodingTask } from './lib/taskOperations';

export default function Backlog() {
  const { activeProject } = useActiveProjectStore();
  const { isActive } = useAnalysisStore();
  const { isIndicatorActive, getIndicator, setIndicator } = useRealtimeStore();
  const { 
    data,
    isLoading,
    error,
    refetch,
    updateItemOptimistically,
    removeItemOptimistically,
    updateItemOnServer,
    deleteItemOnServer,
    isRefetching
  } = useBacklogQuery(activeProject?.id || null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousItemCountRef = useRef<number>(0);
  const [showAutoOffNotification, setShowAutoOffNotification] = useState(false);

  // Real-time polling effect
  useEffect(() => {
    const isRealtimeActive = isIndicatorActive(REALTIME_INDICATORS.BACKLOG_TASKS);
    const indicator = getIndicator(REALTIME_INDICATORS.BACKLOG_TASKS);
    
    if (isRealtimeActive && indicator?.pollingInterval && activeProject?.id) {
      // Start polling
      pollingIntervalRef.current = setInterval(() => {
        refetch();
      }, indicator.pollingInterval);
    } else {
      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isIndicatorActive(REALTIME_INDICATORS.BACKLOG_TASKS), getIndicator(REALTIME_INDICATORS.BACKLOG_TASKS)?.pollingInterval, activeProject?.id, refetch]);

  // Combine and sort all items, exclude rejected, limit to 20
  const allItems = useMemo(() => {
    if (!data) return [];
    
    const combined = [
      ...data.backlogProposals.filter(item => item.status !== 'rejected'),
      ...data.customBacklogItems.filter(item => item.status !== 'rejected').map(item => ({
        ...item,
        agent: 'developer' as const, // Default custom items to developer for now
        timestamp: item.timestamp
      }))
    ];

    // Sort by timestamp (newest first) and limit to 20 items
    return combined
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
  }, [data]);

  // Effect to detect new items and turn off live mode
  useEffect(() => {
    const currentItemCount = allItems.length;
    const previousItemCount = previousItemCountRef.current;
    
    // If we have more items than before and live mode is active, turn it off
    if (currentItemCount > previousItemCount && 
        previousItemCount > 0 && 
        isIndicatorActive(REALTIME_INDICATORS.BACKLOG_TASKS)) {
      setIndicator(REALTIME_INDICATORS.BACKLOG_TASKS, false);
      
      // Show notification that live mode was turned off
      setShowAutoOffNotification(true);
      setTimeout(() => setShowAutoOffNotification(false), 3000);
    }
    
    // Update the previous count
    previousItemCountRef.current = currentItemCount;
  }, [allItems.length, isIndicatorActive, setIndicator]);




  const handleAcceptTask = async (taskId: string) => {
    try {
      // Optimistically update the UI
      updateItemOptimistically(taskId, { status: 'accepted' });
      
      // Update on server
      await updateItemOnServer(taskId, { status: 'accepted' });
      
      // Start coding task in background using utility
      await startCodingTask(taskId);
    } catch (error) {
      // Revert optimistic update on error
      refetch();
      console.error('Error accepting task:', error);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      // Optimistically update the UI
      updateItemOptimistically(taskId, { status: 'rejected' });
      
      // Update on server
      await updateItemOnServer(taskId, { status: 'rejected' });
    } catch (error) {
      // Revert optimistic update on error
      refetch();
      console.error('Error rejecting task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      // Optimistically remove from UI
      removeItemOptimistically(taskId);
      
      // Delete on server
      await deleteItemOnServer(taskId);
    } catch (error) {
      // Revert optimistic update on error
      refetch();
      console.error('Error deleting task:', error);
    }
  };

  if (isLoading) {
    return (
      <GlowCard className="p-6 h-full flex flex-col max-h-[60vh]">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading backlog items...</div>
        </div>
      </GlowCard>
    );
  }

  if (error) {
    return (
      <GlowCard className="p-6 h-full flex flex-col max-h-[60vh]">
        <div className="flex items-center justify-center h-full">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </GlowCard>
    );
  }

  return (
    <>
      <GlowCard className={`p-6 h-full flex flex-col max-h-[60vh] ${
        isActive ? 'shadow-lg shadow-blue-500/20' : ''
      }`}>        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Backlog</h3>
            <span className="text-sm text-gray-400">({allItems.length})</span>
            {isIndicatorActive(REALTIME_INDICATORS.BACKLOG_TASKS) && (
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                Live
              </span>
            )}
            <AnimatePresence>
              {showAutoOffNotification && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -10 }}
                  className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20 flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" />
                  New items found
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const isRealtimeActive = isIndicatorActive(REALTIME_INDICATORS.BACKLOG_TASKS);
                setIndicator(REALTIME_INDICATORS.BACKLOG_TASKS, !isRealtimeActive, 10000);
                if (!isRealtimeActive) {
                  refetch(); // Immediate refresh when enabling
                }
              }}
              className={`p-2 border border-gray-600/30 rounded-md transition-all ${
                isIndicatorActive(REALTIME_INDICATORS.BACKLOG_TASKS)
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-gray-300'
              }`}
              title={isIndicatorActive(REALTIME_INDICATORS.BACKLOG_TASKS) ? "Disable real-time updates" : "Enable real-time updates"}
            >
              <RefreshCw className={`w-4 h-4 ${isIndicatorActive(REALTIME_INDICATORS.BACKLOG_TASKS) || isRefetching ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto">
          {allItems.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No backlog items yet
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {allItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  className="w-80 flex-shrink-0"
                  initial={data?.newItemIds.has(item.id) ? { 
                    opacity: 0, 
                    y: -20, 
                    scale: 0.95 
                  } : false}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1 
                  }}
                  transition={{ 
                    duration: 0.5, 
                    delay: data?.newItemIds.has(item.id) ? index * 0.1 : 0,
                    ease: "easeOut"
                  }}
                  layout
                >
                  <BacklogItem
                    proposal={item}
                    isNew={data?.newItemIds.has(item.id) || false}
                    onAccept={handleAcceptTask}
                    onReject={handleRejectTask}
                    onDelete={handleDeleteTask}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </GlowCard>
    </>
  );
};