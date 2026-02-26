'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface ReflectorKPICardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ElementType;
  accentColor: string;
  trend?: { value: number; direction: 'up' | 'down' | 'stable' };
  delay?: number;
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
}

/**
 * Unified KPI card with cyberpunk aesthetic:
 * corner markers, grid overlay, ambient glow, bottom accent line, glowing icon container.
 *
 * `accentColor` should be a raw hex/rgb color string (e.g. '#10b981' or 'rgb(6, 182, 212)').
 */
export default function ReflectorKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor,
  trend,
  delay = 0,
  onClick,
  className = '',
  'data-testid': testId,
}: ReflectorKPICardProps) {
  const glowColor = accentColorToGlow(accentColor);
  const borderColorCss = accentColorToBorder(accentColor);

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (trend.direction === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Minus className="w-3.5 h-3.5 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    if (trend.direction === 'up') return 'text-emerald-400';
    if (trend.direction === 'down') return 'text-red-400';
    return 'text-gray-500';
  };

  const getTrendBg = () => {
    if (!trend) return 'rgba(107, 114, 128, 0.1)';
    if (trend.direction === 'up') return 'rgba(16, 185, 129, 0.1)';
    if (trend.direction === 'down') return 'rgba(239, 68, 68, 0.1)';
    return 'rgba(107, 114, 128, 0.1)';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      whileHover={onClick ? { scale: 1.02, y: -2 } : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        borderColor: borderColorCss,
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%)',
        boxShadow: `0 0 40px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
      data-testid={testId}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${accentColor} 1px, transparent 1px), linear-gradient(90deg, ${accentColor} 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute -top-1/2 -right-1/2 w-full h-full blur-3xl pointer-events-none opacity-20"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />

      {/* Corner markers */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: accentColor }} />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: accentColor }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: accentColor }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: accentColor }} />

      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className="p-2.5 rounded-xl border"
            style={{
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}40`,
              boxShadow: `0 0 20px ${glowColor}`,
            }}
          >
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          {trend && (
            <motion.div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono ${getTrendColor()}`}
              style={{ backgroundColor: getTrendBg() }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.2 }}
            >
              {getTrendIcon()}
              <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
            </motion.div>
          )}
        </div>

        <div className="space-y-1">
          <div
            className="text-4xl font-bold font-mono tracking-tight"
            style={{ color: accentColor, textShadow: `0 0 30px ${glowColor}` }}
          >
            {value}
          </div>
          <p className="text-sm font-medium text-gray-300">{title}</p>
          {subtitle && (
            <p className="text-xs font-mono text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
    </motion.div>
  );
}

/** Convert an accent color to a low-opacity glow string */
function accentColorToGlow(color: string): string {
  // If it's already rgba, adjust opacity
  if (color.startsWith('rgba')) return color;
  // Convert hex to rgba with 0.15 opacity
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  }
  return `${color}26`; // fallback: hex opacity ~15%
}

/** Convert accent color to a border-compatible CSS value with ~20% opacity */
function accentColorToBorder(color: string): string {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.2)`;
  }
  return `${color}33`;
}
