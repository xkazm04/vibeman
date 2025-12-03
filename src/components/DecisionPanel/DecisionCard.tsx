'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon, Loader2 } from 'lucide-react';
import { sanitizeContent } from '@/lib/sanitize';
import { useThemeStore } from '@/stores/themeStore';
import { getFocusRingStyles } from '@/lib/ui/focusRing';
import { scales, offsets } from '@/lib/design-tokens';

export type DecisionCardSeverity = 'info' | 'warning' | 'error' | 'success';
export type DecisionCardVariant = 'primary' | 'secondary' | 'danger' | 'success';

export interface DecisionCardAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void | Promise<void>;
  variant?: DecisionCardVariant;
  disabled?: boolean;
  loading?: boolean;
  testId?: string;
  ariaLabel?: string;
}

export interface DecisionCardConfig {
  title: string;
  subtitle?: string;
  description: string;
  severity?: DecisionCardSeverity;
  icon: LucideIcon;
  count?: number;
  actions: DecisionCardAction[];
  isProcessing?: boolean;
  customContent?: React.ReactNode;
  onClose?: () => void;
  visible?: boolean;
  testId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SEVERITY_COLORS = {
  info: {
    bg: 'from-blue-600/40 to-cyan-500/40',
    border: 'border-cyan-500/50',
    text: 'text-cyan-300',
    glow: 'shadow-cyan-500/50',
  },
  warning: {
    bg: 'from-yellow-600/40 to-amber-500/40',
    border: 'border-yellow-500/50',
    text: 'text-yellow-300',
    glow: 'shadow-yellow-500/50',
  },
  error: {
    bg: 'from-red-600/40 to-rose-500/40',
    border: 'border-red-500/50',
    text: 'text-red-300',
    glow: 'shadow-red-500/50',
  },
  success: {
    bg: 'from-green-600/40 to-emerald-500/40',
    border: 'border-green-500/50',
    text: 'text-green-300',
    glow: 'shadow-green-500/50',
  },
};

const VARIANT_STYLES = {
  primary: {
    bg: 'bg-gradient-to-r from-green-600/60 to-emerald-500/60 hover:from-green-500/70 hover:to-emerald-400/70',
    border: 'border-green-500/60 hover:border-green-400/80',
    text: 'text-white',
    shadow: 'shadow-lg shadow-green-500/20',
    glow: 'bg-green-500/20',
  },
  secondary: {
    bg: 'bg-gray-800/50 hover:bg-gray-700/50',
    border: 'border-gray-600/50 hover:border-gray-500/50',
    text: 'text-gray-300 hover:text-gray-100',
    shadow: '',
    glow: 'bg-gray-500/10',
  },
  danger: {
    bg: 'bg-gradient-to-r from-red-600/60 to-rose-500/60 hover:from-red-500/70 hover:to-rose-400/70',
    border: 'border-red-500/60 hover:border-red-400/80',
    text: 'text-white',
    shadow: 'shadow-lg shadow-red-500/20',
    glow: 'bg-red-500/20',
  },
  success: {
    bg: 'bg-gradient-to-r from-cyan-600/60 to-blue-500/60 hover:from-cyan-500/70 hover:to-blue-400/70',
    border: 'border-cyan-500/60 hover:border-cyan-400/80',
    text: 'text-white',
    shadow: 'shadow-lg shadow-cyan-500/20',
    glow: 'bg-cyan-500/20',
  },
};

const SIZE_CONFIG = {
  sm: {
    container: 'max-w-2xl',
    padding: 'p-4',
    iconSize: 'w-12 h-12',
    iconInner: 'w-6 h-6',
    titleSize: 'text-xl',
    subtitleSize: 'text-xs',
    descriptionSize: 'text-xs',
    buttonPadding: 'px-6 py-2',
    buttonText: 'text-xs',
    buttonIcon: 'w-4 h-4',
  },
  md: {
    container: 'max-w-5xl',
    padding: 'p-6',
    iconSize: 'w-16 h-16',
    iconInner: 'w-8 h-8',
    titleSize: 'text-2xl',
    subtitleSize: 'text-sm',
    descriptionSize: 'text-sm',
    buttonPadding: 'px-10 py-4',
    buttonText: 'text-sm',
    buttonIcon: 'w-5 h-5',
  },
  lg: {
    container: 'max-w-7xl',
    padding: 'p-8',
    iconSize: 'w-20 h-20',
    iconInner: 'w-10 h-10',
    titleSize: 'text-3xl',
    subtitleSize: 'text-base',
    descriptionSize: 'text-base',
    buttonPadding: 'px-12 py-5',
    buttonText: 'text-base',
    buttonIcon: 'w-6 h-6',
  },
};

/**
 * DecisionCard - A reusable card component for displaying decision points,
 * configuration steps, and action panels across the application.
 *
 * Features:
 * - Framer Motion animations for smooth entrance/exit
 * - Accessibility: ARIA labels, keyboard navigation, focus management
 * - Dark mode support via Tailwind tokens
 * - Configurable severity levels (info, warning, error, success)
 * - Flexible action buttons with variants
 * - Size variants (sm, md, lg)
 * - Custom content slot
 * - Count badge support
 * - Processing state handling
 *
 * @example
 * ```tsx
 * <DecisionCard
 *   config={{
 *     title: "Configure Build Settings",
 *     description: "Review and confirm the build configuration.",
 *     severity: "info",
 *     icon: Settings,
 *     actions: [
 *       { label: "Cancel", icon: X, onClick: handleCancel, variant: "secondary" },
 *       { label: "Confirm", icon: Check, onClick: handleConfirm, variant: "primary" }
 *     ]
 *   }}
 * />
 * ```
 */
export default function DecisionCard({ config }: { config: DecisionCardConfig }) {
  const {
    title,
    subtitle,
    description,
    severity = 'info',
    icon: Icon,
    count,
    actions,
    isProcessing = false,
    customContent,
    onClose,
    visible = true,
    testId = 'decision-card',
    size = 'md',
    className = '',
  } = config;

  const { theme } = useThemeStore();
  const focusRingClasses = getFocusRingStyles(theme);
  const colors = SEVERITY_COLORS[severity];
  const sizeConfig = SIZE_CONFIG[size];
  const panelRef = useRef<HTMLDivElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);

  // Sanitize text content to prevent XSS
  const sanitizedTitle = useMemo(() => sanitizeContent(title), [title]);
  const sanitizedSubtitle = useMemo(() => (subtitle ? sanitizeContent(subtitle) : null), [subtitle]);
  const sanitizedDescription = useMemo(() => sanitizeContent(description), [description]);

  // Focus trap: Focus first action button when panel appears
  useEffect(() => {
    if (visible && firstActionRef.current) {
      firstActionRef.current.focus();
    }
  }, [visible]);

  // Keyboard navigation: Tab through actions, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;

      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: -40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.9 }}
        transition={{
          type: 'spring',
          damping: 25,
          stiffness: 300,
        }}
        className={`relative w-full ${sizeConfig.container} mx-auto ${className}`}
        role="region"
        aria-live="polite"
        aria-labelledby={`${testId}-title`}
        data-testid={testId}
      >
        {/* Main card */}
        <div className="relative bg-gray-900/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl">
          {/* Ambient glow based on severity */}
          <div
            className={`absolute inset-0 bg-gradient-to-r ${colors.bg} opacity-5 blur-2xl pointer-events-none`}
          />

          {/* Top accent line */}
          <div className={`h-1 bg-gradient-to-r ${colors.bg} opacity-60`} />

          {/* Content */}
          <div className={`relative ${sizeConfig.padding}`}>
            <div className="flex items-start gap-6">
              {/* Icon + Count Badge */}
              <div className="relative flex-shrink-0">
                {/* Icon circle */}
                <div
                  className={`${sizeConfig.iconSize} rounded-full border-2 ${colors.border} bg-gradient-to-br ${colors.bg} flex items-center justify-center`}
                >
                  <Icon className={`${sizeConfig.iconInner} ${colors.text}`} aria-hidden="true" />
                </div>

                {/* Count badge */}
                {count !== undefined && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 500, damping: 20 }}
                    className={`absolute -bottom-2 -right-2 min-w-[2.5rem] h-10 px-3 rounded-full border-2 ${colors.border} bg-gray-950 flex items-center justify-center`}
                    data-testid={`${testId}-count-badge`}
                  >
                    <span className={`text-lg font-bold font-mono ${colors.text}`}>{count}</span>
                  </motion.div>
                )}

                {/* Pulsing outer ring */}
                <motion.div
                  className={`absolute inset-0 rounded-full border-2 ${colors.border}`}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                {/* Subtitle (optional) */}
                {sanitizedSubtitle && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 }}
                    className={`${sizeConfig.subtitleSize} uppercase tracking-wider text-gray-500 mb-1 font-semibold`}
                    data-testid={`${testId}-subtitle`}
                    dangerouslySetInnerHTML={{ __html: sanitizedSubtitle }}
                  />
                )}

                {/* Title */}
                <motion.h3
                  id={`${testId}-title`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`${sizeConfig.titleSize} font-bold ${colors.text} mb-2`}
                  data-testid={`${testId}-title`}
                  dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
                />

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className={`${sizeConfig.descriptionSize} text-gray-400`}
                  data-testid={`${testId}-description`}
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />

                {/* Custom content slot */}
                {customContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4"
                    data-testid={`${testId}-custom-content`}
                  >
                    {customContent}
                  </motion.div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {actions.map((action, index) => {
                  const variant = action.variant || 'secondary';
                  const styles = VARIANT_STYLES[variant];
                  const isFirstAction = index === 0;

                  return (
                    <motion.button
                      key={action.label}
                      ref={isFirstAction ? firstActionRef : undefined}
                      onClick={action.onClick}
                      disabled={action.disabled || isProcessing}
                      whileHover={{ scale: scales.hover, y: offsets.liftY }}
                      whileTap={{ scale: scales.tap }}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      className={`group relative ${sizeConfig.buttonPadding} rounded-xl ${styles.bg} border-2 ${styles.border} transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${styles.shadow} ${focusRingClasses}`}
                      data-testid={
                        action.testId ||
                        `${testId}-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`
                      }
                      aria-label={action.ariaLabel || action.label}
                    >
                      {/* Outer glow */}
                      <div
                        className={`absolute inset-0 rounded-xl ${styles.glow} blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`}
                      />

                      {/* Shimmer effect for primary variant */}
                      {variant === 'primary' && (
                        <motion.div
                          className="absolute inset-0 rounded-xl overflow-hidden"
                          animate={{
                            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          style={{
                            background:
                              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                            backgroundSize: '200% 100%',
                          }}
                        />
                      )}

                      <div className="relative flex items-center gap-2">
                        {action.loading || (isProcessing && variant === 'primary') ? (
                          <Loader2 className={`${sizeConfig.buttonIcon} ${styles.text} animate-spin`} />
                        ) : (
                          <action.icon className={`${sizeConfig.buttonIcon} ${styles.text}`} aria-hidden="true" />
                        )}
                        <span className={`${sizeConfig.buttonText} font-bold tracking-wide ${styles.text} uppercase`}>
                          {action.loading || (isProcessing && variant === 'primary') ? 'Processing...' : action.label}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom accent line */}
          <div className={`h-0.5 bg-gradient-to-r ${colors.bg} opacity-40`} />
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-1 h-1 rounded-full bg-gradient-to-r ${colors.bg}`}
              animate={{
                x: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
                y: ['100%', '-10%'],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeInOut',
              }}
              style={{
                left: `${20 + i * 30}%`,
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
