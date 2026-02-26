/**
 * BeautifyScanButton
 *
 * Icon-only button to trigger beautify scan for a context group.
 * Only shown for React/NextJS projects.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { useGroupHealthStore } from '@/stores/groupHealthStore';

interface BeautifyScanButtonProps {
  groupId: string;
  projectId: string;
  color: string;
}

export const BeautifyScanButton: React.FC<BeautifyScanButtonProps> = ({
  groupId,
  projectId,
  color,
}) => {
  const { startScan, isScanning, getActiveScan } = useGroupHealthStore();
  const scanning = isScanning(groupId);
  const activeScan = getActiveScan(groupId);

  const handleClick = async () => {
    if (scanning) return;

    const result = await startScan(groupId, projectId, 'beautify');
    if (!result.success) {
      console.error('[BeautifyScan] Failed to start:', result.error);
    }
    // Overlay is now automatically shown via ContextSection when scan starts
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={scanning}
      className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
      style={{
        backgroundColor: scanning ? `${color}30` : `${color}15`,
        borderColor: `${color}40`,
        borderWidth: 1,
      }}
      whileHover={{ scale: scanning ? 1 : 1.1 }}
      whileTap={{ scale: scanning ? 1 : 0.95 }}
      title={scanning ? `Beautifying... ${activeScan?.progress || 0}%` : 'Beautify UI'}
    >
      {scanning ? (
        <Loader2
          className="w-4 h-4 animate-spin"
          style={{ color }}
        />
      ) : (
        <Sparkles
          className="w-4 h-4"
          style={{ color }}
        />
      )}
    </motion.button>
  );
};

export default BeautifyScanButton;
