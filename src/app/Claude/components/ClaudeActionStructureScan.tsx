'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Layers } from 'lucide-react';
import { startStructureScan } from '../lib/structureScanManager';

interface ClaudeActionStructureScanProps {
  projectPath: string;
  projectType?: string;
  projectId: string;
  disabled?: boolean;
  onScanComplete?: () => void;
}

export default function ClaudeActionStructureScan({
  projectPath,
  projectType,
  projectId,
  disabled = false,
  onScanComplete,
}: ClaudeActionStructureScanProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleStructureScan = async () => {
    console.log('[StructureScan] 🎯 Button clicked');

    // Clear previous result
    setScanResult(null);

    if (!projectId) {
      console.warn('[StructureScan] ⚠️ No active project - aborting');
      return;
    }

    if (isScanning) {
      console.warn('[StructureScan] ⚠️ Already scanning - preventing duplicate scan');
      return;
    }

    if (!projectType) {
      console.error('[StructureScan] ❌ Project type not set');
      setScanResult({
        message: 'Project type is not set. Please configure project type first.',
        type: 'error',
      });
      return;
    }

    setIsScanning(true);

    const result = await startStructureScan(projectPath, projectType, projectId);

    setIsScanning(false);

    if (result.success) {
      console.log('[StructureScan] ✅ Scan completed:', result);

      if (result.violations === 0) {
        setScanResult({
          message: 'No violations found! Project follows best practices.',
          type: 'success',
        });
      } else {
        setScanResult({
          message: `Found ${result.violations} violation${result.violations > 1 ? 's' : ''}, created ${result.requirementFiles?.length || 0} requirement file${result.requirementFiles?.length !== 1 ? 's' : ''}`,
          type: 'error',
        });
        // Notify parent to refresh requirements list
        onScanComplete?.();
      }
    } else {
      console.error('[StructureScan] ❌ Scan failed:', result.error);
      setScanResult({
        message: `Scan failed: ${result.error}`,
        type: 'error',
      });
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleStructureScan}
        disabled={isScanning || disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          isScanning || disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg'
        }`}
        title="Scan project structure and generate refactoring requirements"
      >
        {isScanning ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Scanning...</span>
          </>
        ) : (
          <>
            <Layers className="w-3 h-3" />
            <span>Structure Scan</span>
          </>
        )}
      </motion.button>

      {/* Structure Scan Result Message */}
      {scanResult && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`absolute top-full mt-1 right-0 text-xs whitespace-nowrap px-2 py-1 rounded z-10 ${
            scanResult.type === 'success'
              ? 'text-green-400 bg-green-500/10'
              : 'text-red-400 bg-red-500/10'
          }`}
        >
          {scanResult.message}
        </motion.div>
      )}
    </div>
  );
}
