'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import ModeToggle from './components/ModeToggle';
import RemoteSetupPanel from './components/RemoteSetupPanel';
import EmulatorPanel from './components/EmulatorPanel';
import { useZenStore } from '../lib/zenStore';

/**
 * Zen Control Panel
 * Main container for cross-device control
 * Modes: offline, online, emulator
 */
export default function ZenControlPanel() {
  const { mode } = useZenStore();
  const [remoteConfigured, setRemoteConfigured] = useState(false);

  // Fetch remote config status from database
  const fetchRemoteStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/remote/setup/status');
      const data = await response.json();
      setRemoteConfigured(data.is_configured || false);
    } catch (err) {
      console.error('Failed to fetch remote status:', err);
      setRemoteConfigured(false);
    }
  }, []);

  // Check remote config on mount and when mode changes to online/emulator
  useEffect(() => {
    if (mode === 'online' || mode === 'emulator') {
      fetchRemoteStatus();
    }
  }, [mode, fetchRemoteStatus]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Mode Toggle - Always visible */}
      <div className="flex justify-center">
        <ModeToggle />
      </div>

      {/* Offline Mode - Show instructions */}
      {mode === 'offline' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <p className="text-sm text-gray-500">
            Switch to <span className="text-cyan-400 font-medium">Online</span> or{' '}
            <span className="text-purple-400 font-medium">Emulator</span> mode to connect with other devices
          </p>
        </motion.div>
      )}

      {/* Online Mode - Show Supabase configuration */}
      {mode === 'online' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Remote Setup Panel - Configure Supabase for multi-device sync */}
          <RemoteSetupPanel onConfigChange={fetchRemoteStatus} />

          {/* Status message when configured */}
          {remoteConfigured && (
            <div className="text-center py-4">
              <p className="text-sm text-green-400">
                Supabase connected. Switch to <span className="font-medium">Emulator</span> mode to control other devices.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Emulator Mode - Multi-device mesh control */}
      {mode === 'emulator' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <EmulatorPanel isConfigured={remoteConfigured} />
        </motion.div>
      )}
    </motion.div>
  );
}
