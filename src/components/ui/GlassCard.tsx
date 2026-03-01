'use client';

import React, { useRef, useCallback, useState, type ReactNode, type CSSProperties } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

// ── Types ────────────────────────────────────────────────────────────────────

export type GlassIntent = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
export type GlassPadding = 'none' | 'sm' | 'md' | 'lg';

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  /** Semantic intent drives the border glow color */
  intent?: GlassIntent;
  /** Custom accent color (CSS color string). Overrides intent for glow. */
  accentColor?: string;
  /** Custom glow color for box-shadow (CSS color string). Overrides intent. */
  glowColor?: string;
  /** Padding preset */
  padding?: GlassPadding;
  /** Enable reactive mouse-follow radial gradient */
  mouseGlow?: boolean;
  /** Enable hover scale micro-interaction */
  hover?: boolean;
  /** Make the card clickable (renders as button semantically) */
  clickable?: boolean;
  /** Entrance animation */
  animate?: boolean;
  className?: string;
  style?: CSSProperties;
}

// ── Token maps ───────────────────────────────────────────────────────────────

const INTENT_BORDER: Record<GlassIntent, string> = {
  neutral: 'border-white/10',
  info: 'border-blue-500/25',
  success: 'border-emerald-500/25',
  warning: 'border-amber-500/25',
  danger: 'border-red-500/25',
  accent: 'border-purple-500/25',
};

const INTENT_GLOW_COLOR: Record<GlassIntent, string> = {
  neutral: 'rgba(255,255,255,0.04)',
  info: 'rgba(59,130,246,0.08)',
  success: 'rgba(16,185,129,0.08)',
  warning: 'rgba(245,158,11,0.08)',
  danger: 'rgba(239,68,68,0.08)',
  accent: 'rgba(168,85,247,0.08)',
};

const INTENT_MOUSE_COLOR: Record<GlassIntent, string> = {
  neutral: 'rgba(255,255,255,0.06)',
  info: 'rgba(59,130,246,0.10)',
  success: 'rgba(16,185,129,0.10)',
  warning: 'rgba(245,158,11,0.10)',
  danger: 'rgba(239,68,68,0.10)',
  accent: 'rgba(168,85,247,0.10)',
};

const PADDING: Record<GlassPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

// ── Component ────────────────────────────────────────────────────────────────

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      intent = 'neutral',
      accentColor,
      glowColor,
      padding = 'none',
      mouseGlow = true,
      hover = false,
      clickable = false,
      animate = true,
      className = '',
      style,
      onClick,
      ...motionProps
    },
    ref,
  ) => {
    const cardRef = useRef<HTMLDivElement | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!mouseGlow) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      },
      [mouseGlow],
    );

    const handleMouseLeave = useCallback(() => setMousePos(null), []);

    // Resolve glow color: custom > intent token
    const resolvedGlow = glowColor ?? INTENT_GLOW_COLOR[intent];
    const resolvedMouseColor = accentColor
      ? accentColor.replace(/[\d.]+\)$/, '0.10)')
      : INTENT_MOUSE_COLOR[intent];
    const borderClass = accentColor ? '' : INTENT_BORDER[intent];

    const cardStyle: CSSProperties = {
      boxShadow: `0 0 24px ${resolvedGlow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
      ...(accentColor ? { borderColor: `${accentColor}33` } : {}),
      ...style,
    };

    // Mouse radial gradient overlay
    const mouseOverlayStyle: CSSProperties | undefined =
      mouseGlow && mousePos
        ? {
            background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, ${resolvedMouseColor}, transparent 70%)`,
          }
        : undefined;

    const isInteractive = hover || clickable || !!onClick;

    const classes = [
      'relative overflow-hidden rounded-xl border backdrop-blur-[24px]',
      'bg-white/[0.03]',
      'transition-colors duration-200',
      borderClass,
      PADDING[padding],
      isInteractive ? 'cursor-pointer' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const animateEntrance = animate
      ? { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }
      : {};

    return (
      <motion.div
        ref={(node) => {
          // Merge refs
          cardRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={classes}
        style={cardStyle}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileHover={hover ? { scale: 1.005 } : undefined}
        whileTap={clickable ? { scale: 0.995 } : undefined}
        {...animateEntrance}
        {...motionProps}
      >
        {/* Mouse-follow radial glow overlay */}
        {mouseGlow && mousePos && (
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-150"
            style={mouseOverlayStyle}
          />
        )}

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  },
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
