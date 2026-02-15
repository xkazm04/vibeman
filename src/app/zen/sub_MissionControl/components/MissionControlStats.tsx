/**
 * Mission Control Stats Bar
 * Cinematic stat displays for the top of the Mission Control dashboard.
 */

'use client';

import { motion } from 'framer-motion';
import { Monitor, Zap, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import { zen, zenSpacing } from '../../lib/zenTheme';

interface MissionControlStatsProps {
  totalSessions: number;
  activeSessions: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  elapsed: string;
}

interface StatItem {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  pulse?: boolean;
}

export default function MissionControlStats({
  totalSessions,
  activeSessions,
  completedTasks,
  failedTasks,
  pendingTasks,
  elapsed,
}: MissionControlStatsProps) {
  const stats: StatItem[] = [
    {
      label: 'SESSIONS',
      value: `${activeSessions}/${totalSessions}`,
      icon: <Monitor className="w-4 h-4" />,
      color: activeSessions > 0 ? 'cyan' : 'gray',
      pulse: activeSessions > 0,
    },
    {
      label: 'ACTIVE',
      value: pendingTasks,
      icon: <Zap className="w-4 h-4" />,
      color: pendingTasks > 0 ? 'amber' : 'gray',
    },
    {
      label: 'COMPLETED',
      value: completedTasks,
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'green',
    },
    {
      label: 'FAILED',
      value: failedTasks,
      icon: <XCircle className="w-4 h-4" />,
      color: failedTasks > 0 ? 'red' : 'gray',
    },
    {
      label: 'ELAPSED',
      value: elapsed,
      icon: <Clock className="w-4 h-4" />,
      color: 'gray',
    },
  ];

  const colorMap: Record<string, string> = {
    cyan: zen.accentSurface,
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    gray: 'text-gray-400 bg-gray-500/10 border-gray-700/30',
  };

  return (
    <div className={`flex items-center ${zenSpacing.gapComponent}`}>
      {/* System status indicator */}
      <div className={`flex items-center ${zenSpacing.gapInline} mr-2`}>
        <Activity className={`w-3.5 h-3.5 ${activeSessions > 0 ? 'text-green-400' : 'text-gray-400'}`} />
        <span className={`text-xs uppercase tracking-widest font-mono font-semibold ${
          activeSessions > 0 ? 'text-green-400' : 'text-gray-400'
        }`}>
          {activeSessions > 0 ? 'LIVE' : 'STANDBY'}
        </span>
      </div>

      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono ${colorMap[stat.color]}`}
        >
          {stat.icon}
          <span className="font-semibold">{stat.value}</span>
          <span className="text-xs opacity-60 uppercase">{stat.label}</span>
          {stat.pulse && (
            <span className="relative flex h-1.5 w-1.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${zen.accentDot} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${zen.accentDotDeep}`} />
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
