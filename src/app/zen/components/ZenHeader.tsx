'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Wifi, Tablet, Clock } from 'lucide-react';
import { useZenStore, type ZenMode } from '../lib/zenStore';

interface ZenHeaderProps {
  embedded?: boolean;
}

const modes: { value: ZenMode; label: string; icon: typeof Monitor; color: string }[] = [
  { value: 'offline', label: 'Offline', icon: Monitor, color: 'gray' },
  { value: 'online', label: 'Online', icon: Wifi, color: 'cyan' },
  { value: 'emulator', label: 'Emulator', icon: Tablet, color: 'purple' },
];

export default function ZenHeader({ embedded = false }: ZenHeaderProps) {
  const { mode, setMode, stats } = useZenStore();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Update clock every second
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format elapsed time
  const formatElapsed = () => {
    const elapsed = Math.floor((currentTime.getTime() - stats.sessionStart.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const currentModeIndex = modes.findIndex((m) => m.value === mode);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-8 py-4 border-b border-gray-800/50"
    >
      {/* Left: Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-light tracking-wider text-white">
          ZEN MODE
        </h1>
      </div>

      {/* Center: Mode Toggle */}
      <div className="relative flex bg-gray-800/80 rounded-lg p-0.5 border border-gray-700/50">
        {/* Sliding Background */}
        <motion.div
          className="absolute top-0.5 bottom-0.5 rounded-md"
          style={{
            width: `calc(${100 / modes.length}% - 2px)`,
            background:
              mode === 'offline'
                ? 'linear-gradient(to right, #374151, #4b5563)'
                : mode === 'online'
                ? 'linear-gradient(to right, #06b6d4, #3b82f6)'
                : 'linear-gradient(to right, #a855f7, #7c3aed)',
          }}
          animate={{
            left: `calc(${currentModeIndex * (100 / modes.length)}% + 2px)`,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />

        {/* Mode Buttons */}
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`
                relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md
                transition-colors duration-200
                ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-300'}
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-4">
        {/* Session duration */}
        <div className="flex items-center gap-2 text-gray-400">
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
            ${mode === 'online' ? 'bg-cyan-400 animate-pulse' : ''}
            ${mode === 'emulator' ? 'bg-purple-400 animate-pulse' : ''}
          `}
        />
      </div>
    </motion.header>
  );
}
