/**
 * XRayHotPathsPanel Component
 * Shows the most active API routes and traffic patterns
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Clock, AlertCircle, TrendingUp, Zap } from 'lucide-react';
import { useXRayHotPaths, useXRayLayers, useXRayIsConnected } from '@/stores/xrayStore';

interface XRayHotPathsPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function XRayHotPathsPanel({ isExpanded, onToggle }: XRayHotPathsPanelProps) {
  const hotPaths = useXRayHotPaths();
  const layers = useXRayLayers();
  const isConnected = useXRayIsConnected();

  // Calculate total traffic
  const totalRequests = Object.values(layers).reduce((sum, l) => sum + l.totalRequests, 0);
  const avgLatency =
    totalRequests > 0
      ? Object.values(layers).reduce((sum, l) => sum + l.avgLatency * l.totalRequests, 0) / totalRequests
      : 0;
  const errorCount = Object.values(layers).reduce(
    (sum, l) => sum + Math.round(l.errorRate * l.totalRequests),
    0
  );

  return (
    <div className="absolute top-4 right-4 z-10">
      {/* Collapsed toggle button */}
      {!isExpanded && (
        <motion.button
          onClick={onToggle}
          className="flex items-center gap-2 px-3 py-2 bg-gray-900/90 border border-cyan-500/30
            rounded-lg text-cyan-400 hover:bg-gray-800/90 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          data-testid="xray-hotpaths-toggle"
        >
          <Flame className="w-4 h-4" />
          <span className="text-xs font-medium">Hot Paths</span>
          {hotPaths.length > 0 && (
            <span className="bg-cyan-500/30 text-cyan-300 text-[10px] px-1.5 py-0.5 rounded-full">
              {hotPaths.length}
            </span>
          )}
        </motion.button>
      )}

      {/* Expanded panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="w-80 bg-gray-900/95 border border-gray-700/50 rounded-xl overflow-hidden backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20">
                  <Flame className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Hot Paths</h3>
                  <p className="text-[10px] text-gray-500">
                    {isConnected ? 'Live traffic analysis' : 'Disconnected'}
                  </p>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                data-testid="xray-hotpaths-close"
              >
                ×
              </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-gray-700/30">
              <div className="text-center">
                <div className="text-lg font-bold text-cyan-400">{totalRequests}</div>
                <div className="text-[10px] text-gray-500">Requests</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${avgLatency > 500 ? 'text-amber-400' : 'text-green-400'}`}>
                  {Math.round(avgLatency)}
                </div>
                <div className="text-[10px] text-gray-500">Avg ms</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${errorCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {errorCount}
                </div>
                <div className="text-[10px] text-gray-500">Errors</div>
              </div>
            </div>

            {/* Hot paths list */}
            <div className="max-h-64 overflow-y-auto">
              {hotPaths.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No traffic yet</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Activity will appear here as requests flow
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {hotPaths.map((path, index) => (
                    <motion.div
                      key={path.path}
                      className="px-4 py-2 hover:bg-gray-800/50 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Zap
                                className={`w-3 h-3 ${
                                  index === 0
                                    ? 'text-orange-400'
                                    : index === 1
                                    ? 'text-amber-400'
                                    : 'text-yellow-400'
                                }`}
                              />
                            )}
                            <code className="text-xs text-gray-300 truncate">
                              {path.path}
                            </code>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {path.requestCount}
                            </span>
                            <span
                              className={`text-[10px] flex items-center gap-1 ${
                                path.avgLatency > 500 ? 'text-amber-400' : 'text-gray-500'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {Math.round(path.avgLatency)}ms
                            </span>
                          </div>
                        </div>

                        {/* Traffic intensity bar */}
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-0.5">
                            {path.layers.map((layer) => (
                              <span
                                key={layer}
                                className="text-[8px] px-1 py-0.5 rounded bg-gray-800 text-gray-400"
                              >
                                {layer.charAt(0).toUpperCase()}
                              </span>
                            ))}
                          </div>
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{
                                background:
                                  path.avgLatency > 500
                                    ? 'linear-gradient(to right, #f59e0b, #ef4444)'
                                    : 'linear-gradient(to right, #22d3ee, #06b6d4)',
                              }}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, (path.requestCount / hotPaths[0].requestCount) * 100)}%`,
                              }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Layer breakdown */}
            <div className="px-4 py-3 border-t border-gray-700/30">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Traffic by Layer
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['pages', 'client', 'server', 'external'] as const).map((layer) => {
                  const stats = layers[layer];
                  const colors = {
                    pages: 'text-pink-400 bg-pink-500/20',
                    client: 'text-cyan-400 bg-cyan-500/20',
                    server: 'text-amber-400 bg-amber-500/20',
                    external: 'text-violet-400 bg-violet-500/20',
                  };
                  return (
                    <div
                      key={layer}
                      className={`px-2 py-1.5 rounded-lg text-center ${colors[layer].split(' ')[1]}`}
                    >
                      <div className={`text-sm font-bold ${colors[layer].split(' ')[0]}`}>
                        {stats?.totalRequests || 0}
                      </div>
                      <div className="text-[9px] text-gray-500 capitalize">{layer}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
