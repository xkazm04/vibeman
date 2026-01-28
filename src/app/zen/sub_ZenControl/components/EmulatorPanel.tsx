'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Power, PowerOff, Send, AlertCircle } from 'lucide-react';
import DeviceGrid from './DeviceGrid';
import { useDeviceDiscovery } from '../hooks/useDeviceDiscovery';
import { useSelectedDevice } from '@/stores/emulatorStore';

interface EmulatorPanelProps {
  isConfigured: boolean;
}

export default function EmulatorPanel({ isConfigured }: EmulatorPanelProps) {
  const {
    localDeviceId,
    localDeviceName,
    isRegistered,
    isConnecting,
    devices,
    isLoadingDevices,
    selectedDeviceId,
    connectionError,
    registerDevice,
    unregisterDevice,
    refreshDevices,
    selectDevice,
  } = useDeviceDiscovery({
    autoRegister: false,
    autoRefresh: true,
    refreshInterval: 15000, // Faster refresh in emulator mode
  });

  const selectedDevice = useSelectedDevice();
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [commandResult, setCommandResult] = useState<{ success: boolean; message: string } | null>(
    null
  );

  // Track if we've already attempted auto-connect to prevent infinite loops
  const hasAttemptedConnect = useRef(false);

  // Auto-connect when panel is shown and configured (only once)
  useEffect(() => {
    if (isConfigured && !isRegistered && !isConnecting && !hasAttemptedConnect.current) {
      hasAttemptedConnect.current = true;
      registerDevice();
    }
  }, [isConfigured, isRegistered, isConnecting, registerDevice]);

  // Reset the attempt flag when user manually disconnects
  useEffect(() => {
    if (!isRegistered && !isConnecting && hasAttemptedConnect.current) {
      // Allow re-attempt after user manually connects/disconnects
    }
  }, [isRegistered, isConnecting]);

  // Send a test command to selected device
  const sendTestCommand = async () => {
    if (!selectedDeviceId) return;

    setIsSendingCommand(true);
    setCommandResult(null);

    try {
      const response = await fetch('/api/remote/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 'test',
          command_type: 'healthcheck',
          payload: {
            message: `Ping from ${localDeviceName}`,
            timestamp: new Date().toISOString(),
          },
          target_device_id: selectedDeviceId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCommandResult({ success: true, message: 'Command sent successfully!' });
      } else {
        setCommandResult({ success: false, message: data.error || 'Failed to send command' });
      }
    } catch (err) {
      setCommandResult({ success: false, message: 'Network error' });
    } finally {
      setIsSendingCommand(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
        <p className="text-sm text-amber-400 mb-2">Supabase not configured</p>
        <p className="text-xs text-gray-500">
          Please switch to <span className="text-cyan-400">Online</span> mode and configure
          Supabase first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isRegistered ? 'bg-green-400' : isConnecting ? 'bg-amber-400 animate-pulse' : 'bg-gray-500'
            }`}
          />
          <div>
            <p className="text-sm font-medium text-gray-200">
              {isRegistered ? localDeviceName : isConnecting ? 'Connecting...' : 'Disconnected'}
            </p>
            <p className="text-[10px] text-gray-500">
              {isRegistered
                ? `Device ID: ${localDeviceId.slice(0, 8)}...`
                : 'Not connected to mesh'}
            </p>
          </div>
        </div>

        <button
          onClick={isRegistered ? unregisterDevice : registerDevice}
          disabled={isConnecting}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all
            ${isRegistered
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
              : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
            }
            disabled:opacity-50
          `}
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : isRegistered ? (
            <>
              <PowerOff className="w-3 h-3" />
              <span>Disconnect</span>
            </>
          ) : (
            <>
              <Power className="w-3 h-3" />
              <span>Connect</span>
            </>
          )}
        </button>
      </div>

      {/* Device Grid - Only show when connected */}
      {isRegistered && (
        <DeviceGrid
          devices={devices}
          localDeviceId={localDeviceId}
          selectedDeviceId={selectedDeviceId}
          isLoading={isLoadingDevices}
          onSelectDevice={selectDevice}
          onRefresh={refreshDevices}
        />
      )}

      {/* Command Panel - Only show when device is selected */}
      {isRegistered && selectedDevice && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gray-800/50 border border-purple-500/30 rounded-lg"
        >
          <h4 className="text-sm font-medium text-purple-300 mb-3">
            Send Command to {selectedDevice.device_name}
          </h4>

          <div className="space-y-3">
            {/* Test Command Button */}
            <button
              onClick={sendTestCommand}
              disabled={isSendingCommand}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded text-sm font-medium text-purple-300 disabled:opacity-50 transition-all"
            >
              {isSendingCommand ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Test Ping</span>
                </>
              )}
            </button>

            {/* Command Result */}
            {commandResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-2 rounded text-xs ${
                  commandResult.success
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}
              >
                {commandResult.message}
              </motion.div>
            )}

            {/* Future: Batch Composer, Direction Triage will go here */}
            <p className="text-[10px] text-gray-500 text-center">
              More commands coming soon: Batch execution, direction triage
            </p>
          </div>
        </motion.div>
      )}

      {/* Not connected message */}
      {!isRegistered && !isConnecting && (
        <div className="text-center py-6">
          {connectionError ? (
            <div className="space-y-2">
              <p className="text-sm text-red-400">{connectionError}</p>
              <button
                onClick={() => {
                  hasAttemptedConnect.current = false;
                  registerDevice();
                  hasAttemptedConnect.current = true;
                }}
                className="text-xs text-cyan-400 hover:underline"
              >
                Retry connection
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Click <span className="text-green-400">Connect</span> to join the mesh network
            </p>
          )}
        </div>
      )}
    </div>
  );
}
