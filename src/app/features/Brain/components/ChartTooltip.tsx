'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

interface ChartTooltipProps {
  /** Text content to display (ignored when children provided) */
  label?: string;
  /** Rich content alternative to label */
  children?: ReactNode;
  /** Anchor element bounding rect (from getBoundingClientRect) */
  anchorRect: DOMRect | null;
  /** Whether the tooltip is visible */
  visible: boolean;
}

/**
 * Lightweight tooltip overlay for SVG chart elements.
 * Positions via getBoundingClientRect with viewport bounds checking.
 * Supports both hover and keyboard focus triggers.
 */
export default function ChartTooltip({ label, children, anchorRect, visible }: ChartTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!visible || !anchorRect || !tooltipRef.current) {
      setPos(null);
      return;
    }

    const tt = tooltipRef.current;
    const ttRect = tt.getBoundingClientRect();

    // Default: above the anchor, centered horizontally
    let top = anchorRect.top - ttRect.height - 6;
    let left = anchorRect.left + anchorRect.width / 2 - ttRect.width / 2;

    // If tooltip would go above viewport, flip below
    if (top < 4) {
      top = anchorRect.bottom + 6;
    }

    // Clamp horizontal to viewport
    left = Math.max(4, Math.min(left, window.innerWidth - ttRect.width - 4));

    setPos({ top, left });
  }, [visible, anchorRect]);

  if (!visible) return null;

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="fixed z-50 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-2xs text-zinc-200 whitespace-nowrap pointer-events-none shadow-lg transition-opacity duration-100"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        opacity: pos ? 1 : 0,
      }}
    >
      {children ?? label}
    </div>
  );
}
