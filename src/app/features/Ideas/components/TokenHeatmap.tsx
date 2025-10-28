'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, Zap } from 'lucide-react';

interface HeatmapCell {
  scan_type: string;
  date: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  scan_count: number;
}

interface ScanTypeSummary {
  scan_type: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  scan_count: number;
  avg_tokens: number;
}

interface HeatmapData {
  heatmapData: HeatmapCell[];
  summary: ScanTypeSummary[];
  totals: {
    total_input_tokens: number;
    total_output_tokens: number;
    total_tokens: number;
    total_scans: number;
  };
  daysBack: number;
  projectId: string;
}

interface TokenHeatmapProps {
  projectId?: string;
  daysBack?: number;
}

export default function TokenHeatmap({ projectId = 'all', daysBack = 7 }: TokenHeatmapProps) {
  const [data, setData] = React.useState<HeatmapData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [hoveredCell, setHoveredCell] = React.useState<HeatmapCell | null>(null);

  React.useEffect(() => {
    fetchHeatmapData();
  }, [projectId, daysBack]);

  const fetchHeatmapData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/scans/token-heatmap?projectId=${encodeURIComponent(projectId)}&daysBack=${daysBack}`
      );
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching token heatmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.heatmapData.length === 0) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Token Usage Heatmap</h3>
        </div>
        <p className="text-gray-400 text-sm">No token usage data available for the selected period.</p>
      </div>
    );
  }

  // Get unique scan types and dates
  const scanTypes = Array.from(new Set(data.heatmapData.map(cell => cell.scan_type))).sort();
  const dates = Array.from(new Set(data.heatmapData.map(cell => cell.date))).sort().reverse();

  // Create a lookup map for quick access
  const dataMap = new Map<string, HeatmapCell>();
  data.heatmapData.forEach(cell => {
    dataMap.set(`${cell.scan_type}-${cell.date}`, cell);
  });

  // Find max tokens for color scaling
  const maxTokens = Math.max(...data.heatmapData.map(cell => cell.total_tokens), 1);

  // Get color intensity based on token usage
  const getColorIntensity = (tokens: number): string => {
    const intensity = Math.min(tokens / maxTokens, 1);
    if (intensity === 0) return 'bg-gray-800';
    if (intensity < 0.2) return 'bg-blue-900/30';
    if (intensity < 0.4) return 'bg-blue-800/50';
    if (intensity < 0.6) return 'bg-blue-700/70';
    if (intensity < 0.8) return 'bg-blue-600/80';
    return 'bg-blue-500';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/40 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Token Usage Heatmap</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-400">Total:</span>
            <span className="text-white font-semibold">{formatNumber(data.totals.total_tokens)}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-gray-400">Scans:</span>
            <span className="text-white font-semibold">{data.totals.total_scans}</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${dates.length}, 60px)` }}>
            {/* Header row with dates */}
            <div></div>
            {dates.map(date => (
              <div key={date} className="text-sm text-gray-400 text-center py-1">
                {formatDate(date)}
              </div>
            ))}

            {/* Data rows */}
            {scanTypes.map(scanType => (
              <React.Fragment key={scanType}>
                {/* Scan type label */}
                <div className="text-sm text-gray-300 py-2 pr-2 truncate" title={scanType}>
                  {scanType}
                </div>

                {/* Cells for each date */}
                {dates.map(date => {
                  const key = `${scanType}-${date}`;
                  const cell = dataMap.get(key);
                  const tokens = cell?.total_tokens || 0;

                  return (
                    <motion.div
                      key={key}
                      className={`relative h-10 rounded ${getColorIntensity(tokens)} border border-gray-700/50 cursor-pointer transition-all`}
                      whileHover={{ scale: 1.1, zIndex: 10 }}
                      onHoverStart={() => cell && setHoveredCell(cell)}
                      onHoverEnd={() => setHoveredCell(null)}
                    >
                      {tokens > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-medium text-white drop-shadow">
                            {formatNumber(tokens)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredCell && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-gray-700/80 backdrop-blur-sm border border-gray-600 rounded-lg p-4"
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Scan Type:</span>
              <span className="ml-2 text-white font-medium">{hoveredCell.scan_type}</span>
            </div>
            <div>
              <span className="text-gray-400">Date:</span>
              <span className="ml-2 text-white font-medium">{formatDate(hoveredCell.date)}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Tokens:</span>
              <span className="ml-2 text-white font-semibold">{hoveredCell.total_tokens.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">Scans:</span>
              <span className="ml-2 text-white font-medium">{hoveredCell.scan_count}</span>
            </div>
            <div>
              <span className="text-gray-400">Input:</span>
              <span className="ml-2 text-blue-400">{hoveredCell.total_input_tokens.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">Output:</span>
              <span className="ml-2 text-green-400">{hoveredCell.total_output_tokens.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Summary by scan type */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Summary by Scan Type</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.summary.map(item => (
            <div
              key={item.scan_type}
              className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-3"
            >
              <div className="text-sm font-medium text-white mb-2">{item.scan_type}</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-white font-semibold">{formatNumber(item.total_tokens)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg/scan:</span>
                  <span className="text-blue-400">{formatNumber(Math.round(item.avg_tokens))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Scans:</span>
                  <span className="text-gray-300">{item.scan_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
        <span>Intensity:</span>
        <div className="flex gap-1">
          <div className="w-8 h-4 bg-gray-800 border border-gray-700 rounded"></div>
          <div className="w-8 h-4 bg-blue-900/30 border border-gray-700 rounded"></div>
          <div className="w-8 h-4 bg-blue-800/50 border border-gray-700 rounded"></div>
          <div className="w-8 h-4 bg-blue-700/70 border border-gray-700 rounded"></div>
          <div className="w-8 h-4 bg-blue-600/80 border border-gray-700 rounded"></div>
          <div className="w-8 h-4 bg-blue-500 border border-gray-700 rounded"></div>
        </div>
        <span className="ml-2">Low → High</span>
      </div>
    </motion.div>
  );
}
