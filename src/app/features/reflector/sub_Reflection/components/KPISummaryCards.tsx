'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FileText, CheckCircle, TrendingUp, Target } from 'lucide-react';
import { ReflectionStats } from '../lib/types';
import {
  KPIAnimationConfig,
  defaultAnimationConfig,
  confettiColors,
  generateConfettiParticles,
  crossedThreshold,
  parseDisplayValue,
  getSpringTransition,
  valueChangeVariants,
  confettiVariants,
  glowPulseVariants,
  getGlowColor,
  ConfettiParticle,
} from '../lib/kpiAnimations';

interface KPISummaryCardsProps {
  stats: ReflectionStats;
  animationConfig?: Partial<KPIAnimationConfig>;
}

interface KPICardData {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  borderColor: string;
  bgGradient: string;
  description: string;
  colorKey: 'blue' | 'green' | 'purple' | 'amber';
}

interface AnimatedValueProps {
  value: string | number;
  colorClass: string;
  colorKey: 'blue' | 'green' | 'purple' | 'amber';
  config: KPIAnimationConfig;
  reducedMotion: boolean;
}

/**
 * Animated value display with spring transition and pulse effects
 */
function AnimatedValue({ value, colorClass, colorKey, config, reducedMotion }: AnimatedValueProps) {
  const prevValueRef = useRef<number>(parseDisplayValue(value));
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);

  const currentNumeric = parseDisplayValue(value);

  useEffect(() => {
    if (reducedMotion || !config.enabled) return;

    const prevValue = prevValueRef.current;

    // Check for value change
    if (prevValue !== currentNumeric) {
      setIsAnimating(true);

      // Check for threshold crossing (confetti trigger)
      if (
        config.confettiEnabled &&
        crossedThreshold(prevValue, currentNumeric, config.confettiThreshold)
      ) {
        const particles = generateConfettiParticles(
          config.confettiCount,
          confettiColors[colorKey]
        );
        setConfettiParticles(particles);
        setShowConfetti(true);

        // Clear confetti after animation
        setTimeout(() => setShowConfetti(false), 1000);
      }

      // Reset animation state
      setTimeout(() => setIsAnimating(false), 400);
    }

    prevValueRef.current = currentNumeric;
  }, [currentNumeric, config, colorKey, reducedMotion]);

  // For reduced motion, just show the value without animation
  if (reducedMotion || !config.enabled) {
    return (
      <div className={`text-3xl font-bold ${colorClass} font-mono`} data-testid="kpi-value">
        {value}
      </div>
    );
  }

  return (
    <div className="relative" data-testid="kpi-value-animated">
      {/* Confetti particles */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 overflow-visible pointer-events-none">
            {confettiParticles.map((particle) => (
              <motion.div
                key={particle.id}
                custom={particle}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0 }}
                variants={confettiVariants}
                className="absolute w-2 h-2 rounded-sm"
                style={{
                  backgroundColor: particle.color,
                  left: 0,
                  top: 0,
                }}
                data-testid="kpi-confetti-particle"
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Animated value */}
      <motion.div
        className={`text-3xl font-bold ${colorClass} font-mono`}
        animate={isAnimating ? 'bounce' : 'initial'}
        variants={valueChangeVariants}
        transition={getSpringTransition(config)}
        data-testid="kpi-value"
      >
        {value}
      </motion.div>
    </div>
  );
}

/**
 * Individual KPI Card with animations
 */
interface AnimatedKPICardProps {
  kpi: KPICardData;
  index: number;
  config: KPIAnimationConfig;
  reducedMotion: boolean;
}

function AnimatedKPICard({ kpi, index, config, reducedMotion }: AnimatedKPICardProps) {
  const Icon = kpi.icon;
  const prevValueRef = useRef<number>(parseDisplayValue(kpi.value));
  const [showGlow, setShowGlow] = useState(false);

  const currentNumeric = parseDisplayValue(kpi.value);

  useEffect(() => {
    if (reducedMotion || !config.enabled) return;

    const prevValue = prevValueRef.current;

    // Check for significant value increase (>10% relative change or threshold crossing)
    if (prevValue > 0) {
      const percentChange = ((currentNumeric - prevValue) / prevValue) * 100;
      if (percentChange > 10 || crossedThreshold(prevValue, currentNumeric, config.confettiThreshold)) {
        setShowGlow(true);
        setTimeout(() => setShowGlow(false), 600);
      }
    }

    prevValueRef.current = currentNumeric;
  }, [currentNumeric, config, reducedMotion]);

  // Determine animation properties based on reduced motion preference
  const animationProps = reducedMotion
    ? {}
    : {
        initial: { scale: 0.9, opacity: 0, y: 20 },
        animate: { scale: 1, opacity: 1, y: 0 },
        transition: { delay: index * 0.05, duration: 0.3 },
        whileHover: { scale: 1.02, y: -2 },
      };

  return (
    <motion.div
      key={kpi.label}
      {...animationProps}
      className={`relative bg-gradient-to-br ${kpi.bgGradient} border ${kpi.borderColor} rounded-lg p-4 backdrop-blur-sm overflow-hidden group`}
      data-testid={`kpi-card-${kpi.colorKey}`}
    >
      {/* Glow pulse overlay for threshold crossing */}
      <AnimatePresence>
        {showGlow && !reducedMotion && config.enabled && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            initial="initial"
            animate="pulse"
            exit="initial"
            variants={glowPulseVariants}
            custom={getGlowColor(kpi.colorKey)}
            data-testid="kpi-glow-pulse"
          />
        )}
      </AnimatePresence>

      {/* Background decoration */}
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 ${kpi.color} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`}
      />

      {/* Content */}
      <div className="relative">
        {/* Icon and Label */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`p-2 bg-gray-900/60 rounded-lg border ${kpi.borderColor} flex-shrink-0`}
          >
            <Icon className={`w-4 h-4 ${kpi.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-300 truncate">
              {kpi.label}
            </h3>
            <p className="text-xs text-gray-500 truncate">{kpi.description}</p>
          </div>
        </div>

        {/* Animated Value Display */}
        <AnimatedValue
          value={kpi.value}
          colorClass={kpi.color}
          colorKey={kpi.colorKey}
          config={config}
          reducedMotion={reducedMotion}
        />
      </div>
    </motion.div>
  );
}

export default function KPISummaryCards({
  stats,
  animationConfig = {},
}: KPISummaryCardsProps) {
  // Check for reduced motion preference
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;

  // Merge config with defaults
  const config: KPIAnimationConfig = useMemo(
    () => ({
      ...defaultAnimationConfig,
      ...animationConfig,
    }),
    [animationConfig]
  );

  // Calculate average impact across all scan types
  const calculateAverageImpact = useCallback((): number => {
    if (stats.scanTypes.length === 0) return 0;

    // Assuming impact is based on acceptance ratio
    const totalImpact = stats.scanTypes.reduce(
      (sum, scan) => sum + scan.acceptanceRatio,
      0
    );
    return Math.round(totalImpact / stats.scanTypes.length);
  }, [stats.scanTypes]);

  const kpiCards: KPICardData[] = useMemo(
    () => [
      {
        label: 'Total Reflections',
        value: stats.overall.total,
        icon: FileText,
        color: 'text-blue-400',
        borderColor: 'border-blue-500/40',
        bgGradient: 'from-blue-500/5 to-blue-600/2',
        description: 'All ideas generated',
        colorKey: 'blue' as const,
      },
      {
        label: 'Acceptance Rate',
        value: `${stats.overall.acceptanceRatio}%`,
        icon: CheckCircle,
        color: 'text-green-400',
        borderColor: 'border-green-500/40',
        bgGradient: 'from-green-500/5 to-green-600/2',
        description: 'Accepted & implemented',
        colorKey: 'green' as const,
      },
      {
        label: 'Average Impact',
        value: `${calculateAverageImpact()}%`,
        icon: TrendingUp,
        color: 'text-purple-400',
        borderColor: 'border-purple-500/40',
        bgGradient: 'from-purple-500/5 to-purple-600/2',
        description: 'Mean specialist performance',
        colorKey: 'purple' as const,
      },
      {
        label: 'Active Specialists',
        value: stats.scanTypes.length,
        icon: Target,
        color: 'text-amber-400',
        borderColor: 'border-amber-500/40',
        bgGradient: 'from-amber-500/5 to-amber-600/2',
        description: 'Scan types with ideas',
        colorKey: 'amber' as const,
      },
    ],
    [stats.overall, stats.scanTypes, calculateAverageImpact]
  );

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      data-testid="kpi-summary-cards"
    >
      {kpiCards.map((kpi, index) => (
        <AnimatedKPICard
          key={kpi.label}
          kpi={kpi}
          index={index}
          config={config}
          reducedMotion={reducedMotion}
        />
      ))}
    </div>
  );
}
