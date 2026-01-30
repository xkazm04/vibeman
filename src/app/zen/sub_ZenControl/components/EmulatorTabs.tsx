'use client';

import { motion } from 'framer-motion';
import { Package, Activity, Monitor, Ruler, Network, Server } from 'lucide-react';

// Note: 'triage' removed - triage is now done via Tinder module with remote mode
export type EmulatorTab = 'batch' | 'monitor' | 'devices' | 'responsive' | 'topology' | 'fleet';

interface EmulatorTabsProps {
  activeTab: EmulatorTab;
  onTabChange: (tab: EmulatorTab) => void;
  isConnected: boolean;
  hasSelectedDevice: boolean;
  // Badge counts
  pendingRequirements?: number;
  activeBatches?: number;
  onlineDevices?: number;
}

const tabs: { id: EmulatorTab; label: string; icon: typeof Package }[] = [
  { id: 'devices', label: 'Devices', icon: Monitor },
  { id: 'fleet', label: 'Fleet', icon: Server },
  { id: 'topology', label: 'Topology', icon: Network },
  { id: 'responsive', label: 'Responsive', icon: Ruler },
  { id: 'batch', label: 'Batch', icon: Package },
  { id: 'monitor', label: 'Monitor', icon: Activity },
];

export default function EmulatorTabs({
  activeTab,
  onTabChange,
  isConnected,
  hasSelectedDevice,
  pendingRequirements = 0,
  activeBatches = 0,
  onlineDevices = 0,
}: EmulatorTabsProps) {
  // Get badge count for a tab
  const getBadgeCount = (tabId: EmulatorTab): number | null => {
    switch (tabId) {
      case 'batch':
        return pendingRequirements > 0 ? pendingRequirements : null;
      case 'monitor':
        return activeBatches > 0 ? activeBatches : null;
      case 'devices':
        return onlineDevices > 0 ? onlineDevices : null;
      default:
        return null;
    }
  };

  // Check if tab is disabled
  const isTabDisabled = (tabId: EmulatorTab): boolean => {
    // Responsive and Devices tabs are always available
    if (tabId === 'responsive' || tabId === 'devices') return false;
    // Topology and Fleet require connection but not device selection
    if (tabId === 'topology' || tabId === 'fleet') return !isConnected;
    // Other tabs require connection and device selection
    if (!isConnected) return true;
    if (!hasSelectedDevice) return true;
    return false;
  };

  return (
    <div className="flex bg-gray-800/30 rounded-lg p-1 border border-gray-700/50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isDisabled = isTabDisabled(tab.id);
        const badgeCount = getBadgeCount(tab.id);

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
            className={`
              relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all
              ${isActive
                ? 'text-white'
                : isDisabled
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-200'
              }
            `}
          >
            {/* Active background */}
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gray-700 rounded-md"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}

            {/* Content */}
            <span className="relative flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>

              {/* Badge */}
              {badgeCount !== null && (
                <span
                  className={`
                    min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center
                    ${isActive
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-600 text-gray-300'
                    }
                  `}
                >
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
