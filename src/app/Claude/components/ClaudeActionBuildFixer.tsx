'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Wrench } from 'lucide-react';

interface ClaudeActionBuildFixerProps {
  projectPath: string;
  projectId: string;
  disabled?: boolean;
  onScanComplete?: () => void;
}

interface BuildFixerResult {
  success: boolean;
  totalErrors: number;
  totalWarnings: number;
  requirementFiles: string[];
  buildCommand: string;
  executionTime: number;
  error?: string;
}

export default function ClaudeActionBuildFixer({
  projectPath,
  projectId,
  disabled = false,
  onScanComplete,
}: ClaudeActionBuildFixerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const handleBuildFix = async () => {
    console.log('[BuildFixer] Button clicked');

    // Clear previous result
    setScanResult(null);

    if (!projectId) {
      console.warn('[BuildFixer] No active project - aborting');
      return;
    }

    if (isScanning) {
      console.warn('[BuildFixer] Already scanning - preventing duplicate scan');
      return;
    }

    setIsScanning(true);

    try {
      console.log('[BuildFixer] Starting build scan...');

      const response = await fetch('/api/build-fixer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: BuildFixerResult = await response.json();

      setIsScanning(false);

      if (result.success) {
        console.log('[BuildFixer] Scan completed:', result);

        if (result.totalErrors === 0) {
          setScanResult({
            message: 'No build errors found! All checks passed.',
            type: 'success',
          });
        } else {
          setScanResult({
            message: `Found ${result.totalErrors} error${result.totalErrors > 1 ? 's' : ''}, created ${result.requirementFiles.length} requirement file${result.requirementFiles.length !== 1 ? 's' : ''}`,
            type: 'info',
          });
          // Notify parent to refresh requirements list
          onScanComplete?.();
        }
      } else {
        console.error('[BuildFixer] Scan failed:', result.error);
        setScanResult({
          message: `Scan failed: ${result.error || 'Unknown error'}`,
          type: 'error',
        });
      }
    } catch (error) {
      console.error('[BuildFixer] Error:', error);
      setIsScanning(false);
      setScanResult({
        message: `Failed to run build scan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
      });
    }

    // Auto-hide result message after 5 seconds
    setTimeout(() => {
      setScanResult(null);
    }, 5000);
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleBuildFix}
        disabled={isScanning || disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          isScanning || disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg'
        }`}
        title="Run build, catch errors, and create fix requirement files"
      >
        {isScanning ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Scanning...</span>
          </>
        ) : (
          <>
            <Wrench className="w-3 h-3" />
            <span>Build Fixer</span>
          </>
        )}
      </motion.button>

      {/* Result Message */}
      {scanResult && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`absolute top-full mt-1 right-0 text-sm whitespace-nowrap px-2 py-1 rounded z-10 ${
            scanResult.type === 'success'
              ? 'text-green-400 bg-green-500/10'
              : scanResult.type === 'error'
              ? 'text-red-400 bg-red-500/10'
              : 'text-blue-400 bg-blue-500/10'
          }`}
        >
          {scanResult.message}
        </motion.div>
      )}
    </div>
  );
}
