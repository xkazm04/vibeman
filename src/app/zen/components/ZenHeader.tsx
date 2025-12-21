'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Clock } from 'lucide-react';
import { useZenStore } from '../lib/zenStore';

interface ZenHeaderProps {
  embedded?: boolean;
}

export default function ZenHeader({ embedded = false }: ZenHeaderProps) {
  const { isConnected, stats } = useZenStore();
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
        <span className="text-xs text-gray-500 uppercase tracking-widest">
          Monitoring
        </span>
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-6">
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

        {/* Connection status */}
        <div className={`flex items-center gap-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
          {isConnected ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          <span className="text-xs uppercase tracking-wider">
            {isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>
    </motion.header>
  );
}
