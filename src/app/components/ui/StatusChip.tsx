'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export type StatusChipState = 'idle' | 'active' | 'processing' | 'error' | 'success' | 'warning';
export type StatusChipTheme = 'phantom' | 'midnight' | 'shadow' | 'default';
export type StatusChipSize = 'sm' | 'md' | 'lg';

interface StatusChipProps {
  /** The status state that determines colors and animations */
  status: StatusChipState;
  /** Display label text */
  label: string;
  /** Optional icon component from lucide-react */
  icon?: LucideIcon;
  /** Theme variant (optional, defaults to 'default') */
  theme?: StatusChipTheme;
  /** Enable/disable animations (optional, defaults to true) */
  animated?: boolean;
  /** Size variant (optional, defaults to 'md') */
  size?: StatusChipSize;
  /** Intensity value for dynamic effects (0-1, optional) */
  intensity?: number;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

// Status-based color configurations
const STATUS_COLORS = {
  idle: {
    primary: 'rgba(34, 197, 94, 0.8)', // green-500
    secondary: 'rgba(74, 222, 128, 0.6)', // green-400
    textColor: 'text-green-300',
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/10',
    shadowColor: '#22c55e',
    glowIntensity: 0.5,
  },
  active: {
    primary: 'rgba(59, 130, 246, 0.8)', // blue-500
    secondary: 'rgba(96, 165, 250, 0.6)', // blue-400
    textColor: 'text-blue-300',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
    shadowColor: '#3b82f6',
    glowIntensity: 0.7,
  },
  processing: {
    primary: 'rgba(249, 115, 22, 0.8)', // orange-500
    secondary: 'rgba(251, 146, 60, 0.6)', // orange-400
    textColor: 'text-orange-300',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/10',
    shadowColor: '#f97316',
    glowIntensity: 0.9,
  },
  error: {
    primary: 'rgba(239, 68, 68, 0.8)', // red-500
    secondary: 'rgba(248, 113, 113, 0.6)', // red-400
    textColor: 'text-red-300',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10',
    shadowColor: '#ef4444',
    glowIntensity: 1.0,
  },
  success: {
    primary: 'rgba(16, 185, 129, 0.8)', // emerald-500
    secondary: 'rgba(52, 211, 153, 0.6)', // emerald-400
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
    shadowColor: '#10b981',
    glowIntensity: 0.8,
  },
  warning: {
    primary: 'rgba(245, 158, 11, 0.8)', // amber-500
    secondary: 'rgba(251, 191, 36, 0.6)', // amber-400
    textColor: 'text-amber-300',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
    shadowColor: '#f59e0b',
    glowIntensity: 0.7,
  },
};

// Theme overlay colors (subtle tints)
const THEME_TINTS = {
  phantom: {
    overlay: 'rgba(168, 85, 247, 0.15)', // purple tint
    accentColor: '#a855f7',
  },
  midnight: {
    overlay: 'rgba(34, 211, 238, 0.15)', // cyan tint
    accentColor: '#22d3ee',
  },
  shadow: {
    overlay: 'rgba(248, 113, 113, 0.15)', // red tint
    accentColor: '#f87171',
  },
  default: {
    overlay: 'rgba(100, 116, 139, 0.1)', // slate tint
    accentColor: '#64748b',
  },
};

// Size configurations
const SIZE_CONFIGS = {
  sm: {
    height: 'h-6',
    textSize: 'text-xs',
    iconSize: 'w-3 h-3',
    padding: 'px-2 py-1',
    gap: 'gap-1.5',
  },
  md: {
    height: 'h-8',
    textSize: 'text-sm',
    iconSize: 'w-4 h-4',
    padding: 'px-3 py-1.5',
    gap: 'gap-2',
  },
  lg: {
    height: 'h-10',
    textSize: 'text-base',
    iconSize: 'w-5 h-5',
    padding: 'px-4 py-2',
    gap: 'gap-2.5',
  },
};

export default function StatusChip({
  status,
  label,
  icon: Icon,
  theme = 'default',
  animated = true,
  size = 'md',
  intensity = 0.5,
  className = '',
  onClick,
}: StatusChipProps) {
  const statusColors = STATUS_COLORS[status];
  const themeTint = THEME_TINTS[theme];
  const sizeConfig = SIZE_CONFIGS[size];

  // Calculate dynamic glow intensity
  const dynamicGlowIntensity = useMemo(() => {
    if (status === 'processing' && intensity > 0) {
      return 0.6 + (intensity * 0.6);
    }
    return statusColors.glowIntensity;
  }, [status, intensity, statusColors.glowIntensity]);

  // Animation speed varies by state
  const animationSpeed = useMemo(() => {
    switch (status) {
      case 'error': return 0.3; // Fast flashing
      case 'processing': return 0.5 + (intensity * 0.5); // Intensity-dependent
      case 'active': return 1.0; // Medium pulse
      case 'idle': return 2.0; // Slow, steady
      default: return 1.5;
    }
  }, [status, intensity]);

  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`relative ${sizeConfig.height} ${sizeConfig.padding} flex items-center ${sizeConfig.gap} overflow-hidden rounded-lg border ${statusColors.borderColor} ${statusColors.bgColor} backdrop-blur-sm ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Animated background glow bars (only if animated) */}
      {animated && (
        <div className="absolute inset-0 flex items-center gap-1 opacity-20 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="h-0.5 w-4 rounded-full"
              style={{
                background: `linear-gradient(to right, ${statusColors.primary}, ${statusColors.secondary})`,
              }}
              animate={{
                opacity: status === 'idle'
                  ? 0.3
                  : [0.3, dynamicGlowIntensity, 0.3],
                scaleY: status === 'processing'
                  ? [1, 1.2 + (intensity * 0.8), 1]
                  : 1,
              }}
              transition={{
                duration: animationSpeed,
                repeat: Infinity,
                delay: i * 0.05,
                ease: status === 'error' ? 'linear' : 'easeInOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Theme overlay gradient (only if animated and theme is not default) */}
      {animated && theme !== 'default' && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${themeTint.overlay}, transparent 70%)`,
          }}
          animate={{
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Icon (if provided) */}
      {Icon && (
        <div className="relative z-10 flex-shrink-0">
          {animated ? (
            <motion.div
              animate={
                status === 'processing'
                  ? { rotate: 360 }
                  : status === 'error'
                  ? { scale: [1, 1.1, 1] }
                  : {}
              }
              transition={
                status === 'processing'
                  ? { duration: 2, repeat: Infinity, ease: 'linear' }
                  : status === 'error'
                  ? { duration: 0.3, repeat: Infinity }
                  : {}
              }
            >
              <Icon className={`${sizeConfig.iconSize} ${statusColors.textColor}`} />
            </motion.div>
          ) : (
            <Icon className={`${sizeConfig.iconSize} ${statusColors.textColor}`} />
          )}
        </div>
      )}

      {/* Label Text */}
      <AnimatePresence mode="wait">
        {label && (
          <motion.div
            key={label}
            initial={animated ? { opacity: 0, x: -10 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={animated ? { opacity: 0, x: 10 } : false}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            <div className="relative">
              {/* Text with optional neon glow */}
              {animated ? (
                <motion.span
                  className={`relative font-mono ${sizeConfig.textSize} font-semibold tracking-wider ${statusColors.textColor}`}
                  animate={{
                    textShadow: [
                      `0 0 ${8 * dynamicGlowIntensity}px ${statusColors.shadowColor}, 0 0 ${16 * dynamicGlowIntensity}px ${statusColors.primary}`,
                      `0 0 ${12 * dynamicGlowIntensity}px ${statusColors.shadowColor}, 0 0 ${24 * dynamicGlowIntensity}px ${statusColors.primary}`,
                      `0 0 ${8 * dynamicGlowIntensity}px ${statusColors.shadowColor}, 0 0 ${16 * dynamicGlowIntensity}px ${statusColors.primary}`,
                    ],
                  }}
                  transition={{
                    duration: animationSpeed,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {label}
                </motion.span>
              ) : (
                <span className={`relative font-mono ${sizeConfig.textSize} font-semibold tracking-wider ${statusColors.textColor}`}>
                  {label}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated scan line (only for processing/active states and if animated) */}
      {animated && (status === 'processing' || status === 'active') && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-0.5 opacity-60"
          style={{
            background: `linear-gradient(to bottom, transparent, ${statusColors.primary}, transparent)`,
          }}
          animate={{
            left: ['0%', '100%'],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: status === 'processing' ? 1.5 : 2.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Pulsing edge indicators for error state (only if animated) */}
      {animated && status === 'error' && (
        <>
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r-full"
            style={{ backgroundColor: statusColors.primary }}
            animate={{
              opacity: [0.8, 0.3, 0.8],
              scaleY: [1, 0.6, 1],
            }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-0.5 rounded-l-full"
            style={{ backgroundColor: statusColors.primary }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scaleY: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </>
      )}

      {/* Ambient particle effects for processing state (only if animated and intensity is high) */}
      {animated && status === 'processing' && intensity > 0.5 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(Math.floor(intensity * 3))].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 h-0.5 rounded-full"
              style={{
                backgroundColor: statusColors.secondary,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 0.6, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 0.8 + Math.random() * 0.4,
                repeat: Infinity,
                delay: Math.random() * 0.5,
              }}
            />
          ))}
        </div>
      )}
    </Component>
  );
}
