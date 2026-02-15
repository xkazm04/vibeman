'use client';

import { useCallback } from 'react';
import { ChevronLeft, ChevronRight, Ruler } from 'lucide-react';
import { useBreakpointStore } from '@/stores/breakpointStore';
import { BreakpointGuideInline } from './BreakpointGuide';
import {
  getNextBreakpoint,
  getPreviousBreakpoint,
  mergeBreakpoints,
} from '@/lib/emulator/mediaQueryDetector';

/**
 * Breakpoint Jumper Bar
 * Standalone viewport-width stepper with ruler toggle.
 * Depends only on breakpointStore — no connection/device state.
 */
export default function BreakpointJumperBar() {
  const {
    viewportWidth,
    breakpoints,
    customBreakpoints,
    isBreakpointRulerVisible,
    jumpToBreakpoint,
    toggleBreakpointRuler,
  } = useBreakpointStore();

  const allBreakpoints = mergeBreakpoints(breakpoints, customBreakpoints);

  const handleJumpNext = useCallback(() => {
    const next = getNextBreakpoint(viewportWidth, allBreakpoints);
    if (next) jumpToBreakpoint(next);
  }, [viewportWidth, allBreakpoints, jumpToBreakpoint]);

  const handleJumpPrevious = useCallback(() => {
    const prev = getPreviousBreakpoint(viewportWidth, allBreakpoints);
    if (prev) jumpToBreakpoint(prev);
  }, [viewportWidth, allBreakpoints, jumpToBreakpoint]);

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-800/30 border border-gray-700/50 rounded-lg">
      <div className="flex items-center gap-2">
        <Ruler className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs text-gray-400">Viewport:</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleJumpPrevious}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Previous breakpoint"
          >
            <ChevronLeft className="w-3 h-3 text-gray-400" />
          </button>
          <span className="text-xs font-medium text-cyan-400 min-w-[50px] text-center">
            {viewportWidth}px
          </span>
          <button
            onClick={handleJumpNext}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Next breakpoint"
          >
            <ChevronRight className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Inline breakpoint indicator */}
        <BreakpointGuideInline
          currentWidth={viewportWidth}
          breakpoints={allBreakpoints}
        />

        {/* Toggle ruler visibility */}
        <button
          onClick={toggleBreakpointRuler}
          className={`
            px-2 py-1 text-[10px] rounded transition-all
            ${isBreakpointRulerVisible
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-gray-700/50 text-gray-500 hover:text-gray-300 border border-gray-700'
            }
          `}
        >
          {isBreakpointRulerVisible ? 'Hide Ruler' : 'Show Ruler'}
        </button>
      </div>
    </div>
  );
}
