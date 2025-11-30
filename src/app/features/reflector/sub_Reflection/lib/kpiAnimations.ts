'use client';

import type { Easing } from 'framer-motion';

/**
 * KPI Card Animation Utilities
 *
 * Provides confetti and spring animation effects for KPI value transitions.
 * Respects user's reduced motion preferences.
 */

// Confetti particle configuration
export interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  velocity: { x: number; y: number };
  rotationSpeed: number;
}

// Animation configuration options
export interface KPIAnimationConfig {
  // Enable/disable animations globally
  enabled: boolean;
  // Enable confetti on threshold crossing
  confettiEnabled: boolean;
  // Threshold percentage for triggering confetti (e.g., 80 = 80%)
  confettiThreshold: number;
  // Number of confetti particles
  confettiCount: number;
  // Spring animation stiffness
  springStiffness: number;
  // Spring animation damping
  springDamping: number;
}

// Default configuration
export const defaultAnimationConfig: KPIAnimationConfig = {
  enabled: true,
  confettiEnabled: true,
  confettiThreshold: 75,
  confettiCount: 12,
  springStiffness: 300,
  springDamping: 25,
};

// Color palettes for confetti based on KPI type
export const confettiColors = {
  blue: ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8'],
  green: ['#4ADE80', '#22C55E', '#16A34A', '#15803D'],
  purple: ['#C084FC', '#A855F7', '#9333EA', '#7E22CE'],
  amber: ['#FBBF24', '#F59E0B', '#D97706', '#B45309'],
};

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Generate confetti particles for celebration effect
 */
export function generateConfettiParticles(
  count: number,
  colorPalette: string[]
): ConfettiParticle[] {
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: 50 + (Math.random() - 0.5) * 30, // Center with spread
      y: 50,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
      color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
      velocity: {
        x: (Math.random() - 0.5) * 4,
        y: -2 - Math.random() * 3, // Upward burst
      },
      rotationSpeed: (Math.random() - 0.5) * 10,
    });
  }

  return particles;
}

/**
 * Determine if value crossed a threshold
 */
export function crossedThreshold(
  oldValue: number,
  newValue: number,
  threshold: number
): boolean {
  // Crossed upward
  if (oldValue < threshold && newValue >= threshold) return true;
  // Major milestone crossing (multiples of threshold)
  const oldMilestones = Math.floor(oldValue / threshold);
  const newMilestones = Math.floor(newValue / threshold);
  return newMilestones > oldMilestones;
}

/**
 * Parse numeric value from display string (handles percentages)
 */
export function parseDisplayValue(value: string | number): number {
  if (typeof value === 'number') return value;
  const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return isNaN(numericValue) ? 0 : numericValue;
}

/**
 * Spring animation variants for Framer Motion
 */
export function getSpringTransition(config: KPIAnimationConfig) {
  return {
    type: 'spring' as const,
    stiffness: config.springStiffness,
    damping: config.springDamping,
  };
}

/**
 * Value change animation variants
 */
export const valueChangeVariants = {
  initial: { scale: 1, y: 0 },
  pulse: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.3,
      ease: 'easeOut' as Easing,
    },
  },
  bounce: {
    y: [0, -8, 0],
    transition: {
      duration: 0.4,
      ease: [0.34, 1.56, 0.64, 1] as Easing, // Custom spring-like easing
    },
  },
};

/**
 * Confetti particle animation variants
 */
export const confettiVariants = {
  initial: (particle: ConfettiParticle) => ({
    x: `${particle.x}%`,
    y: `${particle.y}%`,
    rotate: particle.rotation,
    scale: 0,
    opacity: 1,
  }),
  animate: (particle: ConfettiParticle) => ({
    x: `${particle.x + particle.velocity.x * 30}%`,
    y: `${particle.y + particle.velocity.y * 30}%`,
    rotate: particle.rotation + particle.rotationSpeed * 30,
    scale: [0, particle.scale, particle.scale * 0.8, 0],
    opacity: [1, 1, 0.8, 0],
    transition: {
      duration: 0.8,
      ease: 'easeOut' as Easing,
    },
  }),
};

/**
 * Glow pulse animation for threshold crossing
 */
export const glowPulseVariants = {
  initial: { boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)' },
  pulse: (color: string) => ({
    boxShadow: [
      `0 0 0 0 ${color}`,
      `0 0 20px 4px ${color}`,
      `0 0 0 0 ${color}`,
    ],
    transition: {
      duration: 0.6,
      ease: 'easeOut' as Easing,
    },
  }),
};

/**
 * Get glow color with opacity for different KPI types
 */
export function getGlowColor(colorKey: 'blue' | 'green' | 'purple' | 'amber'): string {
  const glowColors = {
    blue: 'rgba(59, 130, 246, 0.4)',
    green: 'rgba(34, 197, 94, 0.4)',
    purple: 'rgba(168, 85, 247, 0.4)',
    amber: 'rgba(245, 158, 11, 0.4)',
  };
  return glowColors[colorKey];
}
