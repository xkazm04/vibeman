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
import ReflectorKPICard from '../../components/ReflectorKPICard';

export type KPIFilterType = 'all' | 'pending' | 'accepted' | 'implemented';

interface KPISummaryCardsProps {
  stats: ReflectionStats;
  animationConfig?: Partial<KPIAnimationConfig>;
  onFilterClick?: (filterType: KPIFilterType) => void;
}

interface KPICardData {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  description: string;
  colorKey: 'blue' | 'green' | 'purple' | 'amber';
  filterType: KPIFilterType;
}

// Accent color hex values matching the Tailwind color palette
const ACCENT_COLORS = {
  blue: '#60a5fa',
  green: '#4ade80',
  purple: '#c084fc',
  amber: '#fbbf24',
} as const;

interface AnimatedValueProps {
  value: string | number;
  accentColor: string;
  colorKey: 'blue' | 'green' | 'purple' | 'amber';
  config: KPIAnimationConfig;
  reducedMotion: boolean;
}

/**
 * Animated value display with spring transition and pulse effects
 */
function AnimatedValue({ value, accentColor, colorKey, config, reducedMotion }: AnimatedValueProps) {
  const prevValueRef = useRef<number>(parseDisplayValue(value));
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);

  const currentNumeric = parseDisplayValue(value);

  useEffect(() => {
    if (reducedMotion || !config.enabled) return;

    const prevValue = prevValueRef.current;

    if (prevValue !== currentNumeric) {
      setIsAnimating(true);

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
        setTimeout(() => setShowConfetti(false), 1000);
      }

      setTimeout(() => setIsAnimating(false), 400);
    }

    prevValueRef.current = currentNumeric;
  }, [currentNumeric, config, colorKey, reducedMotion]);

  if (reducedMotion || !config.enabled) {
    return (
      <div
        className="text-4xl font-bold font-mono tracking-tight"
        style={{ color: accentColor }}
        data-testid="kpi-value"
      >
        {value}
      </div>
    );
  }

  return (
    <div className="relative" data-testid="kpi-value-animated">
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

      <motion.div
        className="text-4xl font-bold font-mono tracking-tight"
        style={{ color: accentColor }}
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
 * Individual KPI Card wrapper preserving glow-pulse animation on threshold crossing
 */
interface AnimatedKPICardWrapperProps {
  kpi: KPICardData;
  index: number;
  config: KPIAnimationConfig;
  reducedMotion: boolean;
  onClick?: () => void;
}

function AnimatedKPICardWrapper({ kpi, index, config, reducedMotion, onClick }: AnimatedKPICardWrapperProps) {
  const prevValueRef = useRef<number>(parseDisplayValue(kpi.value));
  const [showGlow, setShowGlow] = useState(false);

  const currentNumeric = parseDisplayValue(kpi.value);

  useEffect(() => {
    if (reducedMotion || !config.enabled) return;

    const prevValue = prevValueRef.current;

    if (prevValue > 0) {
      const percentChange = ((currentNumeric - prevValue) / prevValue) * 100;
      if (percentChange > 10 || crossedThreshold(prevValue, currentNumeric, config.confettiThreshold)) {
        setShowGlow(true);
        setTimeout(() => setShowGlow(false), 600);
      }
    }

    prevValueRef.current = currentNumeric;
  }, [currentNumeric, config, reducedMotion]);

  return (
    <div className="relative">
      {/* Glow pulse overlay for threshold crossing */}
      <AnimatePresence>
        {showGlow && !reducedMotion && config.enabled && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none z-20"
            initial="initial"
            animate="pulse"
            exit="initial"
            variants={glowPulseVariants}
            custom={getGlowColor(kpi.colorKey)}
            data-testid="kpi-glow-pulse"
          />
        )}
      </AnimatePresence>

      <ReflectorKPICard
        title={kpi.label}
        value={
          <AnimatedValue
            value={kpi.value}
            accentColor={kpi.accentColor}
            colorKey={kpi.colorKey}
            config={config}
            reducedMotion={reducedMotion}
          />
        }
        subtitle={kpi.description}
        icon={kpi.icon}
        accentColor={kpi.accentColor}
        delay={index * 0.05}
        onClick={onClick}
        data-testid={`kpi-card-${kpi.colorKey}`}
      />
    </div>
  );
}

export default function KPISummaryCards({
  stats,
  animationConfig = {},
  onFilterClick,
}: KPISummaryCardsProps) {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;

  const config: KPIAnimationConfig = useMemo(
    () => ({
      ...defaultAnimationConfig,
      ...animationConfig,
    }),
    [animationConfig]
  );

  const calculateAverageImpact = useCallback((): number => {
    if (stats.scanTypes.length === 0) return 0;
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
        accentColor: ACCENT_COLORS.blue,
        description: 'All ideas generated',
        colorKey: 'blue' as const,
        filterType: 'all' as const,
      },
      {
        label: 'Acceptance Rate',
        value: `${stats.overall.acceptanceRatio}%`,
        icon: CheckCircle,
        accentColor: ACCENT_COLORS.green,
        description: 'Accepted & implemented',
        colorKey: 'green' as const,
        filterType: 'accepted' as const,
      },
      {
        label: 'Average Impact',
        value: `${calculateAverageImpact()}%`,
        icon: TrendingUp,
        accentColor: ACCENT_COLORS.purple,
        description: 'Mean specialist performance',
        colorKey: 'purple' as const,
        filterType: 'implemented' as const,
      },
      {
        label: 'Active Specialists',
        value: stats.scanTypes.length,
        icon: Target,
        accentColor: ACCENT_COLORS.amber,
        description: 'Scan types with ideas',
        colorKey: 'amber' as const,
        filterType: 'pending' as const,
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
        <AnimatedKPICardWrapper
          key={kpi.label}
          kpi={kpi}
          index={index}
          config={config}
          reducedMotion={reducedMotion}
          onClick={onFilterClick ? () => onFilterClick(kpi.filterType) : undefined}
        />
      ))}
    </div>
  );
}
