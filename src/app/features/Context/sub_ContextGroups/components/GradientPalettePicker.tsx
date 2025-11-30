'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check, ChevronDown, Sparkles } from 'lucide-react';
import {
  ACCENT_PALETTES,
  AccentPaletteName,
  generateAccentPalette,
  generateGradient,
  hexToRgb,
} from '../lib/gradientUtils';

interface GradientPalettePickerProps {
  /** Current primary color */
  primaryColor: string;
  /** Current accent color (optional) */
  accentColor?: string;
  /** Callback when accent color is selected */
  onAccentChange: (color: string) => void;
  /** Whether the picker is in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * GradientPalettePicker Component
 *
 * Allows users to select accent colors for gradient transitions.
 * Provides predefined palettes and auto-generated harmonious options
 * based on the primary color.
 */
const GradientPalettePicker = React.memo(({
  primaryColor,
  accentColor,
  onAccentChange,
  compact = false,
  className = '',
}: GradientPalettePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<AccentPaletteName | 'auto'>('auto');

  // Generate auto palette based on primary color
  const autoPalette = useMemo(() => generateAccentPalette(primaryColor), [primaryColor]);

  // Get current palette colors
  const currentPaletteColors = useMemo(() => {
    if (selectedPalette === 'auto') {
      return autoPalette;
    }
    return ACCENT_PALETTES[selectedPalette];
  }, [selectedPalette, autoPalette]);

  // Handle color selection
  const handleColorSelect = useCallback((color: string) => {
    onAccentChange(color);
    if (compact) {
      setIsOpen(false);
    }
  }, [onAccentChange, compact]);

  // Handle palette change
  const handlePaletteChange = useCallback((paletteName: AccentPaletteName | 'auto') => {
    setSelectedPalette(paletteName);
    // Auto-select first color of the new palette
    const colors = paletteName === 'auto' ? autoPalette : ACCENT_PALETTES[paletteName];
    onAccentChange(colors[0]);
  }, [autoPalette, onAccentChange]);

  // Calculate preview gradient
  const previewGradient = useMemo(() => {
    return generateGradient(primaryColor, accentColor || primaryColor, '135deg', 0.6);
  }, [primaryColor, accentColor]);

  const primaryRgb = hexToRgb(primaryColor);

  return (
    <div className={`relative ${className}`} data-testid="gradient-palette-picker">
      {/* Toggle Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl
          bg-gray-800/50 border border-gray-700/50
          hover:bg-gray-700/50 hover:border-gray-600/50
          transition-all duration-200
          ${isOpen ? 'ring-2 ring-cyan-500/30' : ''}
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        data-testid="gradient-picker-toggle"
      >
        {/* Gradient Preview Circle */}
        <div
          className="w-6 h-6 rounded-full border border-white/20 shadow-lg"
          style={{ background: previewGradient }}
        />

        {!compact && (
          <>
            <span className="text-sm text-gray-300 font-medium">Accent</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 top-full mt-2 right-0 w-72 p-4 rounded-2xl
              bg-gray-900/95 backdrop-blur-xl
              border border-gray-700/50 shadow-2xl"
            data-testid="gradient-picker-dropdown"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700/50">
              <Palette className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-semibold text-gray-200">Gradient Accent</span>
            </div>

            {/* Palette Selector */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Palette Style
              </label>
              <div className="flex flex-wrap gap-2">
                {/* Auto Palette Button */}
                <motion.button
                  type="button"
                  onClick={() => handlePaletteChange('auto')}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all duration-200
                    ${selectedPalette === 'auto'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50'
                    }
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="palette-auto-btn"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto
                </motion.button>

                {/* Predefined Palettes */}
                {(Object.keys(ACCENT_PALETTES) as AccentPaletteName[]).map((paletteName) => (
                  <motion.button
                    key={paletteName}
                    type="button"
                    onClick={() => handlePaletteChange(paletteName)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium capitalize
                      transition-all duration-200
                      ${selectedPalette === paletteName
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50'
                      }
                    `}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    data-testid={`palette-${paletteName}-btn`}
                  >
                    {paletteName}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Color Grid */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Select Accent Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {currentPaletteColors.map((color, index) => {
                  const isSelected = accentColor === color;
                  const rgb = hexToRgb(color);
                  const gradient = generateGradient(primaryColor, color, '135deg', 0.8);

                  return (
                    <motion.button
                      key={`${color}-${index}`}
                      type="button"
                      onClick={() => handleColorSelect(color)}
                      className={`
                        relative w-12 h-12 rounded-xl
                        border-2 transition-all duration-200
                        ${isSelected
                          ? 'border-white shadow-lg scale-110 z-10'
                          : 'border-transparent hover:border-white/30 hover:scale-105'
                        }
                      `}
                      style={{
                        background: gradient,
                        boxShadow: isSelected ? `0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)` : undefined,
                      }}
                      whileHover={{ scale: isSelected ? 1.1 : 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      data-testid={`accent-color-${index}`}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Check className="w-5 h-5 text-white drop-shadow-lg" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Live Preview
              </label>
              <motion.div
                className="h-16 rounded-xl border border-gray-700/50 overflow-hidden"
                style={{ background: previewGradient }}
                animate={{ background: previewGradient }}
                transition={{ duration: 0.3 }}
                data-testid="gradient-live-preview"
              >
                <div className="h-full w-full flex items-center justify-center backdrop-blur-sm bg-black/10">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border border-white/30"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <div className="text-white/60 text-xs font-mono">→</div>
                    <div
                      className="w-4 h-4 rounded-full border border-white/30"
                      style={{ backgroundColor: accentColor || primaryColor }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer Hint */}
            <p className="mt-3 text-xs text-gray-500 text-center">
              Accent colors create smooth transitions between groups
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click Outside Handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
});

GradientPalettePicker.displayName = 'GradientPalettePicker';

export default GradientPalettePicker;
