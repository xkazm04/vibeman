'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { FilterState } from '../lib/types';

export type QuadrantType = 'quickWins' | 'majorProjects' | 'fillIns' | 'thankless';

interface QuadrantData {
  count: number;
  acceptanceRate: number;
  ideas: Array<{ id: string; title: string; status: string }>;
}

interface EffortImpactData {
  quadrants: {
    quickWins: QuadrantData;
    majorProjects: QuadrantData;
    fillIns: QuadrantData;
    thankless: QuadrantData;
  };
  scatterData: Array<{
    id: string;
    title: string;
    effort: number;
    impact: number;
    status: string;
    scanType: string;
  }>;
  total: number;
  totalIdeas: number;
  insights: {
    byEffort: {
      low: { count: number; acceptanceRate: number };
      medium: { count: number; acceptanceRate: number };
      high: { count: number; acceptanceRate: number };
    };
    byImpact: {
      low: { count: number; acceptanceRate: number };
      medium: { count: number; acceptanceRate: number };
      high: { count: number; acceptanceRate: number };
    };
  };
}

interface EffortImpactMatrixProps {
  filters: FilterState;
  onQuadrantClick?: (quadrant: QuadrantType) => void;
}

export default function EffortImpactMatrix({ filters, onQuadrantClick }: EffortImpactMatrixProps) {
  const [data, setData] = useState<EffortImpactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.contextId) params.append('contextId', filters.contextId);

      const response = await fetch(`/api/ideas/effort-impact?${params}`);
      if (!response.ok) throw new Error('Failed to fetch effort-impact data');

      const result = await response.json();
      setData(result);
    } catch (error) {
      // Error silently handled
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-6 backdrop-blur-sm">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-6 backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Effort vs Impact Matrix</h3>
        <div className="text-center py-8 text-gray-500 text-sm">
          No scored ideas to display (effort and impact required)
        </div>
      </div>
    );
  }


  const quadrantCards: Array<{
    title: string;
    icon: typeof Zap;
    color: string;
    borderColor: string;
    bgGradient: string;
    data: QuadrantData;
    description: string;
    quadrantType: QuadrantType;
  }> = [
    {
      title: 'Quick Wins',
      icon: Zap,
      color: 'text-green-400',
      borderColor: 'border-green-500/40',
      bgGradient: 'from-green-500/10 to-green-600/5',
      data: data.quadrants.quickWins,
      description: 'Low effort, high impact',
      quadrantType: 'quickWins',
    },
    {
      title: 'Major Projects',
      icon: TrendingUp,
      color: 'text-blue-400',
      borderColor: 'border-blue-500/40',
      bgGradient: 'from-blue-500/10 to-blue-600/5',
      data: data.quadrants.majorProjects,
      description: 'High effort, high impact',
      quadrantType: 'majorProjects',
    },
    {
      title: 'Fill-Ins',
      icon: Clock,
      color: 'text-yellow-400',
      borderColor: 'border-yellow-500/40',
      bgGradient: 'from-yellow-500/10 to-yellow-600/5',
      data: data.quadrants.fillIns,
      description: 'Low effort, low impact',
      quadrantType: 'fillIns',
    },
    {
      title: 'Thankless Tasks',
      icon: AlertTriangle,
      color: 'text-red-400',
      borderColor: 'border-red-500/40',
      bgGradient: 'from-red-500/10 to-red-600/5',
      data: data.quadrants.thankless,
      description: 'High effort, low impact',
      quadrantType: 'thankless',
    }
  ];

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="space-y-6"
    >
      <h2 className="text-lg font-semibold text-gray-300">
        Effort vs Impact Analysis
      </h2>

      {/* Quadrant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quadrantCards.map((quadrant, index) => {
          const Icon = quadrant.icon;
          const handleClick = () => {
            if (onQuadrantClick) {
              onQuadrantClick(quadrant.quadrantType);
            }
          };
          const handleKeyDown = (e: React.KeyboardEvent) => {
            if (onQuadrantClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onQuadrantClick(quadrant.quadrantType);
            }
          };
          return (
            <motion.div
              key={quadrant.title}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              whileHover={onQuadrantClick ? { scale: 1.02, y: -2 } : undefined}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              className={`relative bg-gradient-to-br ${quadrant.bgGradient} border ${quadrant.borderColor} rounded-lg p-4 backdrop-blur-sm ${onQuadrantClick ? 'cursor-pointer' : ''}`}
              data-testid={`quadrant-card-${quadrant.quadrantType}`}
              role={onQuadrantClick ? 'button' : undefined}
              tabIndex={onQuadrantClick ? 0 : undefined}
            >
              <div className="flex items-start gap-2 mb-3">
                <div className={`p-2 bg-gray-900/60 rounded-lg border ${quadrant.borderColor}`}>
                  <Icon className={`w-4 h-4 ${quadrant.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${quadrant.color}`}>
                    {quadrant.title}
                  </h3>
                  <p className="text-xs text-gray-500">{quadrant.description}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-3">
                <div className={`text-3xl font-bold ${quadrant.color} font-mono`}>
                  {quadrant.data.count}
                </div>
                <div className="text-sm text-gray-400">
                  {quadrant.data.acceptanceRate}% accepted
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-6 backdrop-blur-sm"
        >
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Acceptance by Effort Level</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Low Effort</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-300">{data.insights.byEffort.low.count}</span>
                <span className="text-xs text-green-400">{data.insights.byEffort.low.acceptanceRate}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Medium Effort</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-300">{data.insights.byEffort.medium.count}</span>
                <span className="text-xs text-green-400">{data.insights.byEffort.medium.acceptanceRate}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">High Effort</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-300">{data.insights.byEffort.high.count}</span>
                <span className="text-xs text-green-400">{data.insights.byEffort.high.acceptanceRate}%</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-6 backdrop-blur-sm"
        >
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Acceptance by Impact Level</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Low Impact</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-300">{data.insights.byImpact.low.count}</span>
                <span className="text-xs text-green-400">{data.insights.byImpact.low.acceptanceRate}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Medium Impact</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-300">{data.insights.byImpact.medium.count}</span>
                <span className="text-xs text-green-400">{data.insights.byImpact.medium.acceptanceRate}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">High Impact</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-300">{data.insights.byImpact.high.count}</span>
                <span className="text-xs text-green-400">{data.insights.byImpact.high.acceptanceRate}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
