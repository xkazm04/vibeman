'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useThemeStore, type ThemeColors } from '@/stores/themeStore';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type SpinnerVariant = 'orbital' | 'pulse' | 'dots' | 'ring';

interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  className?: string;
  'data-testid'?: string;
}

const sizeConfig: Record<SpinnerSize, { container: string; ring: string; dot: string; text: string }> = {
  xs: { container: 'w-4 h-4', ring: 'w-4 h-4', dot: 'w-1 h-1', text: 'text-[10px]' },
  sm: { container: 'w-6 h-6', ring: 'w-6 h-6', dot: 'w-1.5 h-1.5', text: 'text-xs' },
  md: { container: 'w-10 h-10', ring: 'w-10 h-10', dot: 'w-2 h-2', text: 'text-sm' },
  lg: { container: 'w-14 h-14', ring: 'w-14 h-14', dot: 'w-2.5 h-2.5', text: 'text-base' },
  xl: { container: 'w-20 h-20', ring: 'w-20 h-20', dot: 'w-3 h-3', text: 'text-lg' },
};

/**
 * Orbital Spinner - Particles orbiting around a center
 */
function OrbitalSpinner({ size, colors }: { size: SpinnerSize; colors: ThemeColors }) {
  const config = sizeConfig[size];
  const particles = [0, 1, 2, 3];

  return (
    <div className={`relative ${config.container}`}>
      {/* Center glow */}
      <motion.div
        className="absolute inset-1/4 rounded-full"
        style={{ backgroundColor: colors.baseColor }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 0.3, 0.6],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Orbiting particles */}
      {particles.map((i) => (
        <motion.div
          key={i}
          className={`absolute ${config.dot} rounded-full`}
          style={{
            backgroundColor: colors.baseColor,
            top: '50%',
            left: '50%',
            marginTop: '-' + config.dot.split(' ')[0].replace('w-', '') + '/2',
            marginLeft: '-' + config.dot.split(' ')[0].replace('w-', '') + '/2',
          }}
          animate={{
            x: [0, 16, 0, -16, 0].map(v => v * (size === 'xs' ? 0.3 : size === 'sm' ? 0.5 : size === 'md' ? 1 : size === 'lg' ? 1.4 : 2)),
            y: [-16, 0, 16, 0, -16].map(v => v * (size === 'xs' ? 0.3 : size === 'sm' ? 0.5 : size === 'md' ? 1 : size === 'lg' ? 1.4 : 2)),
            opacity: [1, 0.5, 1, 0.5, 1],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.4,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Pulse Spinner - Expanding rings
 */
function PulseSpinner({ size, colors }: { size: SpinnerSize; colors: ThemeColors }) {
  const config = sizeConfig[size];

  return (
    <div className={`relative ${config.container}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: colors.baseColor }}
          initial={{ scale: 0.3, opacity: 1 }}
          animate={{
            scale: [0.3, 1.2],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeOut',
            delay: i * 0.6,
          }}
        />
      ))}
      <motion.div
        className="absolute inset-1/3 rounded-full"
        style={{ backgroundColor: colors.baseColor }}
        animate={{ scale: [1, 0.8, 1] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
    </div>
  );
}

/**
 * Dots Spinner - Bouncing dots
 */
function DotsSpinner({ size, colors }: { size: SpinnerSize; colors: ThemeColors }) {
  const config = sizeConfig[size];
  const dots = [0, 1, 2];

  return (
    <div className="flex items-center gap-1">
      {dots.map((i) => (
        <motion.div
          key={i}
          className={`${config.dot} rounded-full`}
          style={{ backgroundColor: colors.baseColor }}
          animate={{
            y: [0, -8, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Ring Spinner - Classic spinning ring with gradient
 */
function RingSpinner({ size, colors }: { size: SpinnerSize; colors: ThemeColors }) {
  const config = sizeConfig[size];

  return (
    <div className={`relative ${config.container}`}>
      <motion.div
        className={`${config.ring} rounded-full border-2 border-transparent`}
        style={{
          borderTopColor: colors.baseColor,
          borderRightColor: colors.baseColor + '60',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-2 rounded-full border border-transparent"
        style={{
          borderBottomColor: colors.baseColor + '40',
          borderLeftColor: colors.baseColor + '20',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

/**
 * Spinner - Unique animated loading indicator
 *
 * Variants:
 * - orbital: Particles orbiting around a glowing center
 * - pulse: Expanding concentric rings
 * - dots: Bouncing dots animation
 * - ring: Classic spinning ring with gradient
 */
export function Spinner({
  size = 'md',
  variant = 'orbital',
  label,
  className = '',
  'data-testid': testId = 'spinner',
}: SpinnerProps) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  const config = sizeConfig[size];

  const renderSpinner = () => {
    switch (variant) {
      case 'pulse':
        return <PulseSpinner size={size} colors={colors} />;
      case 'dots':
        return <DotsSpinner size={size} colors={colors} />;
      case 'ring':
        return <RingSpinner size={size} colors={colors} />;
      case 'orbital':
      default:
        return <OrbitalSpinner size={size} colors={colors} />;
    }
  };

  if (label) {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`} data-testid={testId}>
        {renderSpinner()}
        <span className={`${config.text} text-gray-400`}>{label}</span>
      </div>
    );
  }

  return (
    <div className={className} data-testid={testId}>
      {renderSpinner()}
    </div>
  );
}

/**
 * FullPageSpinner - Centered spinner for full page loading states
 */
export function FullPageSpinner({
  label,
  variant = 'orbital',
  'data-testid': testId,
}: {
  label?: string;
  variant?: SpinnerVariant;
  'data-testid'?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]" data-testid={testId}>
      <Spinner size="lg" variant={variant} label={label} />
    </div>
  );
}

/**
 * InlineSpinner - Small spinner for inline use (buttons, inputs)
 */
export function InlineSpinner({ className = '' }: { className?: string }) {
  return <Spinner size="xs" variant="ring" className={className} />;
}

/**
 * FeatureSpinner - Loading state for lazy-loaded features
 */
export function FeatureSpinner({
  featureName,
  variant = 'default',
  'data-testid': testId,
}: {
  featureName?: string;
  variant?: 'default' | 'sidebar' | 'cards' | 'table' | 'minimal';
  'data-testid'?: string;
}) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-[400px] ${colors.bg} rounded-xl flex items-center justify-center`}
      data-testid={testId || `feature-spinner-${variant}`}
    >
      <Spinner size="lg" variant="orbital" label={featureName ? `Loading ${featureName}...` : 'Loading...'} />
    </motion.div>
  );
}

export default Spinner;
