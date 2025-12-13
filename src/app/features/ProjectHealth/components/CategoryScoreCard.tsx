'use client';

import { motion } from 'framer-motion';
import {
  Lightbulb,
  Wrench,
  Shield,
  TestTube2,
  Target,
  Code2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { HealthScoreCategory, CategoryScore } from '@/app/db/models/project-health.types';
import { getCategoryLabel, getCategoryColor, getScoreColor } from '../lib/healthHelpers';

interface CategoryScoreCardProps {
  category: HealthScoreCategory;
  data: CategoryScore;
  isSelected?: boolean;
  isFocusArea?: boolean;
  onClick?: () => void;
  delay?: number;
}

const CategoryIcons: Record<HealthScoreCategory, React.ComponentType<{ className?: string }>> = {
  idea_backlog: Lightbulb,
  tech_debt: Wrench,
  security: Shield,
  test_coverage: TestTube2,
  goal_completion: Target,
  code_quality: Code2,
};

export default function CategoryScoreCard({
  category,
  data,
  isSelected = false,
  isFocusArea = false,
  onClick,
  delay = 0,
}: CategoryScoreCardProps) {
  const Icon = CategoryIcons[category];
  const color = getCategoryColor(category);
  const scoreColor = getScoreColor(data.score);
  const label = getCategoryLabel(category);

  // Calculate progress arc
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (data.score / 100) * circumference;
  const offset = circumference - progress;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={onClick}
      className={`relative w-full p-4 rounded-xl border backdrop-blur-sm transition-all group
        ${isSelected
          ? 'bg-white/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
        }
        ${isFocusArea ? 'ring-2 ring-amber-500/50' : ''}
      `}
      data-testid={`category-card-${category}`}
    >
      {/* Focus area indicator */}
      {isFocusArea && (
        <div className="absolute -top-2 -right-2 p-1 bg-amber-500 rounded-full">
          <AlertCircle className="w-3 h-3 text-black" />
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Mini gauge */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={scoreColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ delay: delay + 0.2, duration: 0.8 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 text-left">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-300">{label}</span>
            <span className="text-lg font-bold" style={{ color: scoreColor }}>
              {data.score}
            </span>
          </div>

          {/* Details */}
          {data.details && (
            <p className="text-xs text-gray-500 line-clamp-1">{data.details}</p>
          )}

          {/* Issues count */}
          {data.issues_count !== undefined && data.issues_count > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-amber-400">{data.issues_count} issues</span>
            </div>
          )}
        </div>

        {/* Trend indicator */}
        {data.trend !== 0 && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
            ${data.trend > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}
          `}>
            {data.trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(data.trend)}
          </div>
        )}
      </div>

      {/* Weight indicator */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${data.weight * 100}%` }}
            transition={{ delay: delay + 0.3, duration: 0.5 }}
          />
        </div>
        <span className="text-xs text-gray-500">{Math.round(data.weight * 100)}%</span>
      </div>
    </motion.button>
  );
}
