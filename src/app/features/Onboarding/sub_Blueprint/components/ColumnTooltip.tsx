'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

interface ColumnTooltipProps {
  isVisible: boolean;
  title: string;
  description: string;
  onClose: () => void;
  autoCloseDelay?: number; // milliseconds, default 5000
}

/**
 * Lightweight tooltip component for Blueprint columns
 * Displays guidance with auto-close functionality
 */
export default function ColumnTooltip({
  isVisible,
  title,
  description,
  onClose,
  autoCloseDelay = 5000,
}: ColumnTooltipProps) {
  // Auto-close after delay
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoCloseDelay, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute top-0 left-0 right-0 z-50 pointer-events-none"
          data-testid="column-tooltip"
        >
          <div className="bg-gradient-to-br from-cyan-950/95 to-blue-950/95 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-2xl p-4 pointer-events-auto">
            {/* Header with title and close button */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-cyan-300 text-sm font-mono font-semibold tracking-wide uppercase">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-cyan-400/60 hover:text-cyan-300 transition-colors flex-shrink-0"
                aria-label="Close tooltip"
                data-testid="tooltip-close-btn"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="4" y1="4" x2="12" y2="12" />
                  <line x1="12" y1="4" x2="4" y2="12" />
                </svg>
              </button>
            </div>

            {/* Description */}
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              {description}
            </p>

            {/* Next action indicator */}
            <div className="flex items-center gap-2 text-cyan-400/70">
              <ChevronRight size={14} className="animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-wider">Next</span>
            </div>

            {/* Decorative bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
