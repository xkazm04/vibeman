'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Play,
  Upload,
  ExternalLink,
  WifiOff,
} from 'lucide-react';
import ExternalRequirementItem from './ExternalRequirementItem';
import { useExternalRequirements } from '../hooks/useExternalRequirements';
import type { ExternalRequirement } from '@/lib/supabase/external-types';

interface ExternalRequirementsColumnProps {
  projectId: string | null;
  projectPath: string | null;
}

const ExternalRequirementsColumn = React.memo(function ExternalRequirementsColumn({
  projectId,
  projectPath,
}: ExternalRequirementsColumnProps) {
  const {
    requirements,
    isLoading,
    error,
    isConfigured,
    processing,
    refresh,
    discard,
    executeOne,
    executeAll,
    syncProjects,
    resetFailed,
  } = useExternalRequirements({ projectId, projectPath });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [scrolledTop, setScrolledTop] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setScrolledTop(el.scrollTop > 0);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  useEffect(() => {
    handleScroll();
  }, [handleScroll, requirements.length]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    const result = await syncProjects();
    setSyncMessage(
      result.success
        ? `Synced ${result.synced} project${result.synced !== 1 ? 's' : ''}`
        : result.error || 'Sync failed'
    );
    setIsSyncing(false);
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const openCount = requirements.filter((r) => r.status === 'open').length;
  const hasExecutable = openCount > 0;

  // Sort: open first, then in_progress/claimed, then failed
  const sortedRequirements = [...requirements].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      open: 0,
      claimed: 1,
      in_progress: 2,
      failed: 3,
      implemented: 4,
      discarded: 5,
    };
    const sDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    if (sDiff !== 0) return sDiff;
    // Within same status, sort by priority DESC
    return b.priority - a.priority;
  });

  // ── Not configured state ──────────────────────────────────────────────
  if (!isConfigured) {
    return (
      <motion.div
        className="flex flex-col bg-gradient-to-b from-gray-900/50 to-gray-900/30 border border-gray-700/40 border-l-2 border-l-gray-500/40 rounded-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-3 py-2.5 bg-gradient-to-r from-gray-500/8 to-transparent border-b border-gray-700/40">
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3 h-3 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-500">EXTERNAL</h3>
          </div>
        </div>
        <div className="flex items-center justify-center h-24 px-4">
          <p className="text-[10px] text-gray-600 text-center">
            Supabase not configured.
            <br />
            Set SUPABASE env vars to enable.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col bg-gradient-to-b from-gray-900/50 to-gray-900/30 border border-gray-700/40 border-l-2 border-l-teal-500/60 rounded-xl overflow-hidden transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-gray-600/60 hover:bg-gray-900/50 hover:shadow-xl hover:shadow-black/40 hover:will-change-transform backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="external-requirements-column"
    >
      {/* Header */}
      <div className="px-3 py-2.5 bg-gradient-to-r from-teal-500/10 to-transparent border-b border-gray-700/40 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-teal-400" />
            <h3 className="text-sm font-semibold text-gray-300">EXTERNAL</h3>
            <span className="text-[9px] text-gray-600 font-mono">supabase</span>
          </div>
          <div className="flex items-center gap-1">
            <motion.span
              key={requirements.length}
              className="text-[10px] text-gray-500 font-mono mr-1"
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {requirements.length}
            </motion.span>

            {/* Sync Projects */}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="p-1 rounded hover:bg-teal-500/20 text-gray-500 hover:text-teal-400 transition-all duration-200 disabled:opacity-50"
              title="Sync projects to Supabase"
              data-testid="ext-sync-projects-btn"
            >
              <Upload className={`w-3 h-3 ${isSyncing ? 'animate-pulse' : ''}`} />
            </button>

            {/* Refresh */}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-1 rounded hover:bg-teal-500/20 text-gray-500 hover:text-teal-400 transition-all duration-200 disabled:opacity-50"
              title="Refresh requirements"
              data-testid="ext-refresh-btn"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Execute All */}
            {hasExecutable && (
              <button
                onClick={executeAll}
                className="p-1 rounded hover:bg-teal-500/20 text-gray-500 hover:text-teal-400 transition-all duration-200"
                title={`Execute all ${openCount} open requirements`}
                data-testid="ext-execute-all-btn"
              >
                <Play className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Sync feedback */}
        <AnimatePresence>
          {syncMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[10px] text-teal-400/80 mt-0.5 overflow-hidden"
            >
              {syncMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[10px] text-red-400/80 mt-0.5 overflow-hidden"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Requirements List */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className={`flex-1 px-2 py-2 space-y-1 min-h-[100px] max-h-[400px] overflow-y-auto custom-scrollbar scroll-smooth transition-shadow duration-200 ${
          scrolledTop ? 'shadow-[inset_0_8px_6px_-6px_rgba(0,0,0,0.3)]' : ''
        }`}
        style={{
          maskImage: `linear-gradient(to bottom, ${scrolledTop ? 'transparent' : 'black'}, black 8px, black calc(100% - 8px), ${canScrollDown ? 'transparent' : 'black'})`,
          WebkitMaskImage: `linear-gradient(to bottom, ${scrolledTop ? 'transparent' : 'black'}, black 8px, black calc(100% - 8px), ${canScrollDown ? 'transparent' : 'black'})`,
        }}
      >
        {sortedRequirements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 gap-1">
            <ExternalLink className="w-4 h-4 text-gray-700" />
            <span className="text-[10px] text-gray-600">No external requirements</span>
          </div>
        ) : (
          <AnimatePresence>
            {sortedRequirements.map((req) => (
              <ExternalRequirementItem
                key={req.id}
                requirement={req}
                processingState={processing[req.id]}
                onExecute={executeOne}
                onDiscard={discard}
                onRetry={resetFailed}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
});

export default ExternalRequirementsColumn;
