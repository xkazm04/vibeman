'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronLeft, ChevronRight, Smartphone, Tablet, Monitor, Tv } from 'lucide-react';
import { useBreakpointStore } from '@/stores/breakpointStore';
import BreakpointRuler from './BreakpointRuler';
import BreakpointGuide from './BreakpointGuide';
import type { Breakpoint } from '@/lib/emulator/mediaQueryDetector';
import {
  DEFAULT_BREAKPOINTS,
  COMMON_DEVICE_WIDTHS,
  getNextBreakpoint,
  getPreviousBreakpoint,
  createCustomBreakpoint,
  mergeBreakpoints,
} from '@/lib/emulator/mediaQueryDetector';

export default function ResponsivePanel() {
  const {
    viewportWidth,
    breakpoints,
    customBreakpoints,
    setViewportWidth,
    addCustomBreakpoint,
    removeCustomBreakpoint,
    jumpToBreakpoint,
  } = useBreakpointStore();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMinWidth, setCustomMinWidth] = useState('');

  // Merge default + custom breakpoints
  const allBreakpoints = mergeBreakpoints(breakpoints, customBreakpoints);

  // Handle breakpoint click
  const handleBreakpointClick = useCallback(
    (bp: Breakpoint) => {
      jumpToBreakpoint(bp);
    },
    [jumpToBreakpoint]
  );

  // Handle jump to next/previous breakpoint
  const handleJumpNext = useCallback(() => {
    const next = getNextBreakpoint(viewportWidth, allBreakpoints);
    if (next) jumpToBreakpoint(next);
  }, [viewportWidth, allBreakpoints, jumpToBreakpoint]);

  const handleJumpPrevious = useCallback(() => {
    const prev = getPreviousBreakpoint(viewportWidth, allBreakpoints);
    if (prev) jumpToBreakpoint(prev);
  }, [viewportWidth, allBreakpoints, jumpToBreakpoint]);

  // Handle add custom breakpoint
  const handleAddCustom = useCallback(() => {
    if (customName && customMinWidth) {
      const bp = createCustomBreakpoint(customName, parseInt(customMinWidth, 10));
      addCustomBreakpoint(bp);
      setCustomName('');
      setCustomMinWidth('');
      setShowCustomForm(false);
    }
  }, [customName, customMinWidth, addCustomBreakpoint]);

  // Get device icon based on width
  const getDeviceIcon = (width: number) => {
    if (width < 640) return Smartphone;
    if (width < 1024) return Tablet;
    if (width < 1536) return Monitor;
    return Tv;
  };

  const DeviceIcon = getDeviceIcon(viewportWidth);

  return (
    <div className="space-y-4">
      {/* Main Ruler Section */}
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DeviceIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-gray-200">Viewport Width</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleJumpPrevious}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Previous breakpoint"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <input
              type="number"
              value={viewportWidth}
              onChange={(e) => setViewportWidth(parseInt(e.target.value, 10) || 320)}
              className="w-20 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-center text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
              min={320}
              max={2560}
            />
            <span className="text-xs text-gray-500">px</span>
            <button
              onClick={handleJumpNext}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Next breakpoint"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Breakpoint Ruler */}
        <BreakpointRuler
          currentWidth={viewportWidth}
          onWidthChange={setViewportWidth}
          onBreakpointClick={handleBreakpointClick}
          breakpoints={allBreakpoints}
          isDraggable={true}
        />
      </div>

      {/* Breakpoint Guide */}
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <BreakpointGuide
          currentWidth={viewportWidth}
          breakpoints={allBreakpoints}
          onBreakpointClick={handleBreakpointClick}
        />
      </div>

      {/* Quick Device Presets */}
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          Device Presets
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {COMMON_DEVICE_WIDTHS.slice(0, 8).map((device) => {
            const isActive = viewportWidth === device.width;
            return (
              <button
                key={device.name}
                onClick={() => setViewportWidth(device.width)}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all
                  ${isActive
                    ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
                    : 'bg-gray-700/30 hover:bg-gray-700/50 border border-gray-700 text-gray-400 hover:text-gray-200'
                  }
                `}
              >
                <span className="truncate">{device.name}</span>
                <span className="text-[10px] opacity-60">{device.width}px</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Breakpoints */}
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Custom Breakpoints
          </h3>
          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Add custom breakpoint form */}
        <AnimatePresence>
          {showCustomForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex gap-2 p-2 bg-gray-900 rounded-lg">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Name"
                  className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="number"
                  value={customMinWidth}
                  onChange={(e) => setCustomMinWidth(e.target.value)}
                  placeholder="Width"
                  className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                  min={0}
                  max={2560}
                />
                <button
                  onClick={handleAddCustom}
                  disabled={!customName || !customMinWidth}
                  className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded text-xs text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom breakpoints list */}
        {customBreakpoints.length > 0 ? (
          <div className="space-y-1">
            {customBreakpoints.map((bp) => (
              <div
                key={bp.name}
                className="flex items-center justify-between px-3 py-2 bg-gray-700/30 rounded-lg"
              >
                <button
                  onClick={() => jumpToBreakpoint(bp)}
                  className="flex items-center gap-2 text-left"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: bp.color }}
                  />
                  <span className="text-xs text-gray-300">{bp.name}</span>
                  <span className="text-[10px] text-gray-500">{bp.minWidth}px</span>
                </button>
                <button
                  onClick={() => removeCustomBreakpoint(bp.name)}
                  className="p-1 hover:bg-red-500/20 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-2">
            No custom breakpoints defined
          </p>
        )}
      </div>

      {/* Tailwind Breakpoints Reference */}
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          Tailwind Breakpoints
        </h3>
        <div className="space-y-1">
          {DEFAULT_BREAKPOINTS.map((bp) => (
            <button
              key={bp.name}
              onClick={() => jumpToBreakpoint(bp)}
              className={`
                w-full flex items-center justify-between px-3 py-1.5 rounded text-xs transition-all
                ${viewportWidth >= (bp.minWidth ?? 0) && (bp.maxWidth === null || viewportWidth <= bp.maxWidth)
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                  : 'hover:bg-gray-700/50 text-gray-400'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: bp.color }}
                />
                <span className="font-medium">{bp.label}</span>
              </div>
              <span className="text-[10px] opacity-60">
                {bp.minWidth ?? 0}px {bp.maxWidth ? `- ${bp.maxWidth}px` : '+'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
