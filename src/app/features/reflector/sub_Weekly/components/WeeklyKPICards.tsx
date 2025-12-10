'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, Clock, Zap, Sparkles } from 'lucide-react';
import { WeeklyStats } from '../lib/types';

interface WeeklyKPICardsProps {
  stats: WeeklyStats;
}

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  accentColor: string;
  glowColor: string;
  borderColor: string;
  trend?: { value: number; direction: 'up' | 'down' | 'stable' };
  delay?: number;
}

function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  accentColor, 
  glowColor, 
  borderColor,
  trend, 
  delay = 0 
}: KPICardProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl ${borderColor}`}
      style={{ 
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%)',
        boxShadow: `0 0 40px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`
      }}
    >
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${accentColor} 1px, transparent 1px), linear-gradient(90deg, ${accentColor} 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Ambient glow */}
      <div 
        className="absolute -top-1/2 -right-1/2 w-full h-full blur-3xl pointer-events-none opacity-20"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />
      
      {/* Corner markers */}
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg`} style={{ borderColor: accentColor }} />
      <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg`} style={{ borderColor: accentColor }} />
      <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg`} style={{ borderColor: accentColor }} />
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg`} style={{ borderColor: accentColor }} />
      
      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between mb-4">
          <motion.div 
            className="p-2.5 rounded-xl border"
            style={{ 
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}40`,
              boxShadow: `0 0 20px ${glowColor}`
            }}
            whileHover={{ scale: 1.05 }}
          >
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </motion.div>
          {trend && (
            <motion.div 
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono ${getTrendColor()}`}
              style={{ backgroundColor: trend.direction === 'up' ? 'rgba(16, 185, 129, 0.1)' : trend.direction === 'down' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)' }}
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
          <motion.p 
            className="text-4xl font-bold font-mono tracking-tight"
            style={{ color: accentColor, textShadow: `0 0 30px ${glowColor}` }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.1, type: 'spring', stiffness: 200 }}
          >
            {value}
          </motion.p>
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

export default function WeeklyKPICards({ stats }: WeeklyKPICardsProps) {
  const { overall, comparison } = stats;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Total Ideas"
        value={overall.total}
        subtitle={`${comparison.lastWeekTotal} LAST_WEEK`}
        icon={Zap}
        accentColor="#f59e0b"
        glowColor="rgba(245, 158, 11, 0.15)"
        borderColor="border-amber-500/20"
        trend={{ value: comparison.changePercent, direction: comparison.trend }}
        delay={0}
      />
      
      <KPICard
        title="Accepted"
        value={overall.accepted}
        subtitle={`${overall.acceptanceRate}% RATE`}
        icon={CheckCircle}
        accentColor="#10b981"
        glowColor="rgba(16, 185, 129, 0.15)"
        borderColor="border-emerald-500/20"
        delay={0.1}
      />
      
      <KPICard
        title="Implemented"
        value={overall.implemented}
        subtitle="COMPLETED"
        icon={Sparkles}
        accentColor="#06b6d4"
        glowColor="rgba(6, 182, 212, 0.15)"
        borderColor="border-cyan-500/20"
        delay={0.2}
      />
      
      <KPICard
        title="Pending"
        value={overall.pending}
        subtitle="AWAITING_REVIEW"
        icon={Clock}
        accentColor="#a855f7"
        glowColor="rgba(168, 85, 247, 0.15)"
        borderColor="border-purple-500/20"
        delay={0.3}
      />
    </div>
  );
}
