'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ChevronDown, ChevronUp, GitBranch, Clock, AlertCircle } from 'lucide-react';
import { RefactoringPackage } from '../lib/types';

interface PackageCardProps {
  package: RefactoringPackage;
  isSelected: boolean;
  onToggleSelect: () => void;
  onSelectWithDependencies: () => void;
  dependencyCount: number;
  enabledCount: number;
}

export default function PackageCard({
  package: pkg,
  isSelected,
  onToggleSelect,
  onSelectWithDependencies,
  dependencyCount,
  enabledCount,
}: PackageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryColors = {
    migration: 'from-purple-500/20 to-pink-500/20 border-purple-500',
    cleanup: 'from-blue-500/20 to-cyan-500/20 border-cyan-500',
    security: 'from-red-500/20 to-orange-500/20 border-red-500',
    performance: 'from-green-500/20 to-emerald-500/20 border-green-500',
    architecture: 'from-yellow-500/20 to-amber-500/20 border-yellow-500',
  };

  const impactColors = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-yellow-400',
    low: 'text-gray-400',
  };

  const effortIcons = {
    small: '🟢',
    medium: '🟡',
    large: '🟠',
    'extra-large': '🔴',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        relative rounded-lg bg-gradient-to-br
        ${categoryColors[pkg.category] || 'from-gray-500/20 to-gray-600/20 border-gray-500'}
        ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''}
        hover:shadow-lg hover:shadow-cyan-500/20
        transition-all duration-300
        overflow-hidden
      `}
      data-testid={`package-card-${pkg.id}`}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Card content */}
      <div className="relative p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="mt-1 w-4 h-4 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900 rounded"
              data-testid={`package-checkbox-${pkg.id}`}
            />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" />
                {pkg.name}
              </h3>
              <p className="text-sm text-gray-400 mt-1">{pkg.description}</p>
            </div>
          </div>

          {/* Category badge */}
          <span className="px-2 py-1 text-xs font-semibold rounded bg-black/30 text-cyan-300 uppercase">
            {pkg.category}
          </span>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <AlertCircle className={`w-4 h-4 ${impactColors[pkg.impact]}`} />
            <span className="text-gray-300">Impact: {pkg.impact}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-lg">{effortIcons[pkg.effort]}</span>
            <span className="text-gray-300">Effort: {pkg.effort}</span>
          </div>

          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">{pkg.estimatedHours}h</span>
          </div>

          <div className="flex items-center gap-1">
            <Package className="w-4 h-4 text-purple-400" />
            <span className="text-gray-300">{pkg.issueCount} issues</span>
          </div>
        </div>

        {/* Dependencies */}
        {(dependencyCount > 0 || enabledCount > 0) && (
          <div className="flex flex-wrap gap-3 text-xs">
            {dependencyCount > 0 && (
              <div className="flex items-center gap-1 text-orange-400">
                <GitBranch className="w-3 h-3" />
                <span>Depends on {dependencyCount} package{dependencyCount > 1 ? 's' : ''}</span>
              </div>
            )}
            {enabledCount > 0 && (
              <div className="flex items-center gap-1 text-green-400">
                <GitBranch className="w-3 h-3 rotate-180" />
                <span>Enables {enabledCount} package{enabledCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        {/* Module pattern */}
        {pkg.modulePattern && (
          <div className="text-xs text-cyan-400 font-mono bg-black/30 px-2 py-1 rounded">
            Scope: {pkg.modulePattern}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-white/10">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 px-3 py-2 text-sm rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors flex items-center justify-center gap-2"
            data-testid={`package-expand-${pkg.id}`}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isExpanded ? 'Hide' : 'Show'} Details
          </button>

          {dependencyCount > 0 && (
            <button
              onClick={onSelectWithDependencies}
              className="px-3 py-2 text-sm rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-colors"
              data-testid={`package-select-deps-${pkg.id}`}
            >
              Select with Dependencies
            </button>
          )}
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3 border-t border-white/10">
                {/* Strategic goal */}
                <div>
                  <h4 className="text-sm font-semibold text-cyan-400 mb-1">Strategic Goal</h4>
                  <p className="text-sm text-gray-300">{pkg.strategicGoal}</p>
                </div>

                {/* Strategy */}
                <div>
                  <h4 className="text-sm font-semibold text-cyan-400 mb-1">Strategy</h4>
                  <p className="text-xs text-gray-400 mb-1">
                    <span className="font-semibold">Type:</span> {pkg.strategy.type}
                  </p>
                  <p className="text-xs text-gray-400 mb-1">
                    <span className="font-semibold">Rationale:</span> {pkg.strategy.rationale}
                  </p>
                  <p className="text-xs text-gray-400">
                    <span className="font-semibold">Approach:</span> {pkg.strategy.approach}
                  </p>
                </div>

                {/* Expected outcomes */}
                {pkg.expectedOutcomes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-400 mb-1">Expected Outcomes</h4>
                    <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                      {pkg.expectedOutcomes.map((outcome, idx) => (
                        <li key={idx}>{outcome}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Phases */}
                {pkg.phases && pkg.phases.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-400 mb-1">
                      Phases ({pkg.phases.length})
                    </h4>
                    <div className="space-y-2">
                      {pkg.phases.map((phase) => (
                        <div key={phase.id} className="text-xs bg-black/20 p-2 rounded">
                          <div className="font-semibold text-white">{phase.name}</div>
                          <div className="text-gray-400">{phase.description}</div>
                          <div className="text-purple-400 mt-1">
                            {phase.opportunities.length} issues
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files affected (sample) */}
                {pkg.opportunities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-400 mb-1">
                      Affected Files (sample)
                    </h4>
                    <div className="text-xs text-gray-400 font-mono space-y-1">
                      {Array.from(
                        new Set(
                          pkg.opportunities
                            .flatMap(o => o.files)
                            .slice(0, 5)
                        )
                      ).map((file, idx) => (
                        <div key={idx} className="truncate">{file}</div>
                      ))}
                      {pkg.opportunities.flatMap(o => o.files).length > 5 && (
                        <div className="text-cyan-400">
                          +{pkg.opportunities.flatMap(o => o.files).length - 5} more files
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Execution order indicator */}
      <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-xs font-bold text-cyan-400 border border-cyan-500/30">
        {pkg.executionOrder}
      </div>
    </motion.div>
  );
}
