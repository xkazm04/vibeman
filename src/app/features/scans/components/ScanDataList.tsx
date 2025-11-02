'use client';

import React from 'react';
import { useScanData } from '@/hooks/useScanData';
import { Calendar, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScanDataListProps {
  projectId: string;
  scanType?: string;
  pageSize?: number;
}

/**
 * Example component demonstrating the useScanData hook
 *
 * This component shows how to use the hook to fetch, display, and paginate scan data
 * with proper loading states, error handling, and caching.
 */
export default function ScanDataList({ projectId, scanType, pageSize = 20 }: ScanDataListProps) {
  const { scans, loading, error, pagination, refresh, loadMore } = useScanData(
    { projectId, scanType },
    { limit: pageSize }
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format tokens for display
  const formatTokens = (input?: number | null, output?: number | null) => {
    if (!input && !output) return 'N/A';
    const total = (input || 0) + (output || 0);
    return total.toLocaleString();
  };

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/40 rounded-lg">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-semibold">Error loading scans</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-200">
            Scan History
            {scanType && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({scanType})
              </span>
            )}
          </h2>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-sm font-medium text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>Total: <span className="text-gray-200 font-mono">{pagination.total}</span></span>
        <span>Showing: <span className="text-gray-200 font-mono">{scans.length}</span></span>
      </div>

      {/* Loading state */}
      {loading && scans.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <span className="ml-3 text-gray-400">Loading scans...</span>
        </div>
      )}

      {/* Scan list */}
      <AnimatePresence mode="popLayout">
        {scans.map((scan, index) => (
          <motion.div
            key={scan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="p-4 bg-gray-800/40 border border-gray-700/40 rounded-lg hover:bg-gray-800/60 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: Scan info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 rounded text-xs font-mono text-blue-300">
                    {scan.scan_type}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(scan.timestamp)}
                  </div>
                </div>

                {scan.summary && (
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {scan.summary}
                  </p>
                )}
              </div>

              {/* Right: Token usage */}
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Tokens</div>
                <div className="text-sm font-mono text-gray-300">
                  {formatTokens(scan.input_tokens, scan.output_tokens)}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Empty state */}
      {!loading && scans.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No scans found</p>
          {scanType && (
            <p className="text-sm mt-1">Try changing the scan type filter</p>
          )}
        </div>
      )}

      {/* Load more button */}
      {pagination.hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-sm font-medium text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load More
                <span className="text-xs opacity-60">
                  ({scans.length} of {pagination.total})
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
