'use client';

import { motion } from 'framer-motion';
import { Monitor, Wifi } from 'lucide-react';
import { useZenStore, ZenMode } from '../../lib/zenStore';

interface ModeToggleProps {
  onModeChange?: (mode: ZenMode) => void;
}

/**
 * Mode Toggle Component
 * Switches between Offline (monitoring) and Online (accepting tasks) modes
 */
export default function ModeToggle({ onModeChange }: ModeToggleProps) {
  const { mode, setMode, pairing } = useZenStore();

  const handleModeChange = (newMode: ZenMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
  };

  const isOnline = mode === 'online';

  return (
    <div className="flex items-center gap-3">
      {/* Label */}
      <span className="text-xs text-gray-500 uppercase tracking-wider">
        Mode
      </span>

      {/* Toggle Switch */}
      <button
        onClick={() => handleModeChange(isOnline ? 'offline' : 'online')}
        className={`
          relative w-32 h-10 rounded-full p-1 transition-colors duration-300
          ${isOnline
            ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-500/50'
            : 'bg-gray-800 border border-gray-700'
          }
        `}
        disabled={pairing.status === 'paired'}
        title={pairing.status === 'paired' ? 'Disconnect to change mode' : undefined}
      >
        {/* Sliding Indicator */}
        <motion.div
          layout
          className={`
            absolute top-1 h-8 w-14 rounded-full flex items-center justify-center
            ${isOnline
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
              : 'bg-gray-700'
            }
          `}
          animate={{ left: isOnline ? 'calc(100% - 60px)' : '4px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4 text-white" />
          ) : (
            <Monitor className="w-4 h-4 text-gray-400" />
          )}
        </motion.div>

        {/* Labels */}
        <div className="relative flex w-full h-full">
          <span
            className={`
              flex-1 flex items-center justify-center text-xs font-medium
              transition-colors duration-300
              ${!isOnline ? 'text-white' : 'text-gray-500'}
            `}
          >
            OFF
          </span>
          <span
            className={`
              flex-1 flex items-center justify-center text-xs font-medium
              transition-colors duration-300
              ${isOnline ? 'text-white' : 'text-gray-500'}
            `}
          >
            ON
          </span>
        </div>
      </button>

      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`
            w-2 h-2 rounded-full
            ${isOnline ? 'bg-cyan-400 animate-pulse' : 'bg-gray-600'}
          `}
        />
        <span className="text-xs text-gray-400">
          {isOnline ? 'Accepting tasks' : 'Local only'}
        </span>
      </div>
    </div>
  );
}
