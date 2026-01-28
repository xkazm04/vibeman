/**
 * ProductionScanButton
 *
 * Icon-only button to trigger production quality scan for a context group.
 * Checks for hardcoded URLs, exposed secrets, unhandled errors, XSS vulnerabilities,
 * missing validation, resource leaks, and other production readiness issues.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useGroupHealthStore } from '@/stores/groupHealthStore';

interface ProductionScanButtonProps {
  groupId: string;
  projectId: string;
  color: string;
}

export const ProductionScanButton: React.FC<ProductionScanButtonProps> = ({
  groupId,
  projectId,
  color,
}) => {
  const { startScan, isScanning, getActiveScan } = useGroupHealthStore();
  const scanning = isScanning(groupId);
  const activeScan = getActiveScan(groupId);

  const handleClick = async () => {
    if (scanning) return;

    const result = await startScan(groupId, projectId, 'production');
    if (!result.success) {
      console.error('[ProductionScan] Failed to start:', result.error);
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
      title={scanning ? `Checking production quality... ${activeScan?.progress || 0}%` : 'Production Quality Check'}
    >
      {scanning ? (
        <Loader2
          className="w-4 h-4 animate-spin"
          style={{ color }}
        />
      ) : (
        <ShieldCheck
          className="w-4 h-4"
          style={{ color }}
        />
      )}
    </motion.button>
  );
};

export default ProductionScanButton;
