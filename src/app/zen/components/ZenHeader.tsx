'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Wifi, Tablet, Clock, Rocket } from 'lucide-react';
import { useZenStore } from '../lib/zenStore';
import { useZenNavigation, useZenMode, type ZenMode } from '../lib/zenNavigationStore';
import { zen, zenSpacing } from '../lib/zenTheme';
import ModeToggleGroup, { type ModeOption } from './ModeToggleGroup';

interface ZenHeaderProps {
  embedded?: boolean;
}

const HEADER_MODES: ModeOption<ZenMode>[] = [
  { value: 'offline', label: 'Offline', icon: Monitor, gradient: 'linear-gradient(to right, #374151, #4b5563)' },
  { value: 'online', label: 'Online', icon: Wifi, gradient: zen.gradientCSS },
  { value: 'emulator', label: 'Emulator', icon: Tablet, gradient: 'linear-gradient(to right, #a855f7, #7c3aed)' },
  { value: 'mission-control', label: 'Mission', icon: Rocket, gradient: zen.gradientCSS },
];

export default function ZenHeader({ embedded = false }: ZenHeaderProps) {
  const mode = useZenMode();
  const navigate = useZenNavigation((s) => s.navigate);
  const { stats } = useZenStore();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Update clock every minute, aligned to the next minute boundary
  React.useEffect(() => {
    const scheduleNext = () => {
      const now = new Date();
      const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      return setTimeout(() => {
        setCurrentTime(new Date());
        timerRef.current = scheduleNext();
      }, msUntilNextMinute);
    };
    const timerRef = { current: scheduleNext() };
    return () => clearTimeout(timerRef.current);
  }, []);

  // Format elapsed time (minutes granularity)
  const formatElapsed = () => {
    const elapsedMs = currentTime.getTime() - stats.sessionStart.getTime();
    const totalMinutes = Math.floor(elapsedMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between ${zenSpacing.padSpacious} border-b ${zen.surfaceDividerSubtle}`}
    >
      {/* Left: Title */}
      <div className={`flex items-center ${zenSpacing.gapSection}`}>
        <h1 className="text-2xl font-light tracking-wider text-white">
          ZEN MODE
        </h1>
      </div>

      {/* Center: Mode Toggle */}
      <ModeToggleGroup
        modes={HEADER_MODES}
        activeMode={mode}
        onModeChange={navigate}
        size="sm"
      />

      {/* Right: Status indicators */}
      <div className={`flex items-center ${zenSpacing.gapSection}`}>
        {/* Session duration */}
        <div className={`flex items-center ${zenSpacing.gapInline} text-gray-400`}>
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono">{formatElapsed()}</span>
        </div>

        {/* Current time */}
        <div className="text-sm font-mono text-gray-500">
          {currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>

        {/* Mode indicator dot */}
        <div
          className={`
            w-2 h-2 rounded-full
            ${mode === 'offline' ? 'bg-gray-600' : ''}
            ${mode === 'online' ? `${zen.accentDot} animate-pulse` : ''}
            ${mode === 'emulator' ? 'bg-purple-400 animate-pulse' : ''}
            ${mode === 'mission-control' ? 'bg-blue-400 animate-pulse' : ''}
          `}
        />
      </div>
    </motion.header>
  );
}
