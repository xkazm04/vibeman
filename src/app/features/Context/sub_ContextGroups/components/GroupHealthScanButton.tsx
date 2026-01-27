/**
 * GroupHealthScanButton
 *
 * Icon-only button to trigger refactor scan for a context group.
 * Shows last scan timestamp on hover via title attribute.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useGroupHealthStore } from '@/stores/groupHealthStore';

interface GroupHealthScanButtonProps {
  groupId: string;
  projectId: string;
  color: string;
  lastScanAt?: Date | null;
}

export const GroupHealthScanButton: React.FC<GroupHealthScanButtonProps> = ({
  groupId,
  projectId,
  color,
  lastScanAt,
}) => {
  const { startScan, isScanning, getActiveScan } = useGroupHealthStore();
  const scanning = isScanning(groupId);
  const activeScan = getActiveScan(groupId);

  const handleClick = async () => {
    if (scanning) return;

    const result = await startScan(groupId, projectId);
    if (!result.success) {
      console.error('[HealthScan] Failed to start:', result.error);
    }
    // Overlay is now automatically shown via ContextSection when scan starts
  };

  // Format last scan time
  const formatLastScan = () => {
    if (!lastScanAt) return 'Never scanned';
    const date = new Date(lastScanAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={scanning}
      className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
      style={{
        backgroundColor: scanning ? `${color}30` : `${color}15`,
        borderColor: `${color}40`,
        borderWidth: 1,
      }}
      whileHover={{ scale: scanning ? 1 : 1.1 }}
      whileTap={{ scale: scanning ? 1 : 0.95 }}
      title={scanning ? `Refactoring... ${activeScan?.progress || 0}%` : `Refactor (${formatLastScan()})`}
    >
      {scanning ? (
        <Loader2
          className="w-4 h-4 animate-spin"
          style={{ color }}
        />
      ) : (
        <RefreshCw
          className="w-4 h-4"
          style={{ color }}
        />
      )}
    </motion.button>
  );
};

export default GroupHealthScanButton;
