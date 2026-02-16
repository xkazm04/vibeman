'use client';

import { motion } from 'framer-motion';
import { Monitor, Tablet, Wifi, WifiOff, Play, Loader2 } from 'lucide-react';
import type { RemoteDevice } from '@/lib/remote/deviceTypes';
import { getStatusColor, getStatusText } from '../lib/deviceUtils';

interface DeviceCardProps {
  device: RemoteDevice;
  isSelected: boolean;
  isLocalDevice: boolean;
  onSelect: () => void;
}

function getDeviceIcon(deviceType: string) {
  return deviceType === 'emulator' ? Tablet : Monitor;
}


function formatLastSeen(lastHeartbeat: string): string {
  const last = new Date(lastHeartbeat);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return last.toLocaleDateString();
}

export default function DeviceCard({
  device,
  isSelected,
  isLocalDevice,
  onSelect,
}: DeviceCardProps) {
  const Icon = getDeviceIcon(device.device_type);
  const sessionSlots = device.capabilities?.session_slots || 4;
  const activeSessions = device.active_sessions || 0;

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full p-4 rounded-lg border text-left transition-all
        ${isSelected
          ? 'bg-purple-500/20 border-purple-500/50 shadow-lg shadow-purple-500/10'
          : isLocalDevice
          ? 'bg-cyan-500/10 border-cyan-500/30'
          : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`
              p-2 rounded-lg
              ${isSelected ? 'bg-purple-500/20' : isLocalDevice ? 'bg-cyan-500/20' : 'bg-gray-700/30'}
            `}
          >
            <Icon
              className={`w-5 h-5 ${
                isSelected ? 'text-purple-400' : isLocalDevice ? 'text-cyan-400' : 'text-gray-400'
              }`}
            />
          </div>
          <div>
            <h3
              className={`text-sm font-medium ${
                isSelected ? 'text-purple-300' : isLocalDevice ? 'text-cyan-300' : 'text-gray-200'
              }`}
            >
              {device.device_name}
            </h3>
            {device.hostname && (
              <p className="text-[10px] text-gray-500 truncate max-w-[120px]">
                {device.hostname}
              </p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`} />
          <span className="text-[10px] text-gray-400">{getStatusText(device.status)}</span>
        </div>
      </div>

      {/* Session Slots */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500">Sessions</span>
          <span className="text-[10px] text-gray-400">
            {activeSessions}/{sessionSlots}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: sessionSlots }).map((_, i) => (
            <div
              key={i}
              className={`
                h-1.5 flex-1 rounded-full
                ${i < activeSessions ? 'bg-cyan-500' : 'bg-gray-700'}
              `}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-gray-500">
          {isLocalDevice ? 'This device' : formatLastSeen(device.last_heartbeat_at)}
        </span>
        {isSelected && !isLocalDevice && (
          <span className="text-purple-400 font-medium">Selected</span>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 rounded-lg border-2 border-purple-500/50 pointer-events-none" />
      )}
    </motion.button>
  );
}
