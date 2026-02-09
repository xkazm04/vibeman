'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import EmulatorHeader from './EmulatorHeader';
import EmulatorTabs from './EmulatorTabs';
import DeviceGrid from './DeviceGrid';
import RemoteBatchPanel from './RemoteBatchPanel';
import RemoteMonitorPanel from './RemoteMonitorPanel';
import ResponsivePanel from './ResponsivePanel';
import TopologyMap from './TopologyMap';
import FleetDashboard from './FleetDashboard';
import { useDeviceDiscovery } from '../hooks/useDeviceDiscovery';
import { useSelectedDevice } from '@/stores/deviceMeshStore';
import { useEmulatorTabFromNav, useZenNavigation, canNavigate } from '../../lib/zenNavigationStore';
import type { NetworkTopology } from '@/lib/remote/topologyBuilder';
// Note: RemoteTriagePanel removed - triage now done via Tinder module

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
    refreshInterval: 15000,
  });

  const selectedDevice = useSelectedDevice();
  const activeTab = useEmulatorTabFromNav() ?? 'devices';
  const navigateTab = useZenNavigation((s) => s.navigateEmulatorTab);

  // Topology state
  const [topology, setTopology] = useState<NetworkTopology | null>(null);
  const [isLoadingTopology, setIsLoadingTopology] = useState(false);
  const [selectedTopologyNode, setSelectedTopologyNode] = useState<string | null>(null);

  // Track if we've already attempted auto-connect to prevent infinite loops
  const hasAttemptedConnect = useRef(false);

  // Fetch topology data
  const fetchTopology = useCallback(async () => {
    if (!isRegistered || !localDeviceId) return;

    setIsLoadingTopology(true);
    try {
      const response = await fetch(
        `/api/remote/mesh/topology?local_device_id=${localDeviceId}&include_improvements=true`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.topology) {
          setTopology(data.topology);
        }
      }
    } catch (error) {
      console.error('[EmulatorPanel] Topology fetch error:', error);
    } finally {
      setIsLoadingTopology(false);
    }
  }, [isRegistered, localDeviceId]);

  // Fetch topology when tab is active and registered
  useEffect(() => {
    if (activeTab === 'topology' && isRegistered) {
      fetchTopology();

      // Auto-refresh topology every 30 seconds
      const interval = setInterval(fetchTopology, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, isRegistered, fetchTopology]);

  // Auto-connect when panel is shown and configured (only once)
  useEffect(() => {
    if (isConfigured && !isRegistered && !isConnecting && !hasAttemptedConnect.current) {
      hasAttemptedConnect.current = true;
      registerDevice();
    }
  }, [isConfigured, isRegistered, isConnecting, registerDevice]);

  // Count other devices for badge
  const otherDevices = devices.filter((d) => d.device_id !== localDeviceId);

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
    <div className="space-y-3">
      {/* Compact Header with Device Selector */}
      <EmulatorHeader
        isRegistered={isRegistered}
        isConnecting={isConnecting}
        connectionError={connectionError}
        localDeviceName={localDeviceName}
        localDeviceId={localDeviceId}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={selectDevice}
        onConnect={registerDevice}
        onDisconnect={unregisterDevice}
        onRefreshDevices={refreshDevices}
        isLoadingDevices={isLoadingDevices}
      />

      {/* Tab Navigation */}
      <EmulatorTabs
        activeTab={activeTab}
        onTabChange={navigateTab}
        isConnected={isRegistered}
        hasSelectedDevice={!!selectedDeviceId}
        onlineDevices={otherDevices.length}
      />

      {/* Triage Hint - Show when connected and device selected */}
      {isRegistered && selectedDeviceId && (
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300">
          <Sparkles className="w-4 h-4" />
          <span>
            Remote triage available in <strong>Tinder</strong> module. Click the Remote toggle when triaging.
          </span>
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'responsive' && <ResponsivePanel />}

        {activeTab === 'topology' && (
          <div className="h-[400px] bg-gray-800/30 border border-gray-700 rounded-lg overflow-hidden">
            <TopologyMap
              topology={topology}
              isLoading={isLoadingTopology}
              onRefresh={fetchTopology}
              selectedNodeId={selectedTopologyNode}
              onNodeSelect={setSelectedTopologyNode}
              showImprovements={true}
            />
          </div>
        )}

        {activeTab === 'fleet' && (
          <FleetDashboard
            localDeviceId={localDeviceId}
            localDeviceName={localDeviceName}
          />
        )}

        {activeTab === 'batch' && (
          <RemoteBatchPanel
            targetDeviceId={selectedDeviceId}
            targetDeviceName={selectedDevice?.device_name}
          />
        )}

        {activeTab === 'monitor' && (
          <RemoteMonitorPanel
            targetDeviceId={selectedDeviceId}
            targetDeviceName={selectedDevice?.device_name}
          />
        )}

        {activeTab === 'devices' && (
          <DevicesTab
            isRegistered={isRegistered}
            isConnecting={isConnecting}
            connectionError={connectionError}
            devices={devices}
            localDeviceId={localDeviceId}
            selectedDeviceId={selectedDeviceId}
            isLoadingDevices={isLoadingDevices}
            onSelectDevice={selectDevice}
            onRefreshDevices={refreshDevices}
            onRetryConnect={() => {
              hasAttemptedConnect.current = false;
              registerDevice();
              hasAttemptedConnect.current = true;
            }}
          />
        )}
      </div>
    </div>
  );
}

interface DevicesTabProps {
  isRegistered: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  devices: import('@/lib/remote/deviceTypes').RemoteDevice[];
  localDeviceId: string;
  selectedDeviceId: string | null;
  isLoadingDevices: boolean;
  onSelectDevice: (deviceId: string | null) => void;
  onRefreshDevices: () => void;
  onRetryConnect: () => void;
}

function DevicesTab({
  isRegistered,
  isConnecting,
  connectionError,
  devices,
  localDeviceId,
  selectedDeviceId,
  isLoadingDevices,
  onSelectDevice,
  onRefreshDevices,
  onRetryConnect,
}: DevicesTabProps) {
  if (!isRegistered && !isConnecting) {
    return (
      <div className="text-center py-12">
        {connectionError ? (
          <div className="space-y-3">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <p className="text-sm text-red-400">{connectionError}</p>
            <button
              onClick={onRetryConnect}
              className="text-xs text-cyan-400 hover:underline"
            >
              Retry connection
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Click <span className="text-green-400 font-medium">Connect</span> in the header to join the mesh network
            </p>
          </div>
        )}
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Connecting to mesh network...</p>
      </div>
    );
  }

  return (
    <DeviceGrid
      devices={devices}
      localDeviceId={localDeviceId}
      selectedDeviceId={selectedDeviceId}
      isLoading={isLoadingDevices}
      onSelectDevice={onSelectDevice}
      onRefresh={onRefreshDevices}
    />
  );
}
