'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Brain,
  Zap,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

// Types
interface HealthSummary {
  latestSnapshot: unknown | null;
  healthScore: number | null;
  trend: 'improving' | 'stable' | 'degrading' | null;
  pendingFixes: number;
  recentSuccessRate: number;
}

interface LearningProgress {
  totalPatterns: number;
  activePatterns: number;
  patternsWithAutoFix: number;
  avgPrecision: number;
  avgAutoFixSuccess: number;
}

interface ObservatoryDashboardProps {
  projectId: string;
  projectPath: string;
  onAnalyze?: () => void;
}

/**
 * Health Score Display
 */
function HealthScoreRing({
  score,
  trend,
  size = 120,
}: {
  score: number | null;
  trend: 'improving' | 'stable' | 'degrading' | null;
  size?: number;
}) {
  const displayScore = score ?? 0;
  const circumference = 2 * Math.PI * ((size - 10) / 2);
  const strokeDashoffset = circumference * (1 - displayScore / 100);

  const getScoreColor = (s: number) => {
    if (s >= 80) return '#22c55e'; // green
    if (s >= 60) return '#eab308'; // yellow
    if (s >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'degrading' ? TrendingDown : Minus;
  const trendColor = trend === 'improving' ? 'text-green-400' : trend === 'degrading' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 10) / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 10) / 2}
          fill="none"
          stroke={getScoreColor(displayScore)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{displayScore}</span>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span className="text-xs capitalize">{trend || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Stat Card
 */
function StatCard({
  icon: Icon,
  label,
  value,
  subvalue,
  color = 'cyan',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subvalue?: string;
  color?: 'cyan' | 'green' | 'orange' | 'purple';
}) {
  const colorClasses = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-800">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {subvalue && <p className="text-xs text-gray-500">{subvalue}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * Observatory Dashboard
 */
export default function ObservatoryDashboard({
  projectId,
  projectPath,
  onAnalyze,
}: ObservatoryDashboardProps) {
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [learning, setLearning] = useState<LearningProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [healthRes, learningRes] = await Promise.all([
          fetch(`/api/observatory/health?projectId=${projectId}`),
          fetch(`/api/observatory/learning?projectId=${projectId}`),
        ]);

        if (healthRes.ok) {
          setHealth(await healthRes.json());
        }
        if (learningRes.ok) {
          setLearning(await learningRes.json());
        }
      } catch (error) {
        console.error('[Observatory] Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [projectId]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/observatory/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectPath }),
      });

      if (response.ok) {
        // Refresh data after analysis
        const healthRes = await fetch(`/api/observatory/health?projectId=${projectId}`);
        if (healthRes.ok) {
          setHealth(await healthRes.json());
        }
        onAnalyze?.();
      }
    } catch (error) {
      console.error('[Observatory] Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Eye className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Code Health Observatory</h2>
            <p className="text-sm text-gray-400">Continuous observation and prediction</p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30
                   text-cyan-400 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Project Health</h3>
          <div className="flex flex-col items-center">
            <HealthScoreRing score={health?.healthScore ?? null} trend={health?.trend ?? null} />
            <p className="mt-4 text-sm text-gray-400">
              {health?.healthScore
                ? health.healthScore >= 80
                  ? 'Excellent health'
                  : health.healthScore >= 60
                    ? 'Good health'
                    : health.healthScore >= 40
                      ? 'Needs attention'
                      : 'Critical issues'
                : 'Run analysis to get health score'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            icon={AlertTriangle}
            label="Pending Fixes"
            value={health?.pendingFixes ?? 0}
            subvalue="Auto-fixes ready"
            color="orange"
          />
          <StatCard
            icon={CheckCircle2}
            label="Success Rate"
            value={`${Math.round((health?.recentSuccessRate ?? 0) * 100)}%`}
            subvalue="Last 30 days"
            color="green"
          />
          <StatCard
            icon={Brain}
            label="Active Patterns"
            value={learning?.activePatterns ?? 0}
            subvalue={`of ${learning?.totalPatterns ?? 0} total`}
            color="purple"
          />
          <StatCard
            icon={Zap}
            label="Auto-Fix Patterns"
            value={learning?.patternsWithAutoFix ?? 0}
            subvalue={`${Math.round((learning?.avgAutoFixSuccess ?? 0) * 100)}% success`}
            color="cyan"
          />
        </div>
      </div>

      {/* Learning Progress */}
      {learning && learning.totalPatterns > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Learning Progress
          </h3>
          <div className="space-y-4">
            {/* Pattern Learning Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Patterns Learned</span>
                <span className="text-sm text-cyan-400">{learning.activePatterns} active</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(learning.activePatterns / Math.max(learning.totalPatterns, 1)) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Precision Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Average Precision</span>
                <span className="text-sm text-green-400">{Math.round(learning.avgPrecision * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${learning.avgPrecision * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!health?.latestSnapshot && (
        <div className="bg-gray-800/30 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No Analysis Data Yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Run your first analysis to start tracking code health
          </p>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            Start Analysis
          </button>
        </div>
      )}
    </div>
  );
}
