'use client';

/**
 * Remote Requirement Card
 * Selectable card for remote requirements with emerald theme.
 */

import { motion } from 'framer-motion';
import { Check, FileText, Lightbulb, ArrowRight } from 'lucide-react';
import type { RemoteRequirement } from '@/stores/emulatorStore';

interface RemoteRequirementCardProps {
  requirement: RemoteRequirement;
  isSelected: boolean;
  onToggle: () => void;
}

const sourceIcons = {
  direction: ArrowRight,
  idea: Lightbulb,
  manual: FileText,
};

const sourceColors = {
  direction: 'text-purple-400',
  idea: 'text-amber-400',
  manual: 'text-gray-400',
};

export default function RemoteRequirementCard({
  requirement,
  isSelected,
  onToggle,
}: RemoteRequirementCardProps) {
  const source = requirement.source || 'manual';
  const SourceIcon = sourceIcons[source];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={onToggle}
      className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-emerald-500/10 border border-emerald-500/30'
          : 'bg-gray-800/30 border border-gray-700/30 hover:border-emerald-500/20 hover:bg-gray-800/50'
      }`}
    >
      {/* Checkbox */}
      <div
        className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
          isSelected
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-gray-600 group-hover:border-emerald-500/50'
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200 truncate">
            {requirement.name}
          </span>
          {/* Source badge */}
          <span
            className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-gray-800/50 ${sourceColors[source]}`}
          >
            <SourceIcon className="w-2.5 h-2.5" />
            {source}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
          {requirement.project_name && (
            <span className="truncate max-w-[150px]">
              {requirement.project_name}
            </span>
          )}
          <span className="text-gray-600">•</span>
          <span>
            {new Date(requirement.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          layoutId={`selection-${requirement.id}`}
          className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r"
        />
      )}
    </motion.div>
  );
}
