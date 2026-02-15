'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Monitor, Plus } from 'lucide-react';
import DeviceCard from './DeviceCard';
import type { RemoteDevice } from '@/lib/remote/deviceTypes';

interface DeviceGridProps {
  devices: RemoteDevice[];
  localDeviceId: string;
  selectedDeviceId: string | null;
  isLoading: boolean;
  onSelectDevice: (deviceId: string | null) => void;
  onRefresh: () => void;
}

export default function DeviceGrid({
  devices,
  localDeviceId,
  selectedDeviceId,
  isLoading,
  onSelectDevice,
  onRefresh,
}: DeviceGridProps) {
  // Separate local device from others
  const localDevice = devices.find((d) => d.device_id === localDeviceId);
  const otherDevices = devices.filter((d) => d.device_id !== localDeviceId);

  const onlineCount = otherDevices.filter((d) => d.status === 'online' || d.status === 'busy').length;

  // Sort other devices: online first, then by name
  const sortedDevices = otherDevices.sort((a, b) => {
    // Online devices first
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    // Then by name
    return a.device_name.localeCompare(b.device_name);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-300">Mesh Network</h3>
          <span className="text-xs text-gray-500">
            {onlineCount} device{onlineCount !== 1 ? 's' : ''} online
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
          title="Refresh devices"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* This Device */}
      {localDevice && (
        <div>
          <p className="text-[10px] text-cyan-400 uppercase tracking-wider mb-2 font-medium">
            This Device
          </p>
          <DeviceCard
            device={localDevice}
            isSelected={false}
            isLocalDevice={true}
            onSelect={() => {}}
          />
        </div>
      )}

      {/* Other Devices */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-medium">
          Remote Devices
        </p>

        {sortedDevices.length === 0 ? (
          <div className="bg-gray-800/30 border border-dashed border-gray-700 rounded-lg p-6 text-center">
            <div className="p-3 bg-gray-700/20 rounded-full w-fit mx-auto mb-3">
              <Plus className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400 mb-1">No other devices online</p>
            <p className="text-xs text-gray-500">
              Open Vibeman on another device to connect
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {sortedDevices.map((device) => (
                <motion.div
                  key={device.device_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <DeviceCard
                    device={device}
                    isSelected={device.device_id === selectedDeviceId}
                    isLocalDevice={false}
                    onSelect={() =>
                      onSelectDevice(
                        device.device_id === selectedDeviceId ? null : device.device_id
                      )
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Selection Info */}
      {selectedDeviceId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg"
        >
          <p className="text-xs text-purple-300">
            <span className="font-medium">Target selected:</span>{' '}
            {sortedDevices.find((d) => d.device_id === selectedDeviceId)?.device_name}
          </p>
          <p className="text-[10px] text-purple-400 mt-1">
            Commands will be sent to this device
          </p>
        </motion.div>
      )}
    </div>
  );
}
