'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import ModeToggle from './components/ModeToggle';
import SupabasePairingPanel from './components/SupabasePairingPanel';
import ConnectedDevices from './components/ConnectedDevices';
import ProjectPairing from './components/ProjectPairing';
import SupabaseIncomingTasks from './components/SupabaseIncomingTasks';
import { useZenStore } from '../lib/zenStore';
import { useSupabaseRealtime } from './hooks/useSupabaseRealtime';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { isSupabaseRealtimeConfigured } from '@/lib/supabase/realtime';

/**
 * Zen Control Panel
 * Main container for cross-device offload controls
 * Integrated with Supabase Realtime for internet-wide connectivity
 */
export default function ZenControlPanel() {
  const { mode } = useZenStore();
  const activeProject = useClientProjectStore((state) => state.activeProject);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Supabase Realtime hook - connects when mode is 'online'
  const {
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    deviceId,
    pairingStatus,
    pairingCode,
    partnerId,
    partnerName,
    generatePairingCode,
    pairWithCode,
    unpair,
    onlineDevices,
    refreshDevices,
    incomingTasks,
    claimTask,
    updateTaskStatus,
  } = useSupabaseRealtime({
    projectId: activeProject?.id || 'default',
    autoConnect: mode === 'online',
  });

  // Check if Supabase is configured (uses NEXT_PUBLIC_ variables for client-side)
  const supabaseConfigured = isSupabaseRealtimeConfigured();

  // Task handlers
  const handleClaimTask = async (taskId: string) => {
    return claimTask(taskId);
  };

  const handleStartTask = async (taskId: string) => {
    return updateTaskStatus(taskId, 'running');
  };

  const handleCompleteTask = async (taskId: string, resultSummary?: string) => {
    return updateTaskStatus(taskId, 'completed', { resultSummary });
  };

  const handleFailTask = async (taskId: string, errorMessage: string) => {
    return updateTaskStatus(taskId, 'failed', { errorMessage });
  };

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
            Switch to <span className="text-cyan-400 font-medium">Online</span> mode to connect with other devices
          </p>
        </motion.div>
      )}

      {/* Online Mode - Show Supabase controls */}
      {mode === 'online' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Supabase not configured warning */}
          {!supabaseConfigured && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-400 font-medium mb-2">
                Supabase not configured
              </p>
              <p className="text-xs text-gray-400">
                Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env file.
                Then run the migration SQL in your Supabase dashboard.
              </p>
            </div>
          )}

          {/* Supabase Pairing Panel */}
          {supabaseConfigured && (
            <>
              <SupabasePairingPanel
                isConnected={isConnected}
                isConnecting={isConnecting}
                connectionError={connectionError}
                pairingStatus={pairingStatus}
                pairingCode={pairingCode}
                partnerName={partnerName}
                onConnect={connect}
                onGenerateCode={generatePairingCode}
                onPairWithCode={pairWithCode}
                onUnpair={unpair}
              />

              {/* Connected Devices */}
              {isConnected && (
                <ConnectedDevices
                  devices={onlineDevices}
                  currentDeviceId={deviceId}
                  partnerId={partnerId}
                  partnerName={partnerName}
                  isPaired={pairingStatus === 'paired'}
                  selectedDeviceId={selectedDeviceId}
                  onSelectDevice={setSelectedDeviceId}
                  onRefresh={refreshDevices}
                  onUnpair={unpair}
                />
              )}

              {/* Project Pairing */}
              {isConnected && (
                <ProjectPairing
                  isConnected={isConnected}
                  isPaired={pairingStatus === 'paired'}
                  partnerId={partnerId}
                  partnerName={partnerName}
                  selectedDeviceId={selectedDeviceId}
                  devices={onlineDevices}
                  currentProjectId={activeProject?.id || null}
                />
              )}

              {/* Incoming Tasks */}
              {isConnected && (
                <SupabaseIncomingTasks
                  tasks={incomingTasks}
                  onClaim={handleClaimTask}
                  onStart={handleStartTask}
                  onComplete={handleCompleteTask}
                  onFail={handleFailTask}
                />
              )}
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
