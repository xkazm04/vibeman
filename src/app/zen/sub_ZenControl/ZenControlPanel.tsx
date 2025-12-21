'use client';

import { motion } from 'framer-motion';
import ModeToggle from './components/ModeToggle';
import PairingPanel from './components/PairingPanel';
import IncomingTasks from './components/IncomingTasks';
import RemoteStatus from './components/RemoteStatus';
import { useZenStore } from '../lib/zenStore';

/**
 * Zen Control Panel
 * Main container for cross-device offload controls
 */
export default function ZenControlPanel() {
  const { mode, pairing } = useZenStore();

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

      {/* Pairing Panel - Visible in online mode or when actively pairing */}
      <PairingPanel />

      {/* Remote Status - For active device (offline mode) when paired */}
      <RemoteStatus />

      {/* Incoming Tasks - For passive device (online mode) when paired */}
      <IncomingTasks />

      {/* Status Message */}
      {pairing.status === 'unpaired' && mode === 'offline' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4"
        >
          <p className="text-sm text-gray-500">
            Switch to <span className="text-cyan-400">Online</span> mode to accept tasks from other devices
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
