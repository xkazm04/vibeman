'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, Laptop, Server, Wifi, WifiOff } from 'lucide-react';
import type { DbDeviceSession } from '@/lib/supabase/realtimeTypes';

interface OnlineDevicesProps {
  devices: DbDeviceSession[];
  currentDeviceId: string | null;
  partnerId: string | null;
}

function getDeviceIcon(deviceName: string) {
  const name = deviceName.toLowerCase();
  if (name.includes('phone') || name.includes('mobile')) {
    return Smartphone;
  }
  if (name.includes('laptop')) {
    return Laptop;
  }
  if (name.includes('server')) {
    return Server;
  }
  return Monitor;
}

function formatLastSeen(lastSeenAt: string): string {
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return lastSeen.toLocaleDateString();
}

export default function OnlineDevices({
  devices,
  currentDeviceId,
  partnerId,
}: OnlineDevicesProps) {
  // Filter out current device and sort by online status
  const otherDevices = devices
    .filter((d) => d.device_id !== currentDeviceId)
    .sort((a, b) => {
      // Partner device first
      if (a.device_id === partnerId) return -1;
      if (b.device_id === partnerId) return 1;
      // Then by online status
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;
      // Then by last seen
      return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
    });

  if (otherDevices.length === 0) {
    return (
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-400">Nearby Devices</span>
        </div>
        <div className="text-center py-4">
          <WifiOff className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No other devices online</p>
          <p className="text-[10px] text-gray-600 mt-1">
            Open Vibeman on another device to connect
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-300">Nearby Devices</span>
        </div>
        <span className="text-xs text-gray-500">
          {otherDevices.filter((d) => d.is_online).length} online
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {otherDevices.map((device) => {
            const Icon = getDeviceIcon(device.device_name);
            const isPartner = device.device_id === partnerId;
            const isOnline = device.is_online;

            return (
              <motion.div
                key={device.device_id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`
                  flex items-center gap-3 p-2 rounded-lg transition-colors
                  ${isPartner
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-gray-900/50 border border-gray-700/30'
                  }
                `}
              >
                <div
                  className={`
                    p-2 rounded-lg
                    ${isPartner ? 'bg-green-500/20' : 'bg-gray-700/30'}
                  `}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isPartner ? 'text-green-400' : isOnline ? 'text-cyan-400' : 'text-gray-500'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium truncate ${
                        isPartner ? 'text-green-400' : 'text-gray-300'
                      }`}
                    >
                      {device.device_name}
                    </span>
                    {isPartner && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded uppercase font-medium">
                        Paired
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="capitalize">{device.role}</span>
                    <span>•</span>
                    <span>{formatLastSeen(device.last_seen_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isOnline ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <WifiOff className="w-3 h-3 text-gray-500" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
