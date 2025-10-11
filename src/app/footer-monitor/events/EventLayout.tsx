'use client';
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Info, AlertTriangle, XCircle, CheckCircle, Maximize2, Minimize2, ChevronUp, ChevronDown } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { GlowCard } from '@/components/GlowCard';
import EventTable from './EventTable';

const MAX_EVENTS = 50;

export default function EventLayout() {
  const {
    events: eventLog,
    isLoading,
    error,
    isConnected,
    isPolling,
    lastUpdated
  } = useRealtimeEvents({ limit: MAX_EVENTS });
  const { isActive } = useAnalysisStore();
  const [filter, setFilter] = useState('all');
  const [viewState, setViewState] = useState<'normal' | 'maximized' | 'minimized'>('minimized');

  const limitedEvents = useMemo(() => {
    return eventLog.slice(0, MAX_EVENTS);
  }, [eventLog]);

  const filteredEvents = useMemo(() => {
    return filter === 'all' ? limitedEvents : limitedEvents.filter(event => event.type === filter);
  }, [limitedEvents, filter]);

  const eventCounts = useMemo(() => {
    return limitedEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [limitedEvents]);

  const filterOptions = [
    { value: 'all', label: 'All', icon: null, count: limitedEvents.length },
    { value: 'info', label: 'Info', icon: Info, count: eventCounts.info || 0 },
    { value: 'warning', label: 'Warning', icon: AlertTriangle, count: eventCounts.warning || 0 },
    { value: 'error', label: 'Error', icon: XCircle, count: eventCounts.error || 0 },
    { value: 'success', label: 'Success', icon: CheckCircle, count: eventCounts.success || 0 },
  ];

  const getFilterColor = (type: string) => {
    switch (type) {
      case 'info': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
      case 'warning': return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400';
      case 'error': return 'border-red-500/50 bg-red-500/10 text-red-400';
      case 'success': return 'border-green-500/50 bg-green-500/10 text-green-400';
      default: return 'border-gray-500/50 bg-gray-500/10 text-gray-400';
    }
  };

  const getContainerHeight = () => {
    switch (viewState) {
      case 'maximized': return 'h-[80vh]';
      case 'minimized': return 'h-12';
      case 'normal':
      default: return 'h-[25vh]';
    }
  };

  return (
    <>
      <motion.div
        className={`fixed bottom-0 left-0 right-0 z-50 ${getContainerHeight()} transition-all duration-300 ease-in-out`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <GlowCard className={`p-4 h-full flex flex-col relative shadow-[0_-4px_20px_rgba(255,255,255,0.1)] border-t-white/20 ${viewState === 'minimized' ? 'items-center justify-center' : ''
          } ${isActive ? 'shadow-lg shadow-blue-500/20' : ''}`}>
          {/* Control Buttons - Top Right */}
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            {viewState !== 'minimized' && (
              <>
                <button
                  onClick={() => setViewState(viewState === 'maximized' ? 'normal' : 'maximized')}
                  className="p-1.5 cursor-pointer rounded-md bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 transition-all"
                  title={viewState === 'maximized' ? 'Restore' : 'Maximize'}
                >
                  {viewState === 'maximized' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setViewState('minimized')}
                  className="p-1.5 cursor-pointer rounded-md bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 transition-all"
                  title="Minimize"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Minimized State */}
          {viewState === 'minimized' && (
            <button
              onClick={() => setViewState('normal')}
              className="flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 transition-all"
              title="Expand Event Log"
            >
              <ChevronUp className="w-4 h-4" />
              <span className="text-sm font-medium">
                Event Log ({limitedEvents.length})
                {isLoading && <span className="ml-1 animate-pulse">⟳</span>}
                {isPolling && <span className="ml-1 text-blue-400 animate-pulse">📡</span>}
                {isConnected && !isPolling && <span className="ml-1 text-green-400">🟢</span>}
                {!isConnected && !isPolling && <span className="ml-1 text-yellow-400">🟡</span>}
                {error && <span className="ml-1 text-red-400">⚠</span>}
              </span>
            </button>
          )}

          {/* Normal/Maximized State */}
          {viewState !== 'minimized' && (
            <>
              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2 mb-4 pr-20">
                {filterOptions.map(({ value, label, icon: Icon, count }) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`flex cursor-pointer items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${filter === value
                      ? getFilterColor(value)
                      : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600/50 hover:bg-gray-700/30'
                      }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    <span>{label}</span>
                    <span className="bg-gray-900/50 px-1.5 py-0.5 rounded-full text-xs">
                      {count}
                    </span>
                  </button>
                ))}
                {isLoading && (
                  <div className="flex items-center text-xs text-gray-400">
                    <span className="animate-pulse">Loading events...</span>
                  </div>
                )}
                {isPolling && (
                  <div className="flex items-center text-xs text-blue-400">
                    <span className="animate-pulse">📡 Polling active (5s interval)</span>
                  </div>
                )}
                {isConnected && !isPolling && (
                  <div className="flex items-center text-xs text-green-400">
                    <span>🟢 Realtime connected</span>
                  </div>
                )}
                {!isConnected && !isPolling && !isLoading && (
                  <div className="flex items-center text-xs text-yellow-400">
                    <span>🟡 Realtime disconnected</span>
                  </div>
                )}
              </div>

              {/* Error State */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Error loading events</span>
                  </div>
                  <p className="text-xs text-red-300 mt-1">{error.message}</p>
                </div>
              )}

              {/* Table Container with Dynamic Height */}
              <EventTable viewState={viewState} filter={filter} filteredEvents={filteredEvents} isLoading={isLoading} />
            </>
          )}
        </GlowCard>
      </motion.div>
    </>
  );
}; 