'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Smartphone,
  Laptop,
  Server,
  RefreshCw,
  Link2,
  Unlink,
  Check,
} from 'lucide-react';
import type { DbDeviceSession } from '@/lib/supabase/realtimeTypes';

interface ConnectedDevicesProps {
  devices: DbDeviceSession[];
  currentDeviceId: string | null;
  partnerId: string | null;
  partnerName: string | null;
  isPaired: boolean;
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string | null) => void;
  onRefresh: () => Promise<void>;
  onUnpair?: () => Promise<void>;
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

  if (diffSec < 60) return 'now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return lastSeen.toLocaleDateString();
}

type DeviceStatus = 'online' | 'offline' | 'paired';

function getStatusColor(status: DeviceStatus): string {
  switch (status) {
    case 'online':
      return 'bg-green-400';
    case 'paired':
      return 'bg-cyan-400';
    case 'offline':
      return 'bg-gray-500';
  }
}

export default function ConnectedDevices({
  devices,
  currentDeviceId,
  partnerId,
  partnerName,
  isPaired,
  selectedDeviceId,
  onSelectDevice,
  onRefresh,
  onUnpair,
}: ConnectedDevicesProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Separate current device, partner, and others
  const currentDevice = devices.find((d) => d.device_id === currentDeviceId);
  const pairedDevice = devices.find((d) => d.device_id === partnerId);
  const otherDevices = devices.filter(
    (d) => d.device_id !== currentDeviceId && d.device_id !== partnerId
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleDeviceClick = (deviceId: string) => {
    if (deviceId === currentDeviceId) return; // Can't select self
    onSelectDevice(selectedDeviceId === deviceId ? null : deviceId);
  };

  const renderDeviceRow = (
    device: DbDeviceSession,
    status: DeviceStatus,
    isCurrent: boolean = false,
    isPartner: boolean = false
  ) => {
    const Icon = getDeviceIcon(device.device_name);
    const isSelected = selectedDeviceId === device.device_id;
    const isSelectable = !isCurrent && status !== 'offline';

    return (
      <motion.div
        key={device.device_id}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        onClick={() => isSelectable && handleDeviceClick(device.device_id)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${
          isSelectable ? 'cursor-pointer hover:bg-gray-700/50' : ''
        } ${isSelected ? 'bg-purple-500/20 ring-1 ring-purple-500/50' : ''} ${
          isCurrent ? 'opacity-60' : ''
        }`}
      >
        {/* Status dot */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-2 h-2 rounded-full ${getStatusColor(status)} ${
              status === 'online' || status === 'paired' ? 'animate-pulse' : ''
            }`}
          />
        </div>

        {/* Device icon */}
        <Icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />

        {/* Device name */}
        <span
          className={`text-xs flex-1 truncate ${
            isSelected ? 'text-purple-300' : 'text-gray-400'
          }`}
        >
          {device.device_name}
          {isCurrent && (
            <span className="text-gray-600 ml-1">(you)</span>
          )}
        </span>

        {/* Partner badge */}
        {isPartner && (
          <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded font-medium">
            Paired
          </span>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <Check className="w-3 h-3 text-purple-400 flex-shrink-0" />
        )}

        {/* Last seen */}
        {!isCurrent && (
          <span className="text-[10px] text-gray-600 flex-shrink-0">
            {formatLastSeen(device.last_seen_at)}
          </span>
        )}
      </motion.div>
    );
  };

  const totalDevices = devices.length;
  const onlineCount = devices.filter((d) => d.is_online).length;

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-medium text-gray-300">Devices</span>
          <span className="text-[10px] text-gray-500">
            {onlineCount}/{totalDevices} online
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isPaired && onUnpair && (
            <button
              onClick={onUnpair}
              className="p-1 hover:bg-red-500/20 rounded transition-colors group"
              title="Unpair device"
            >
              <Unlink className="w-3 h-3 text-gray-500 group-hover:text-red-400" />
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 hover:bg-gray-700/50 rounded transition-colors disabled:opacity-50"
            title="Refresh devices"
          >
            <RefreshCw
              className={`w-3 h-3 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Device list */}
      <div className="p-2 space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
        {totalDevices === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500">No devices connected</p>
            <p className="text-[10px] text-gray-600 mt-1">
              Devices will appear when they connect
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {/* Current device */}
            {currentDevice &&
              renderDeviceRow(currentDevice, 'online', true, false)}

            {/* Paired device */}
            {pairedDevice &&
              renderDeviceRow(
                pairedDevice,
                pairedDevice.is_online ? 'paired' : 'offline',
                false,
                true
              )}

            {/* Other devices */}
            {otherDevices.map((device) =>
              renderDeviceRow(
                device,
                device.is_online ? 'online' : 'offline',
                false,
                false
              )
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Selection hint */}
      {totalDevices > 1 && !isPaired && (
        <div className="px-3 py-1.5 border-t border-gray-700/50 bg-gray-800/30">
          <p className="text-[10px] text-gray-600">
            {selectedDeviceId
              ? 'Device selected for project pairing'
              : 'Select a device to pair projects'}
          </p>
        </div>
      )}

      {/* Paired device offline warning */}
      {isPaired && pairedDevice && !pairedDevice.is_online && (
        <div className="px-3 py-1.5 border-t border-gray-700/50 bg-amber-500/10">
          <p className="text-[10px] text-amber-400">
            Paired device is offline
          </p>
        </div>
      )}
    </div>
  );
}
