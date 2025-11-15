'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Eye, Layers, Box, Hammer, Camera, Target, Trash2, Code, LucideIcon } from 'lucide-react';
import { TechniqueGroup } from '../lib/stepperConfig';

export interface StepperConfigPanelProps {
  groups: TechniqueGroup[];
  onToggle: (groupId: string, enabled: boolean) => void;
  transparentBackdrop?: boolean; // If true, backdrop is transparent (allows seeing layout underneath)
}

/**
 * Icon map for technique groups
 */
const TECHNIQUE_ICONS: Record<string, LucideIcon> = {
  vision: Eye,
  knowledge: Layers,
  structure: Box,
  quality: Hammer,
  'nextjs-ui': Camera,
  'nextjs-cleanup': Trash2,
  'fastapi-api': Code,
};

/**
 * Color map for technique groups (active state)
 */
const COLOR_CLASSES: Record<string, {
  border: string;
  bg: string;
  shadow: string;
  text: string;
  iconBg: string;
  iconBorder: string;
  iconText: string;
  badge: string;
  badgeText: string;
  indicator: string;
}> = {
  cyan: {
    border: 'border-cyan-500/50',
    bg: 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10',
    shadow: 'shadow-lg shadow-cyan-500/20',
    text: 'text-cyan-300',
    iconBg: 'bg-cyan-500/20',
    iconBorder: 'border-cyan-500/30',
    iconText: 'text-cyan-400',
    badge: 'bg-cyan-500/30',
    badgeText: 'text-cyan-300',
    indicator: 'bg-cyan-400',
  },
  blue: {
    border: 'border-blue-500/50',
    bg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10',
    shadow: 'shadow-lg shadow-blue-500/20',
    text: 'text-blue-300',
    iconBg: 'bg-blue-500/20',
    iconBorder: 'border-blue-500/30',
    iconText: 'text-blue-400',
    badge: 'bg-blue-500/30',
    badgeText: 'text-blue-300',
    indicator: 'bg-blue-400',
  },
  purple: {
    border: 'border-purple-500/50',
    bg: 'bg-gradient-to-br from-purple-500/20 to-purple-600/10',
    shadow: 'shadow-lg shadow-purple-500/20',
    text: 'text-purple-300',
    iconBg: 'bg-purple-500/20',
    iconBorder: 'border-purple-500/30',
    iconText: 'text-purple-400',
    badge: 'bg-purple-500/30',
    badgeText: 'text-purple-300',
    indicator: 'bg-purple-400',
  },
  amber: {
    border: 'border-amber-500/50',
    bg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10',
    shadow: 'shadow-lg shadow-amber-500/20',
    text: 'text-amber-300',
    iconBg: 'bg-amber-500/20',
    iconBorder: 'border-amber-500/30',
    iconText: 'text-amber-400',
    badge: 'bg-amber-500/30',
    badgeText: 'text-amber-300',
    indicator: 'bg-amber-400',
  },
  pink: {
    border: 'border-pink-500/50',
    bg: 'bg-gradient-to-br from-pink-500/20 to-pink-600/10',
    shadow: 'shadow-lg shadow-pink-500/20',
    text: 'text-pink-300',
    iconBg: 'bg-pink-500/20',
    iconBorder: 'border-pink-500/30',
    iconText: 'text-pink-400',
    badge: 'bg-pink-500/30',
    badgeText: 'text-pink-300',
    indicator: 'bg-pink-400',
  },
  red: {
    border: 'border-red-500/50',
    bg: 'bg-gradient-to-br from-red-500/20 to-red-600/10',
    shadow: 'shadow-lg shadow-red-500/20',
    text: 'text-red-300',
    iconBg: 'bg-red-500/20',
    iconBorder: 'border-red-500/30',
    iconText: 'text-red-400',
    badge: 'bg-red-500/30',
    badgeText: 'text-red-300',
    indicator: 'bg-red-400',
  },
  green: {
    border: 'border-green-500/50',
    bg: 'bg-gradient-to-br from-green-500/20 to-green-600/10',
    shadow: 'shadow-lg shadow-green-500/20',
    text: 'text-green-300',
    iconBg: 'bg-green-500/20',
    iconBorder: 'border-green-500/30',
    iconText: 'text-green-400',
    badge: 'bg-green-500/30',
    badgeText: 'text-green-300',
    indicator: 'bg-green-400',
  },
};

/**
 * Floating configuration panel for stepper technique groups
 */
export default function StepperConfigPanel({
  groups,
  onToggle,
  transparentBackdrop = true, // Default to transparent to see layout changes in real-time
}: StepperConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-6 right-6 z-50 p-3 bg-gray-900/90 backdrop-blur-xl border-2 border-cyan-500/50 rounded-xl shadow-lg shadow-cyan-500/20 hover:border-cyan-400/70 transition-all"
        data-testid="stepper-config-toggle-btn"
      >
        <Settings className="w-5 h-5 text-cyan-400" />
      </motion.button>

      {/* Config Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className={`fixed inset-0 z-[60] ${
                transparentBackdrop
                  ? 'bg-transparent' // Fully transparent - see layout underneath
                  : 'bg-black/60 backdrop-blur-sm' // Dark backdrop
              }`}
              data-testid="stepper-config-backdrop"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-2xl bg-gray-950/95 backdrop-blur-xl border-l-2 border-cyan-500/30 shadow-2xl z-[70] overflow-y-auto"
              data-testid="stepper-config-panel"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gray-950/95 backdrop-blur-xl border-b border-cyan-500/20 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-cyan-300 font-mono uppercase tracking-wide">Scan Configuration</h2>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Toggle technique groups on/off
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                  data-testid="stepper-config-close-btn"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content - 3 Column Grid */}
              <div className="p-6">
                {/* Grid Pattern Background */}
                <div
                  className="absolute inset-0 opacity-5 pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px',
                  }}
                />

                <div className="relative grid grid-cols-3 gap-4">
                  {groups.map((group, idx) => {
                    const Icon = TECHNIQUE_ICONS[group.id] || Target;
                    const isActive = group.enabled;
                    const colors = COLOR_CLASSES[group.color] || COLOR_CLASSES.cyan;

                    return (
                      <motion.button
                        key={group.id}
                        onClick={() => onToggle(group.id, !group.enabled)}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`
                          relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-300
                          ${
                            isActive
                              ? `${colors.border} ${colors.bg} ${colors.shadow}`
                              : 'border-gray-700/30 bg-gray-800/20 opacity-50'
                          }
                          hover:shadow-xl
                        `}
                        data-testid={`stepper-toggle-${group.id}`}
                      >
                        {/* Active Indicator - Static version (removed pulse animation) */}
                        {isActive && (
                          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${colors.indicator} shadow-lg`} />
                        )}

                        {/* Icon */}
                        <div className={`
                          p-4 rounded-lg mb-3 transition-all duration-300
                          ${
                            isActive
                              ? `${colors.iconBg} border ${colors.iconBorder}`
                              : 'bg-gray-800/30 border border-gray-700/20'
                          }
                        `}>
                          <Icon
                            className={`w-8 h-8 transition-colors ${
                              isActive ? colors.iconText : 'text-gray-500'
                            }`}
                          />
                        </div>

                        {/* Title */}
                        <h3 className={`
                          text-sm font-bold font-mono uppercase tracking-wider text-center transition-colors
                          ${isActive ? colors.text : 'text-gray-500'}
                        `}>
                          {group.name}
                        </h3>

                        {/* Techniques Count Badge */}
                        <div className={`
                          mt-2 px-2 py-0.5 rounded-full text-[10px] font-mono transition-all
                          ${
                            isActive
                              ? `${colors.badge} ${colors.badgeText}`
                              : 'bg-gray-800/50 text-gray-600'
                          }
                        `}>
                          {group.techniques.length} {group.techniques.length === 1 ? 'scan' : 'scans'}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Help text */}
                <div className="relative mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <p className="text-xs text-cyan-300/80 font-mono">
                    💡 <strong>Tip:</strong> Click to toggle groups on/off. Changes apply immediately to the blueprint layout.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
