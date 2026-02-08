'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lightbulb, ArrowRight } from 'lucide-react';
import { ScanType, ScanTypeConfig, SCAN_TYPE_CONFIGS, getAgentExamples } from '../lib/scanTypes';

interface ScanTypePreviewProps {
  scanType: ScanType;
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

/** @deprecated Examples now live in AGENT_REGISTRY. This accessor is kept for local usage. */
function getExamples(scanType: ScanType): string[] {
  return getAgentExamples(scanType);
}

/**
 * ScanTypePreview - Shows what a scan type produces with examples
 */
export function ScanTypePreview({
  scanType,
  expanded = false,
  onToggle,
  className = '',
}: ScanTypePreviewProps) {
  const config = SCAN_TYPE_CONFIGS.find(c => c.value === scanType);
  const examples = getExamples(scanType);

  if (!config) return null;

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-700/30 ${className}`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 ${config.color} transition-colors`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.emoji}</span>
          <span className="font-medium">{config.label}</span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 opacity-60" />
        </motion.div>
      </button>

      {/* Expandable Examples */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-gray-800/50 space-y-2 border-t border-gray-700/20">
              <p className="text-xs text-gray-400 mb-2">{config.description}</p>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Example outputs:
              </div>
              {examples.map((example, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-2 text-xs text-gray-300"
                >
                  <Lightbulb className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{example}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact preview card for scan type selection
 */
export function ScanTypeCard({
  config,
  selected,
  onSelect,
  showExamples = false,
}: {
  config: ScanTypeConfig;
  selected: boolean;
  onSelect: () => void;
  showExamples?: boolean;
}) {
  const [hovering, setHovering] = useState(false);
  const examples = getExamples(config.value);

  return (
    <motion.button
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`
        relative p-4 rounded-xl border-2 transition-all text-left
        ${selected
          ? config.color
          : 'bg-gray-800/40 border-gray-700/40 hover:bg-gray-800/60 hover:border-gray-600/40'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{config.emoji}</span>
        <span className={`font-semibold ${selected ? '' : 'text-gray-300'}`}>
          {config.label}
        </span>
      </div>

      <p className={`text-xs mb-2 ${selected ? 'opacity-80' : 'text-gray-500'}`}>
        {config.description}
      </p>

      {/* Example preview on hover */}
      <AnimatePresence>
        {showExamples && hovering && examples.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="pt-2 border-t border-gray-700/50"
          >
            <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
              <ArrowRight className="w-2.5 h-2.5" />
              <span>Finds:</span>
            </div>
            <p className="text-[10px] text-gray-400 truncate">
              {examples[0]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/**
 * Category-based scan type selector with previews
 */
export function ScanTypeCategorySelector({
  selectedTypes,
  onToggle,
  showExamples = true,
}: {
  selectedTypes: ScanType[];
  onToggle: (type: ScanType) => void;
  showExamples?: boolean;
}) {
  const categories = [
    { key: 'technical', label: 'Technical', icon: '⚙️' },
    { key: 'user', label: 'User Focus', icon: '👤' },
    { key: 'business', label: 'Business', icon: '📈' },
    { key: 'mastermind', label: 'Mastermind', icon: '🧠' },
  ] as const;

  return (
    <div className="space-y-4">
      {categories.map(category => {
        const configs = SCAN_TYPE_CONFIGS.filter(c => c.category === category.key);

        return (
          <div key={category.key}>
            <div className="flex items-center gap-2 mb-2">
              <span>{category.icon}</span>
              <span className="text-sm font-medium text-gray-400">{category.label}</span>
              <span className="text-xs text-gray-600">
                ({configs.filter(c => selectedTypes.includes(c.value)).length}/{configs.length})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {configs.map(config => (
                <ScanTypeCard
                  key={config.value}
                  config={config}
                  selected={selectedTypes.includes(config.value)}
                  onSelect={() => onToggle(config.value)}
                  showExamples={showExamples}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ScanTypePreview;
