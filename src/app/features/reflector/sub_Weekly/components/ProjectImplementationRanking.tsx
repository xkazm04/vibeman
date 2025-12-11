'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Package, TrendingUp, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { ProjectImplementationStats } from '../lib/types';
import { fetchProjectImplementationStats } from '../lib/weeklyApi';

// Color gradient for bars
const BAR_COLORS = [
  { primary: '#06b6d4', gradient: ['#06b6d4', '#0891b2'], glow: 'rgba(6, 182, 212, 0.5)' },
  { primary: '#8b5cf6', gradient: ['#8b5cf6', '#7c3aed'], glow: 'rgba(139, 92, 246, 0.5)' },
  { primary: '#10b981', gradient: ['#10b981', '#059669'], glow: 'rgba(16, 185, 129, 0.5)' },
  { primary: '#f59e0b', gradient: ['#f59e0b', '#d97706'], glow: 'rgba(245, 158, 11, 0.5)' },
  { primary: '#ef4444', gradient: ['#ef4444', '#dc2626'], glow: 'rgba(239, 68, 68, 0.5)' },
  { primary: '#ec4899', gradient: ['#ec4899', '#db2777'], glow: 'rgba(236, 72, 153, 0.5)' },
];

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative bg-gray-950/95 backdrop-blur-xl border border-purple-500/30 rounded-xl px-4 py-3 shadow-2xl"
      style={{ boxShadow: '0 0 30px rgba(168, 85, 247, 0.15)' }}
    >
      {/* Corner markers */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-purple-500/50 rounded-tl" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-purple-500/50 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-purple-500/50 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-purple-500/50 rounded-br" />

      <div className="flex items-center gap-2 mb-2">
        <Package className="w-3.5 h-3.5 text-purple-400" />
        <p className="text-sm font-semibold text-white">{data?.projectName}</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-400">Implementations</span>
          <span className="text-sm font-mono font-bold text-purple-400">{data?.implementationCount}</span>
        </div>
        {data?.lastImplementation && (
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-700/50">
            <span className="text-xs text-gray-500">Last Activity</span>
            <span className="text-xs font-mono text-gray-400">
              {new Date(data.lastImplementation).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function ProjectImplementationRanking() {
  const [stats, setStats] = useState<ProjectImplementationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjectImplementationStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-purple-500/20 rounded-2xl p-6 overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.05)]"
      >
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mr-3" />
          <span className="text-gray-400">Loading project rankings...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-red-500/20 rounded-2xl p-6 overflow-hidden"
      >
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <span className="text-red-400">{error}</span>
        </div>
      </motion.div>
    );
  }

  // Filter out projects with 0 implementations
  const activeProjects = stats.filter(p => p.implementationCount > 0);
  const totalImplementations = activeProjects.reduce((sum, p) => sum + p.implementationCount, 0);
  const avgImplementations = activeProjects.length > 0
    ? Math.round(totalImplementations / activeProjects.length)
    : 0;

  // Prepare chart data with shortened names
  const chartData = activeProjects.map((project, index) => ({
    name: project.projectName.length > 12
      ? project.projectName.substring(0, 12) + '...'
      : project.projectName,
    fullName: project.projectName,
    projectName: project.projectName,
    implementationCount: project.implementationCount,
    lastImplementation: project.lastImplementation,
    colorIndex: index % BAR_COLORS.length,
  }));

  const maxValue = Math.max(...chartData.map(d => d.implementationCount), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-purple-500/20 rounded-2xl p-6 overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.05)]"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Ambient glows */}
      <div className="absolute top-0 right-1/4 w-1/3 h-1/3 bg-purple-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-1/4 h-1/4 bg-fuchsia-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Package className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-200">Project Implementation Ranking</h3>
            <p className="text-xs font-mono text-gray-500 mt-0.5">BY_IMPLEMENTATION_EFFORT</p>
          </div>
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 rounded-lg border border-gray-700/50">
            <span className="text-xs font-mono text-gray-500">TOTAL:</span>
            <span className="text-sm font-mono font-bold text-purple-400">{totalImplementations}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 rounded-lg border border-gray-700/50">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-mono text-gray-500">AVG:</span>
            <span className="text-sm font-mono font-bold text-purple-400">{avgImplementations}</span>
          </div>
        </div>
      </div>

      {activeProjects.length === 0 ? (
        <div className="relative z-10 text-center py-24">
          <Package className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-sm font-mono text-gray-600">NO_IMPLEMENTATIONS_YET</p>
          <p className="text-xs text-gray-700 mt-1">Start implementing ideas to see project rankings</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="relative z-10 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 60 }}
                barCategoryGap="20%"
              >
                <defs>
                  {/* Generate gradients for each color */}
                  {BAR_COLORS.map((color, index) => (
                    <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color.gradient[0]} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={color.gradient[1]} stopOpacity={0.8} />
                    </linearGradient>
                  ))}

                  {/* Glow filter */}
                  <filter id="barGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.15}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, Math.ceil(maxValue * 1.2)]}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(168, 85, 247, 0.03)' }}
                />
                <Bar
                  dataKey="implementationCount"
                  radius={[6, 6, 0, 0]}
                  filter="url(#barGlow)"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#barGradient-${entry.colorIndex})`}
                      stroke={BAR_COLORS[entry.colorIndex].primary}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Project list footer */}
          <div className="relative z-10 mt-6 pt-4 border-t border-gray-800/50">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {activeProjects.slice(0, 8).map((project, index) => {
                const color = BAR_COLORS[index % BAR_COLORS.length];
                return (
                  <motion.div
                    key={project.projectId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="relative flex items-center gap-2 p-2 rounded-lg bg-gray-900/60 border border-gray-700/30 hover:border-gray-600/50 transition-all cursor-default group"
                  >
                    {/* Color indicator */}
                    <div
                      className="absolute left-0 top-1 bottom-1 w-1 rounded-r-full"
                      style={{ backgroundColor: color.primary, boxShadow: `0 0 8px ${color.glow}` }}
                    />

                    <div className="flex-1 min-w-0 ml-2">
                      <div className="text-xs font-medium text-gray-300 truncate group-hover:text-white transition-colors">
                        {project.projectName}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 mt-0.5">
                        <span
                          className="font-bold"
                          style={{ color: color.primary }}
                        >
                          {project.implementationCount}
                        </span>
                        <span>impl</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {activeProjects.length > 8 && (
              <div className="text-center mt-3 text-xs font-mono text-gray-600">
                +{activeProjects.length - 8} more projects
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
