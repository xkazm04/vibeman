'use client';

import { Monitor, Wifi, Tablet } from 'lucide-react';
import { useZenNavigation, useZenMode, type ZenMode } from '../../lib/zenNavigationStore';
import ModeToggleGroup, { type ModeOption } from '../../components/ModeToggleGroup';

interface ModeToggleProps {
  onModeChange?: (mode: ZenMode) => void;
}

const CONTROL_MODES: ModeOption<ZenMode>[] = [
  { value: 'offline', label: 'Offline', icon: Monitor, gradient: 'linear-gradient(to right, #374151, #4b5563)' },
  { value: 'online', label: 'Online', icon: Wifi, gradient: 'linear-gradient(to right, #06b6d4, #3b82f6)' },
  { value: 'emulator', label: 'Emulator', icon: Tablet, gradient: 'linear-gradient(to right, #a855f7, #7c3aed)' },
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

  return (
    <div className="flex flex-col items-center gap-2">
      <ModeToggleGroup
        modes={CONTROL_MODES}
        activeMode={mode}
        onModeChange={handleModeChange}
        size="md"
        className="relative flex bg-gray-800 rounded-lg p-1 border border-gray-700"
      />

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
