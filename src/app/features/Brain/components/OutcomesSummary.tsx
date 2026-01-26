/**
 * Outcomes Summary Panel
 * Shows recent direction implementation outcomes and statistics
 * Styled to match Reflector KPI cards
 */

'use client';

import { motion } from 'framer-motion';
import { Target, CheckCircle, XCircle, RotateCcw, Clock, TrendingUp } from 'lucide-react';
import { useBrainStore } from '@/stores/brainStore';

interface Props {
  isLoading: boolean;
}

interface KPICardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  accentColor: string;
  glowColor: string;
  borderColor: string;
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
  delay = 0
}: KPICardProps) {
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
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: accentColor }} />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: accentColor }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: accentColor }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: accentColor }} />

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

export default function OutcomesSummary({ isLoading }: Props) {
  const { outcomeStats, recentOutcomes } = useBrainStore();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-800/50 p-5 animate-pulse"
            style={{ background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%)' }}
          >
            <div className="h-10 w-10 bg-zinc-800 rounded-xl mb-4" />
            <div className="h-8 bg-zinc-800 rounded w-1/2 mb-2" />
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const successRate = outcomeStats.total > 0
    ? Math.round((outcomeStats.successful / outcomeStats.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Tracked"
          value={outcomeStats.total}
          subtitle="IMPLEMENTATIONS"
          icon={Target}
          accentColor="#f59e0b"
          glowColor="rgba(245, 158, 11, 0.15)"
          borderColor="border-amber-500/20"
          delay={0}
        />

        <KPICard
          title="Successful"
          value={outcomeStats.successful}
          subtitle={`${successRate}% RATE`}
          icon={CheckCircle}
          accentColor="#10b981"
          glowColor="rgba(16, 185, 129, 0.15)"
          borderColor="border-emerald-500/20"
          delay={0.1}
        />

        <KPICard
          title="Failed"
          value={outcomeStats.failed}
          subtitle="NEEDS_REVIEW"
          icon={XCircle}
          accentColor="#ef4444"
          glowColor="rgba(239, 68, 68, 0.15)"
          borderColor="border-red-500/20"
          delay={0.2}
        />

        <KPICard
          title="Reverted"
          value={outcomeStats.reverted}
          subtitle="ROLLED_BACK"
          icon={RotateCcw}
          accentColor="#f97316"
          glowColor="rgba(249, 115, 22, 0.15)"
          borderColor="border-orange-500/20"
          delay={0.3}
        />

        <KPICard
          title="Pending"
          value={outcomeStats.pending}
          subtitle="AWAITING_OUTCOME"
          icon={Clock}
          accentColor="#a855f7"
          glowColor="rgba(168, 85, 247, 0.15)"
          borderColor="border-purple-500/20"
          delay={0.4}
        />
      </div>

      {/* Success Rate Bar + Recent Outcomes */}
      {outcomeStats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative overflow-hidden rounded-xl border border-zinc-800/50 p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.7) 0%, rgba(3, 7, 18, 0.8) 100%)'
          }}
        >
          <div className="flex items-center gap-4">
            {/* Success Rate */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-zinc-300">Success Rate</span>
                </div>
                <span
                  className="text-lg font-bold font-mono"
                  style={{
                    color: successRate >= 80 ? '#10b981' : successRate >= 50 ? '#f59e0b' : '#ef4444',
                    textShadow: successRate >= 80 ? '0 0 20px rgba(16, 185, 129, 0.4)' : undefined
                  }}
                >
                  {successRate}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${successRate}%` }}
                  transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    successRate >= 80
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : successRate >= 50
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : 'bg-gradient-to-r from-red-500 to-red-400'
                  }`}
                  style={{
                    boxShadow: successRate >= 80
                      ? '0 0 20px rgba(16, 185, 129, 0.5)'
                      : successRate >= 50
                      ? '0 0 20px rgba(245, 158, 11, 0.5)'
                      : '0 0 20px rgba(239, 68, 68, 0.5)'
                  }}
                />
              </div>
            </div>

            {/* Recent Outcomes */}
            {recentOutcomes.length > 0 && (
              <div className="flex items-center gap-1 pl-4 border-l border-zinc-700/50">
                <span className="text-xs text-zinc-500 mr-2">Recent:</span>
                {recentOutcomes.slice(0, 5).map((outcome, i) => (
                  <div
                    key={outcome.id}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: outcome.execution_success
                        ? 'rgba(16, 185, 129, 0.2)'
                        : outcome.was_reverted
                        ? 'rgba(249, 115, 22, 0.2)'
                        : 'rgba(239, 68, 68, 0.2)',
                      border: `1px solid ${outcome.execution_success
                        ? 'rgba(16, 185, 129, 0.4)'
                        : outcome.was_reverted
                        ? 'rgba(249, 115, 22, 0.4)'
                        : 'rgba(239, 68, 68, 0.4)'}`
                    }}
                    title={outcome.execution_success ? 'Success' : outcome.was_reverted ? 'Reverted' : 'Failed'}
                  >
                    {outcome.execution_success ? (
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    ) : outcome.was_reverted ? (
                      <RotateCcw className="w-3 h-3 text-orange-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {outcomeStats.total === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-4"
        >
          <p className="text-zinc-500 text-sm">
            No implementation outcomes tracked yet. Outcomes will appear here after directions are executed.
          </p>
        </motion.div>
      )}
    </div>
  );
}
