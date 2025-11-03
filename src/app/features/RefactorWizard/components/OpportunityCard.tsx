'use client';

import { motion } from 'framer-motion';
import { CheckSquare, Square, FileCode } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Zap,
} from 'lucide-react';

const severityIcons = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: Zap,
};

const severityColors = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

const categoryColors = {
  performance: 'bg-green-500/20 text-green-300',
  maintainability: 'bg-blue-500/20 text-blue-300',
  security: 'bg-red-500/20 text-red-300',
  'code-quality': 'bg-purple-500/20 text-purple-300',
  duplication: 'bg-orange-500/20 text-orange-300',
  architecture: 'bg-cyan-500/20 text-cyan-300',
};

interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: keyof typeof categoryColors;
  severity: keyof typeof severityColors;
  effort: string;
  files: string[];
  autoFixAvailable?: boolean;
  estimatedTime?: string;
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  isSelected: boolean;
  index: number;
  onToggle: () => void;
}

export function OpportunityCard({
  opportunity: opp,
  isSelected,
  index,
  onToggle,
}: OpportunityCardProps) {
  const SeverityIcon = severityIcons[opp.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onToggle}
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-cyan-500/10 border-cyan-500/40'
          : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`}
      data-testid={`opportunity-${opp.id}`}
    >
      <div className="flex items-start space-x-3">
        {/* Checkbox */}
        <div className="mt-1">
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-cyan-400" />
          ) : (
            <Square className="w-5 h-5 text-gray-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="text-white font-medium">{opp.title}</h4>
            <div className={`px-2 py-1 rounded text-xs border ${severityColors[opp.severity]}`}>
              <SeverityIcon className="w-3 h-3 inline mr-1" />
              {opp.severity}
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-3">{opp.description}</p>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Category Badge */}
            <span className={`px-2 py-1 rounded-md text-xs ${categoryColors[opp.category]}`}>
              {opp.category}
            </span>

            {/* Effort Badge */}
            <span className="px-2 py-1 bg-white/10 text-gray-300 rounded-md text-xs">
              Effort: {opp.effort}
            </span>

            {/* Files */}
            <span className="flex items-center text-gray-400 text-xs">
              <FileCode className="w-3 h-3 mr-1" />
              {opp.files.length} file{opp.files.length !== 1 ? 's' : ''}
            </span>

            {/* Auto-fix indicator */}
            {opp.autoFixAvailable && (
              <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-md text-xs">
                Auto-fix available
              </span>
            )}

            {/* Time estimate */}
            {opp.estimatedTime && (
              <span className="text-gray-500 text-xs">
                ~{opp.estimatedTime}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
