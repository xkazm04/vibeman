'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Target, Trophy, AlertTriangle, Users } from 'lucide-react';
import { WeeklySpecialistStats } from '../lib/types';
import { getScanTypeConfig } from '@/app/features/Ideas/lib/scanTypes';

interface SpecialistBreakdownProps {
  specialists: WeeklySpecialistStats[];
  topPerformers: Array<{ scanType: string; acceptanceRate: number }>;
  needsAttention: Array<{ scanType: string; reason: string; acceptanceRate: number }>;
}

function SpecialistRow({ spec, index }: { spec: WeeklySpecialistStats; index: number }) {
  const config = getScanTypeConfig(spec.scanType);
  const emoji = config?.emoji || '🔧';
  const label = config?.label || spec.scanType;

  const getTrendIcon = () => {
    if (spec.trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (spec.trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Minus className="w-3.5 h-3.5 text-gray-600" />;
  };

  const getAcceptanceStyle = (rate: number) => {
    if (rate >= 70) return { color: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' };
    if (rate >= 40) return { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' };
    return { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' };
  };

  const style = getAcceptanceStyle(spec.acceptanceRate);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ scale: 1.01, x: 4 }}
      className="relative flex items-center gap-4 p-4 rounded-xl bg-gray-900/60 border border-gray-700/30 hover:border-gray-600/50 transition-all cursor-default group"
    >
      {/* Left accent */}
      <div 
        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
        style={{ backgroundColor: style.color, boxShadow: `0 0 10px ${style.glow}` }}
      />
      
      {/* Emoji with glow */}
      <div className="relative">
        <div 
          className="text-2xl transition-transform group-hover:scale-110"
          style={{ filter: `drop-shadow(0 0 8px ${style.glow})` }}
        >
          {emoji}
        </div>
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-200 truncate group-hover:text-white transition-colors">
          {label}
        </h4>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 font-mono">
          <span className="text-gray-400">{spec.total} ideas</span>
          <span className="text-gray-600">|</span>
          <span className="text-emerald-400/80">{spec.accepted} ✓</span>
          <span className="text-red-400/80">{spec.rejected} ✗</span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="text-right">
        <div 
          className="text-xl font-mono font-bold"
          style={{ color: style.color, textShadow: `0 0 15px ${style.glow}` }}
        >
          {spec.acceptanceRate}%
        </div>
        <div className="flex items-center gap-1.5 justify-end text-xs mt-0.5">
          {getTrendIcon()}
          <span className={`font-mono ${spec.changeFromLastWeek >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {spec.changeFromLastWeek > 0 ? '+' : ''}{spec.changeFromLastWeek}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function SpecialistBreakdown({ specialists, topPerformers, needsAttention }: SpecialistBreakdownProps) {
  const activeSpecialists = specialists.filter(s => s.total > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="relative bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-gray-900/80 border border-violet-500/20 rounded-2xl p-6 overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.05)]"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-violet-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-fuchsia-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-200">Specialist Performance</h3>
            <p className="text-xs font-mono text-gray-500 mt-0.5">{activeSpecialists.length} ACTIVE_THIS_WEEK</p>
          </div>
        </div>
        <Target className="w-5 h-5 text-violet-400/50" />
      </div>

      {/* Top Performers & Attention Needed */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {topPerformers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" />
              <span className="text-sm font-semibold text-emerald-300">Top Performers</span>
            </div>
            <div className="space-y-2">
              {topPerformers.map((p, i) => {
                const config = getScanTypeConfig(p.scanType as any);
                return (
                  <motion.div 
                    key={p.scanType}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config?.emoji || '🎯'}</span>
                      <span className="text-xs text-gray-300 font-medium">{config?.label || p.scanType}</span>
                    </div>
                    <span 
                      className="text-sm font-mono font-bold text-emerald-400"
                      style={{ textShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}
                    >
                      {p.acceptanceRate}%
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {needsAttention.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
            className="p-4 rounded-xl bg-red-950/30 border border-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
              <span className="text-sm font-semibold text-red-300">Needs Attention</span>
            </div>
            <div className="space-y-2">
              {needsAttention.slice(0, 3).map((p, i) => {
                const config = getScanTypeConfig(p.scanType as any);
                return (
                  <motion.div 
                    key={p.scanType}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config?.emoji || '⚠️'}</span>
                      <span className="text-xs text-gray-300 font-medium">{config?.label || p.scanType}</span>
                    </div>
                    <span 
                      className="text-sm font-mono font-bold text-red-400"
                      style={{ textShadow: '0 0 10px rgba(239, 68, 68, 0.4)' }}
                    >
                      {p.acceptanceRate}%
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
        
        {/* Empty state placeholders */}
        {topPerformers.length === 0 && (
          <div className="p-4 rounded-xl bg-gray-800/20 border border-gray-700/30 flex items-center justify-center">
            <span className="text-xs font-mono text-gray-600">NO_TOP_PERFORMERS</span>
          </div>
        )}
        {needsAttention.length === 0 && (
          <div className="p-4 rounded-xl bg-gray-800/20 border border-gray-700/30 flex items-center justify-center">
            <span className="text-xs font-mono text-gray-600">ALL_PERFORMING_WELL</span>
          </div>
        )}
      </div>

      {/* Specialist List */}
      <div className="relative z-10 space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {activeSpecialists.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm font-mono text-gray-600">NO_SPECIALIST_ACTIVITY</p>
            <p className="text-xs text-gray-700 mt-1">No ideas generated this week</p>
          </div>
        ) : (
          activeSpecialists.map((spec, index) => (
            <SpecialistRow key={spec.scanType} spec={spec} index={index} />
          ))
        )}
      </div>
    </motion.div>
  );
}
