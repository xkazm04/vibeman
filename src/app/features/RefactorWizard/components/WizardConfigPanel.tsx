'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Shield,
  Zap,
  Wrench,
  Network,
  TestTube,
  Component,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from 'lucide-react';
import { useState } from 'react';
import { CyberCard } from '@/components/ui/wizard';
import type { ScanTechniqueGroup, ScanTechnique } from '../lib/scanTechniques';
import type { WizardPlan } from '../lib/wizardOptimizer';

interface WizardConfigPanelProps {
  plan: WizardPlan | null;
  selectedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onToggleTechnique: (groupId: string, techniqueId: string) => void;
  isLoading?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle2,
  Shield,
  Zap,
  Wrench,
  Network,
  TestTube,
  Component,
};

export default function WizardConfigPanel({
  plan,
  selectedGroups,
  onToggleGroup,
  onToggleTechnique,
  isLoading = false,
}: WizardConfigPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <CyberCard className="animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-white/10 rounded w-3/4" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
          <div className="h-20 bg-white/10 rounded" />
        </div>
      </CyberCard>
    );
  }

  if (!plan) {
    return (
      <CyberCard>
        <div className="text-center text-gray-400 py-8">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No configuration plan available yet</p>
        </div>
      </CyberCard>
    );
  }

  const toggleGroupExpanded = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* AI Plan Summary */}
      <CyberCard variant="glow" data-testid="ai-plan-summary">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">AI-Generated Plan</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">Confidence:</span>
                <span className="text-sm font-semibold text-cyan-400">{plan.confidence}%</span>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-3">{plan.reasoning}</p>
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300">
                {plan.projectType}
              </div>
              {plan.detectedFrameworks.map((fw) => (
                <div
                  key={fw}
                  className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-xs text-cyan-300"
                >
                  {fw}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CyberCard>

      {/* Scan Technique Groups */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">Scan Technique Groups</h3>
          <p className="text-sm text-gray-400">
            {selectedGroups.size} of {plan.recommendedGroups.length} selected
          </p>
        </div>

        {plan.recommendedGroups.map((group, index) => {
          const isSelected = selectedGroups.has(group.id);
          const isExpanded = expandedGroups.has(group.id);
          const Icon = ICON_MAP[group.icon] || Info;
          const enabledTechCount = group.techniques.filter(t => t.enabled).length;

          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <CyberCard
                variant={isSelected ? 'glow' : 'dark'}
                className="!p-0 overflow-hidden transition-all duration-300"
              >
                {/* Group Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  data-testid={`scan-group-${group.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleGroup(group.id)}
                        className="w-5 h-5 accent-cyan-500 cursor-pointer"
                        data-testid={`scan-group-checkbox-${group.id}`}
                        onClick={(e) => e.stopPropagation()}
                      />

                      {/* Icon */}
                      <div className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                          : 'bg-white/10 border border-white/20'
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {group.name}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">{group.description}</p>
                      </div>

                      {/* Badge */}
                      <div className="flex items-center space-x-3">
                        <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300">
                          {enabledTechCount} techniques
                        </span>

                        {/* Expand button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupExpanded(group.id);
                          }}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          data-testid={`expand-group-${group.id}`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Techniques */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/10"
                    >
                      <div className="p-4 space-y-2 bg-black/30">
                        {group.techniques.map((technique) => (
                          <TechniqueItem
                            key={technique.id}
                            technique={technique}
                            groupId={group.id}
                            isGroupSelected={isSelected}
                            onToggle={() => onToggleTechnique(group.id, technique.id)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CyberCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TechniqueItem({
  technique,
  groupId,
  isGroupSelected,
  onToggle,
}: {
  technique: ScanTechnique;
  groupId: string;
  isGroupSelected: boolean;
  onToggle: () => void;
}) {
  const isEnabled = technique.enabled && isGroupSelected;

  return (
    <label
      className="flex items-center justify-between p-3 bg-black/30 border border-white/10 rounded-lg cursor-pointer hover:bg-black/40 hover:border-cyan-500/20 transition-all duration-200 group"
      data-testid={`technique-${groupId}-${technique.id}`}
    >
      <div className="flex items-center space-x-3 flex-1">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={onToggle}
          disabled={!isGroupSelected}
          className="w-4 h-4 accent-cyan-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid={`technique-checkbox-${groupId}-${technique.id}`}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isEnabled ? 'text-white' : 'text-gray-400'}`}>
            {technique.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{technique.description}</p>
        </div>
      </div>
      <span className={`px-2 py-1 rounded text-xs ${
        technique.category === 'security'
          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
          : technique.category === 'performance'
          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      }`}>
        {technique.category}
      </span>
    </label>
  );
}
