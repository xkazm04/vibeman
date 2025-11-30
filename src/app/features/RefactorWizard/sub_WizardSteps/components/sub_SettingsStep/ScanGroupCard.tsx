'use client';

import { CheckCircle2, Shield, Zap, Wrench, Network, TestTube, Component, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { CyberCard } from '@/components/ui/wizard';
import type { ScanTechniqueGroup } from '../../../lib/scanTechniques';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle2,
  Shield,
  Zap,
  Wrench,
  Network,
  TestTube,
  Component,
};

export interface ScanGroupCardProps {
  group: ScanTechniqueGroup;
  isSelected: boolean;
  onToggle: () => void;
  index?: number;
}

/**
 * ScanGroupCard - Individual scan group card with checkbox, icon, and techniques preview.
 * 
 * Displays a single scan technique group with:
 * - Checkbox for selection
 * - Icon representing the group type
 * - Group name and description
 * - Technique count badge
 * - High priority badge (if applicable)
 * - Preview of first 3 techniques
 */
export default function ScanGroupCard({ group, isSelected, onToggle, index = 0 }: ScanGroupCardProps) {
  const Icon = ICON_MAP[group.icon] || Info;
  const techniqueCount = group.techniques.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      data-testid={`settings-group-${group.id}`}
    >
      <CyberCard
        variant={isSelected ? 'glow' : 'dark'}
        className="!p-0 overflow-hidden cursor-pointer hover:border-cyan-500/30 transition-all duration-200"
        onClick={onToggle}
      >
        <div className="p-4">
          <div className="flex items-center space-x-4">
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 accent-cyan-500 cursor-pointer"
              data-testid={`settings-group-checkbox-${group.id}`}
            />

            {/* Icon */}
            <div className={`p-3 rounded-lg transition-all duration-200 ${
              isSelected
                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                : 'bg-white/10 border border-white/20'
            }`}>
              <Icon className={`w-6 h-6 transition-colors ${
                isSelected ? 'text-cyan-400' : 'text-gray-400'
              }`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className={`font-medium transition-colors ${
                  isSelected ? 'text-white' : 'text-gray-300'
                }`}>
                  {group.name}
                </h4>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {techniqueCount} technique{techniqueCount !== 1 ? 's' : ''}
                  </span>
                  {group.priority >= 9 && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded text-xs font-medium">
                      High Priority
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-400">{group.description}</p>

              {/* Technique Names Preview */}
              <div className="flex flex-wrap gap-1 mt-2">
                {group.techniques.slice(0, 3).map((tech) => (
                  <span
                    key={tech.id}
                    className="px-2 py-0.5 bg-black/30 border border-white/10 rounded text-xs text-gray-400"
                  >
                    {tech.name}
                  </span>
                ))}
                {group.techniques.length > 3 && (
                  <span className="px-2 py-0.5 bg-black/30 border border-white/10 rounded text-xs text-gray-500">
                    +{group.techniques.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CyberCard>
    </motion.div>
  );
}
