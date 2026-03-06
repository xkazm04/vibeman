'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TruncateTooltipProps {
  /** Primary text shown in the tooltip */
  text: string;
  /** Optional secondary line (e.g. context path) */
  subtitle?: string;
  /** Content to render (should contain truncated text) */
  children: React.ReactNode;
  /** Hover delay in ms before showing tooltip (default 500) */
  delay?: number;
}

export function TruncateTooltip({ text, subtitle, children, delay = 500 }: TruncateTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Position above the element, horizontally centered
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setVisible(true);
  }, []);

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(show, delay);
  }, [delay, show]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Clamp tooltip so it doesn't overflow viewport
  const clampX = (x: number) => {
    if (typeof window === 'undefined') return x;
    return Math.max(120, Math.min(x, window.innerWidth - 120));
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="min-w-0"
      >
        {children}
      </div>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {visible && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[9999] pointer-events-none max-w-xs px-2.5 py-1.5 rounded-md bg-gray-900/95 border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/30"
                style={{
                  left: clampX(position.x),
                  top: position.y - 6,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="text-xs text-gray-200 font-mono break-all leading-relaxed">
                  {text}
                </div>
                {subtitle && (
                  <div className="text-[10px] text-gray-400 mt-0.5 break-all leading-snug">
                    {subtitle}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
