'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, RefreshCw, Search, Loader2 } from 'lucide-react';

interface SelectorsHeaderProps {
  groupColor: string;
  selectorCount: number;
  isLoading: boolean;
  isScanning: boolean;
  onRefresh: () => void;
  onScan: () => void;
}

export default function SelectorsHeader({
  groupColor,
  selectorCount,
  isLoading,
  isScanning,
  onRefresh,
  onScan,
}: SelectorsHeaderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: groupColor }} />
          <label className="block text-sm font-medium text-gray-400 font-mono">
            Test Selectors ({selectorCount})
          </label>
        </div>
        <div className="flex items-center gap-1">
          {/* Scan button */}
          <motion.button
            onClick={onScan}
            disabled={isLoading || isScanning}
            className="flex items-center gap-1 px-2 py-1 text-xs text-cyan-400 hover:bg-cyan-500/10 rounded border border-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: !isScanning && !isLoading ? 1.05 : 1 }}
            whileTap={{ scale: !isScanning && !isLoading ? 0.95 : 1 }}
            title="Scan context files for data-testid attributes"
            data-testid="scan-selectors-btn"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Search className="w-3 h-3" />
                <span>Scan</span>
              </>
            )}
          </motion.button>
          {/* Refresh button */}
          {!isLoading && !isScanning && (
            <motion.button
              onClick={onRefresh}
              className="p-1 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Refresh selectors"
              data-testid="refresh-selectors-btn"
            >
              <RefreshCw className="w-3 h-3" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
