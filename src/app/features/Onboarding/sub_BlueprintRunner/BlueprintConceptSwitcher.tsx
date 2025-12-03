/**
 * Blueprint Concept Switcher
 * Toolbar with icons to switch between visualization concepts
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Cpu, Orbit, X } from 'lucide-react';
import { VisualizationConcept } from './types';

interface BlueprintConceptSwitcherProps {
  activeConcept: VisualizationConcept | null;
  onConceptChange: (concept: VisualizationConcept | null) => void;
}

const CONCEPTS: {
  id: VisualizationConcept;
  icon: React.ElementType;
  label: string;
  description: string;
}[] = [
  {
    id: 'horizontal',
    icon: ArrowRight,
    label: 'Pipeline',
    description: 'Horizontal flow',
  },
  {
    id: 'circuit',
    icon: Cpu,
    label: 'Circuit',
    description: 'PCB layout',
  },
  {
    id: 'radial',
    icon: Orbit,
    label: 'Orbital',
    description: 'Radial layout',
  },
];

export default function BlueprintConceptSwitcher({
  activeConcept,
  onConceptChange,
}: BlueprintConceptSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-xl">
      {CONCEPTS.map((concept) => {
        const Icon = concept.icon;
        const isActive = activeConcept === concept.id;

        return (
          <motion.button
            key={concept.id}
            onClick={() => onConceptChange(isActive ? null : concept.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              isActive
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
            title={`${concept.label}: ${concept.description}`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-xs font-medium">{concept.label}</span>

            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="concept-indicator"
                className="absolute inset-0 border border-cyan-500/50 rounded-lg"
                initial={false}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              />
            )}
          </motion.button>
        );
      })}

      {/* Close button when a concept is active */}
      {activeConcept && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => onConceptChange(null)}
          className="ml-1 p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Close runner"
        >
          <X className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
