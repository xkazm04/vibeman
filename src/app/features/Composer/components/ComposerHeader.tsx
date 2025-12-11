/**
 * Composer Header
 * Title, description, and color selection for blueprint composition
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, ChevronDown, Sparkles } from 'lucide-react';
import { COLOR_PALETTE } from '../types';
import { useBlueprintComposerStore } from '../store/blueprintComposerStore';

export default function ComposerHeader() {
  const { composition, setName, setDescription, setColor } = useBlueprintComposerStore();
  const [showColorPicker, setShowColorPicker] = useState(false);

  const selectedColorMeta = COLOR_PALETTE.find(c => c.value === composition.color) || COLOR_PALETTE[0];

  return (
    <div className="relative">
      {/* Background glow based on selected color */}
      <motion.div
        className="absolute inset-0 opacity-20 blur-3xl pointer-events-none"
        style={{ backgroundColor: composition.color }}
      />

      <div className="relative flex items-start gap-4 p-4">
        {/* Color selector */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="group relative w-12 h-12 rounded-xl border-2 transition-all duration-200 hover:scale-105"
            style={{
              borderColor: composition.color,
              backgroundColor: `${composition.color}20`,
              boxShadow: `0 0 20px ${selectedColorMeta.glow}`,
            }}
          >
            <div
              className="absolute inset-2 rounded-lg"
              style={{ backgroundColor: composition.color }}
            />
            <motion.div
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-900 rounded-full border flex items-center justify-center"
              style={{ borderColor: composition.color }}
              whileHover={{ scale: 1.1 }}
            >
              <Palette className="w-3 h-3" style={{ color: composition.color }} />
            </motion.div>
          </button>

          {/* Color picker dropdown */}
          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 p-2 bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl z-50"
              >
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => {
                        setColor(color.value);
                        setShowColorPicker(false);
                      }}
                      className={`relative w-8 h-8 rounded-lg transition-all duration-150 hover:scale-110 ${
                        composition.color === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {composition.color === color.value && (
                        <motion.div
                          layoutId="color-selected"
                          className="absolute inset-0 rounded-lg border-2 border-white"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Title and description inputs */}
        <div className="flex-1 space-y-2">
          <div className="relative">
            <input
              type="text"
              value={composition.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Blueprint Name"
              className="w-full bg-transparent text-xl font-semibold text-white placeholder:text-gray-600 border-b-2 border-transparent focus:border-gray-700 outline-none transition-colors py-1"
              style={{
                caretColor: composition.color,
              }}
            />
            {!composition.name && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-gray-600">
                <Sparkles className="w-3 h-3" />
                <span>Give it a name</span>
              </div>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={composition.description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of what this blueprint does..."
              className="w-full bg-transparent text-sm text-gray-400 placeholder:text-gray-700 border-b border-transparent focus:border-gray-800 outline-none transition-colors py-1"
              style={{
                caretColor: composition.color,
              }}
            />
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: composition.analyzer ? composition.color : '#4b5563' }}
            />
            <span className="text-[10px] font-mono text-gray-500 uppercase">
              {composition.analyzer ? 'Ready' : 'Draft'}
            </span>
          </div>

          {/* Component count badges */}
          <div className="flex items-center gap-1">
            {composition.analyzer && (
              <span
                className="px-1.5 py-0.5 text-[9px] font-mono rounded"
                style={{
                  backgroundColor: `${composition.color}20`,
                  color: composition.color,
                }}
              >
                1 Analyzer
              </span>
            )}
            {composition.processors.length > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-violet-500/20 text-violet-400 rounded">
                {composition.processors.length} Processor{composition.processors.length !== 1 ? 's' : ''}
              </span>
            )}
            {composition.executor && (
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-500/20 text-emerald-400 rounded">
                1 Executor
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
