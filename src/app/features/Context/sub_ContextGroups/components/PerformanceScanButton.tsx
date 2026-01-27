/**
 * PerformanceScanButton
 *
 * Icon-only button to trigger performance optimization scan for a context group.
 * Available for all project types.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Loader2 } from 'lucide-react';
import { useGroupHealthStore } from '@/stores/groupHealthStore';

interface PerformanceScanButtonProps {
  groupId: string;
  projectId: string;
  color: string;
}

export const PerformanceScanButton: React.FC<PerformanceScanButtonProps> = ({
  groupId,
  projectId,
  color,
}) => {
  const { startScan, isScanning, getActiveScan } = useGroupHealthStore();
  const scanning = isScanning(groupId);
  const activeScan = getActiveScan(groupId);

  const handleClick = async () => {
    if (scanning) return;

    // TODO: Add scanType parameter to startScan when backend supports it
    const result = await startScan(groupId, projectId);
    if (!result.success) {
      console.error('[PerformanceScan] Failed to start:', result.error);
    }
    // Overlay is now automatically shown via ContextSection when scan starts
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
      title={scanning ? `Optimizing... ${activeScan?.progress || 0}%` : 'Performance Upgrade'}
    >
      {scanning ? (
        <Loader2
          className="w-4 h-4 animate-spin"
          style={{ color }}
        />
      ) : (
        <Zap
          className="w-4 h-4"
          style={{ color }}
        />
      )}
    </motion.button>
  );
};

export default PerformanceScanButton;
