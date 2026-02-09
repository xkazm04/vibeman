'use client';

import { motion } from 'framer-motion';
import { Monitor, Wifi, Tablet } from 'lucide-react';
import { useZenNavigation, useZenMode, type ZenMode } from '../../lib/zenNavigationStore';

interface ModeToggleProps {
  onModeChange?: (mode: ZenMode) => void;
}

const modes: { value: ZenMode; label: string; icon: typeof Monitor; color: string }[] = [
  { value: 'offline', label: 'Offline', icon: Monitor, color: 'gray' },
  { value: 'online', label: 'Online', icon: Wifi, color: 'cyan' },
  { value: 'emulator', label: 'Emulator', icon: Tablet, color: 'purple' },
];

/**
 * Mode Toggle Component
 * Switches between Offline, Online, and Emulator modes
 * - Offline: Local monitoring only
 * - Online: Configure Supabase connection
 * - Emulator: Multi-device mesh control (tablet UI)
 */
export default function ModeToggle({ onModeChange }: ModeToggleProps) {
  const mode = useZenMode();
  const navigate = useZenNavigation((s) => s.navigate);

  const handleModeChange = (newMode: ZenMode) => {
    navigate(newMode);
    onModeChange?.(newMode);
  };

  const currentModeIndex = modes.findIndex((m) => m.value === mode);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Segmented Button Group */}
      <div className="relative flex bg-gray-800 rounded-lg p-1 border border-gray-700">
        {/* Sliding Background */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-md"
          style={{
            width: `calc(${100 / modes.length}% - 4px)`,
            background:
              mode === 'offline'
                ? 'linear-gradient(to right, #374151, #4b5563)'
                : mode === 'online'
                ? 'linear-gradient(to right, #06b6d4, #3b82f6)'
                : 'linear-gradient(to right, #a855f7, #7c3aed)',
          }}
          animate={{
            left: `calc(${currentModeIndex * (100 / modes.length)}% + 4px)`,
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
              onClick={() => handleModeChange(m.value)}
              className={`
                relative z-10 flex items-center gap-2 px-4 py-2 rounded-md
                transition-colors duration-200
                ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-300'}
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Status Text */}
      <div className="flex items-center gap-2">
        <div
          className={`
            w-2 h-2 rounded-full
            ${mode === 'offline' ? 'bg-gray-600' : ''}
            ${mode === 'online' ? 'bg-cyan-400 animate-pulse' : ''}
            ${mode === 'emulator' ? 'bg-purple-400 animate-pulse' : ''}
          `}
        />
        <span className="text-xs text-gray-400">
          {mode === 'offline' && 'Local monitoring only'}
          {mode === 'online' && 'Configure remote connection'}
          {mode === 'emulator' && 'Multi-device control'}
        </span>
      </div>
    </div>
  );
}
