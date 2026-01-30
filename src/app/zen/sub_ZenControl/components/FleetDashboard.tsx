'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle,
  CheckCircle,
  Send,
  Filter,
  LayoutGrid,
  List,
  TrendingUp,
  Clock,
} from 'lucide-react';
import DeviceHealthCard from './DeviceHealthCard';
import type { RemoteDevice } from '@/lib/remote/deviceTypes';
import type {
  DeviceHealthMetrics,
  HealthHistoryEntry,
  FleetCommandType,
} from '@/lib/remote/batchDispatcher';

interface FleetOverview {
  totalDevices: number;
  onlineDevices: number;
  busyDevices: number;
  offlineDevices: number;
  avgHealthScore: number;
  avgLatencyMs: number | null;
  totalActiveSessions: number;
  totalAvailableSlots: number;
  lastUpdated: string;
}

interface FleetDashboardProps {
  localDeviceId: string;
  localDeviceName: string;
  onDispatchCommand?: (deviceIds: string[], commandType: FleetCommandType) => void;
}

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'online' | 'busy' | 'offline';

export default function FleetDashboard({
  localDeviceId,
  localDeviceName,
  onDispatchCommand,
}: FleetDashboardProps) {
  const [overview, setOverview] = useState<FleetOverview | null>(null);
  const [devices, setDevices] = useState<Array<RemoteDevice & { healthMetrics?: DeviceHealthMetrics }>>([]);
  const [healthHistory, setHealthHistory] = useState<Record<string, HealthHistoryEntry[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const [isDispatchingCommand, setIsDispatchingCommand] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch fleet data
  const fetchFleetData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(
        `/api/remote/fleet?local_device_id=${localDeviceId}&include_history=true&history_limit=20`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch fleet data');
      }

      const data = await response.json();

      if (data.success) {
        setOverview(data.overview);
        setDevices(data.devices || []);
        setHealthHistory(data.healthHistory || {});
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fleet data');
    } finally {
      setIsLoading(false);
    }
  }, [localDeviceId]);

  // Initial fetch and refresh
  useEffect(() => {
    fetchFleetData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchFleetData, 10000);
    return () => clearInterval(interval);
  }, [fetchFleetData]);

  // Filter devices
  const filteredDevices = devices.filter((device) => {
    if (filterStatus === 'all') return true;
    const status = device.healthMetrics?.status ?? device.status;
    if (filterStatus === 'online') return status === 'online' || status === 'idle';
    if (filterStatus === 'busy') return status === 'busy';
    if (filterStatus === 'offline') return status === 'offline';
    return true;
  });

  // Toggle device selection
  const toggleDeviceSelection = useCallback((deviceId: string) => {
    setSelectedDeviceIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
  }, []);

  // Select all filtered devices
  const selectAllFiltered = useCallback(() => {
    setSelectedDeviceIds(new Set(filteredDevices.map((d) => d.device_id)));
  }, [filteredDevices]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedDeviceIds(new Set());
  }, []);

  // Dispatch command to selected devices
  const handleDispatchCommand = useCallback(
    async (commandType: FleetCommandType) => {
      if (selectedDeviceIds.size === 0) return;

      setIsDispatchingCommand(true);
      setDispatchResult(null);

      try {
        const response = await fetch('/api/remote/fleet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batch_command',
            device_ids: Array.from(selectedDeviceIds),
            command_type: commandType,
            source_device_id: localDeviceId,
            source_device_name: localDeviceName,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setDispatchResult({
            success: true,
            message: `Command sent to ${selectedDeviceIds.size} device(s)`,
          });
          onDispatchCommand?.(Array.from(selectedDeviceIds), commandType);
        } else {
          setDispatchResult({
            success: false,
            message: data.error || 'Failed to dispatch command',
          });
        }
      } catch (err) {
        setDispatchResult({
          success: false,
          message: err instanceof Error ? err.message : 'Dispatch failed',
        });
      } finally {
        setIsDispatchingCommand(false);
        // Clear result after 3 seconds
        setTimeout(() => setDispatchResult(null), 3000);
      }
    },
    [selectedDeviceIds, localDeviceId, localDeviceName, onDispatchCommand]
  );

  // Health check all devices
  const handleHealthCheckAll = useCallback(async () => {
    setIsDispatchingCommand(true);
    try {
      const response = await fetch('/api/remote/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'health_check_all',
          source_device_id: localDeviceId,
          source_device_name: localDeviceName,
        }),
      });

      const data = await response.json();
      setDispatchResult({
        success: data.success,
        message: data.message || (data.success ? 'Health check triggered' : 'Failed'),
      });
    } catch (err) {
      setDispatchResult({
        success: false,
        message: 'Failed to trigger health check',
      });
    } finally {
      setIsDispatchingCommand(false);
      setTimeout(() => setDispatchResult(null), 3000);
    }
  }, [localDeviceId, localDeviceName]);

  // Handle device action
  const handleDeviceAction = useCallback(
    (deviceId: string, action: 'ping' | 'healthcheck' | 'restart' | 'stop') => {
      const commandMap: Record<string, FleetCommandType> = {
        ping: 'ping',
        healthcheck: 'healthcheck',
        restart: 'restart_session',
        stop: 'batch_stop',
      };
      const commandType = commandMap[action];
      if (commandType) {
        setSelectedDeviceIds(new Set([deviceId]));
        handleDispatchCommand(commandType);
      }
    },
    [handleDispatchCommand]
  );

  if (isLoading && !overview) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-400 mb-2">{error}</p>
        <button
          onClick={fetchFleetData}
          className="text-xs text-cyan-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Devices */}
          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase">Devices</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-200">{overview.totalDevices}</span>
              <span className="text-xs text-green-400">{overview.onlineDevices} online</span>
            </div>
          </div>

          {/* Health Score */}
          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase">Health</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${
                  overview.avgHealthScore >= 80
                    ? 'text-green-400'
                    : overview.avgHealthScore >= 60
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {overview.avgHealthScore}%
              </span>
              <span className="text-xs text-gray-500">avg</span>
            </div>
          </div>

          {/* Sessions */}
          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase">Sessions</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-200">{overview.totalActiveSessions}</span>
              <span className="text-xs text-gray-500">/ {overview.totalActiveSessions + overview.totalAvailableSlots}</span>
            </div>
          </div>

          {/* Latency */}
          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase">Latency</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${
                  overview.avgLatencyMs === null
                    ? 'text-gray-500'
                    : overview.avgLatencyMs < 100
                    ? 'text-green-400'
                    : overview.avgLatencyMs < 200
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {overview.avgLatencyMs !== null ? `${overview.avgLatencyMs}ms` : '--'}
              </span>
              <span className="text-xs text-gray-500">avg</span>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* View toggle and filter */}
        <div className="flex items-center gap-2">
          {/* View mode */}
          <div className="flex bg-gray-800 rounded-lg p-0.5 border border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5 border border-gray-700">
            <Filter className="w-3.5 h-3.5 text-gray-500 ml-2" />
            {(['all', 'online', 'busy', 'offline'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2 py-1 text-xs rounded ${
                  filterStatus === status
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Selection info */}
          {selectedDeviceIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {selectedDeviceIds.size} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            </div>
          )}

          {/* Batch commands */}
          {selectedDeviceIds.size > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleDispatchCommand('healthcheck')}
                disabled={isDispatchingCommand}
                className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded text-xs text-cyan-400 disabled:opacity-50"
              >
                <Activity className="w-3 h-3" />
                Health Check
              </button>
              <button
                onClick={() => handleDispatchCommand('ping')}
                disabled={isDispatchingCommand}
                className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                Ping
              </button>
            </div>
          )}

          {/* Select all */}
          <button
            onClick={selectAllFiltered}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Select all
          </button>

          {/* Health check all */}
          <button
            onClick={handleHealthCheckAll}
            disabled={isDispatchingCommand}
            className="flex items-center gap-1 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded text-xs text-green-400 disabled:opacity-50"
          >
            <CheckCircle className="w-3 h-3" />
            Check All
          </button>

          {/* Refresh */}
          <button
            onClick={fetchFleetData}
            disabled={isLoading}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dispatch result notification */}
      <AnimatePresence>
        {dispatchResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
              dispatchResult.success
                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}
          >
            {dispatchResult.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {dispatchResult.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Device Grid/List */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'
            : 'space-y-2'
        }
      >
        {filteredDevices.map((device) => (
          <div
            key={device.device_id}
            onClick={() => toggleDeviceSelection(device.device_id)}
            className="cursor-pointer"
          >
            <DeviceHealthCard
              device={device}
              healthMetrics={device.healthMetrics}
              healthHistory={healthHistory[device.device_id]}
              isSelected={selectedDeviceIds.has(device.device_id)}
              isLocal={device.device_id === localDeviceId}
              onSelect={() => setSelectedDeviceId(
                selectedDeviceId === device.device_id ? null : device.device_id
              )}
              onAction={(action) => handleDeviceAction(device.device_id, action)}
              compact={viewMode === 'list'}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredDevices.length === 0 && (
        <div className="text-center py-12">
          <WifiOff className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {filterStatus === 'all' ? 'No devices found' : `No ${filterStatus} devices`}
          </p>
        </div>
      )}

      {/* Last updated */}
      {overview && (
        <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500">
          <Clock className="w-3 h-3" />
          <span>Updated: {new Date(overview.lastUpdated).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
