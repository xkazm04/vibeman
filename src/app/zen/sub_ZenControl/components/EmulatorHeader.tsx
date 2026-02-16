'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Power, PowerOff, Loader2, RefreshCw } from 'lucide-react';
import type { RemoteDevice } from '@/lib/remote/deviceTypes';
import { getStatusColor } from '../lib/deviceUtils';
import BreakpointJumperBar from './BreakpointJumperBar';

interface EmulatorHeaderProps {
  // Connection state
  isRegistered: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  localDeviceName: string;
  localDeviceId: string;

  // Device selection
  devices: RemoteDevice[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string | null) => void;

  // Actions
  onConnect: () => void;
  onDisconnect: () => void;
  onRefreshDevices: () => void;
  isLoadingDevices: boolean;
}

export default function EmulatorHeader({
  isRegistered,
  isConnecting,
  connectionError,
  localDeviceName,
  localDeviceId,
  devices,
  selectedDeviceId,
  onSelectDevice,
  onConnect,
  onDisconnect,
  onRefreshDevices,
  isLoadingDevices,
}: EmulatorHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get selected device info
  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId);
  const otherDevices = devices.filter((d) => d.device_id !== localDeviceId);

  // Status indicator color
  const statusColor = isRegistered
    ? 'bg-green-400'
    : isConnecting
    ? 'bg-amber-400 animate-pulse'
    : connectionError
    ? 'bg-red-400'
    : 'bg-gray-500';

  return (
    <div className="space-y-2">
      {/* Main Header Row */}
      <div className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
        {/* Left: Connection Status */}
        <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
        <div>
          <p className="text-sm font-medium text-gray-200">
            {isRegistered ? localDeviceName : isConnecting ? 'Connecting...' : 'Disconnected'}
          </p>
          {connectionError && !isRegistered && (
            <p className="text-[10px] text-red-400 truncate max-w-[150px]">{connectionError}</p>
          )}
        </div>

        {/* Connect/Disconnect Button */}
        <button
          onClick={isRegistered ? onDisconnect : onConnect}
          disabled={isConnecting}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all
            ${isRegistered
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
              : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
            }
            disabled:opacity-50
          `}
        >
          {isConnecting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isRegistered ? (
            <PowerOff className="w-3 h-3" />
          ) : (
            <Power className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Right: Device Selector Dropdown */}
      {isRegistered && (
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded text-sm transition-all"
          >
            {selectedDevice ? (
              <>
                <div
                  className={`w-2 h-2 rounded-full ${getStatusColor(selectedDevice.status)}`}
                />
                <span className="text-gray-200 max-w-[120px] truncate">
                  {selectedDevice.device_name}
                </span>
              </>
            ) : (
              <span className="text-gray-400">Select target</span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute right-0 top-full mt-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
              >
                {/* Header with refresh */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                  <span className="text-xs text-gray-400">
                    {otherDevices.length} device{otherDevices.length !== 1 ? 's' : ''} online
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshDevices();
                    }}
                    disabled={isLoadingDevices}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                  >
                    <RefreshCw
                      className={`w-3 h-3 text-gray-400 ${isLoadingDevices ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>

                {/* Device List */}
                <div className="max-h-48 overflow-y-auto">
                  {/* Clear selection option */}
                  {selectedDeviceId && (
                    <button
                      onClick={() => {
                        onSelectDevice(null);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-700/50 transition-colors"
                    >
                      Clear selection
                    </button>
                  )}

                  {otherDevices.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-gray-500">
                      No other devices online
                    </div>
                  ) : (
                    otherDevices.map((device) => (
                      <button
                        key={device.device_id}
                        onClick={() => {
                          onSelectDevice(device.device_id);
                          setIsDropdownOpen(false);
                        }}
                        className={`
                          w-full px-3 py-2 flex items-center gap-2 text-left transition-colors
                          ${device.device_id === selectedDeviceId
                            ? 'bg-purple-500/20'
                            : 'hover:bg-gray-700/50'
                          }
                        `}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 truncate">{device.device_name}</p>
                          <p className="text-[10px] text-gray-500">
                            {device.active_sessions}/{device.capabilities?.session_slots || 4} sessions
                          </p>
                        </div>
                        {device.device_id === selectedDeviceId && (
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Click outside to close */}
          {isDropdownOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
          )}
        </div>
      )}
      </div>

      {/* Breakpoint Jumper (standalone, no connection dependency) */}
      <BreakpointJumperBar />
    </div>
  );
}
