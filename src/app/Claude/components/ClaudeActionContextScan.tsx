'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Scan } from 'lucide-react';
import {
  startContextScan,
  pollContextScanStatus,
  calculateProgress,
} from '../lib/contextScanManager';

interface ClaudeActionContextScanProps {
  projectPath: string;
  projectId: string;
  disabled?: boolean;
  visible?: boolean;
}

export default function ClaudeActionContextScan({
  projectPath,
  projectId,
  disabled = false,
  visible = true,
}: ClaudeActionContextScanProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const pollCleanupRef = useRef<(() => void) | null>(null);

  // Progress update effect
  useEffect(() => {
    if (!isScanning || !startTime) return;

    const progressInterval = setInterval(() => {
      const calculatedProgress = calculateProgress(startTime);
      setProgress(calculatedProgress);
    }, 1000); // Update progress every second

    return () => clearInterval(progressInterval);
  }, [isScanning, startTime]);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollCleanupRef.current) {
        pollCleanupRef.current();
      }
    };
  }, []);

  const handleContextScan = async () => {
    console.log('[ContextScan] 🎯 Button clicked');

    // Prevent multiple task creations
    if (!projectId) {
      console.warn('[ContextScan] ⚠️ No active project - aborting');
      return;
    }

    if (isScanning) {
      console.warn('[ContextScan] ⚠️ Already scanning - preventing duplicate task creation');
      return;
    }

    // Start scan
    const scanStartTime = Date.now();
    setIsScanning(true);
    setStartTime(scanStartTime);
    setProgress(0);

    const result = await startContextScan(projectPath, projectId, {
      onStart: () => {
        console.log('[ContextScan] ▶️ Scan started');
      },
      onComplete: () => {
        setIsScanning(false);
        setTaskId(null);
        setStartTime(null);
        setProgress(100);

        // Reset progress after 2 seconds
        setTimeout(() => setProgress(0), 2000);
      },
      onError: (error) => {
        console.error('[ContextScan] ❌ Error:', error);
        setIsScanning(false);
        setTaskId(null);
        setStartTime(null);
        setProgress(0);
      },
    });

    if (!result.success) {
      return; // Error already handled in callback
    }

    // Start polling
    setTaskId(result.taskId!);
    const cleanup = pollContextScanStatus(result.taskId!, {
      onComplete: () => {
        setIsScanning(false);
        setTaskId(null);
        setStartTime(null);
        setProgress(100);

        // Reset progress after 2 seconds
        setTimeout(() => setProgress(0), 2000);
      },
      onError: (error) => {
        console.error('[ContextScan] ❌ Error:', error);
        setIsScanning(false);
        setTaskId(null);
        setStartTime(null);
        setProgress(0);
      },
    });

    pollCleanupRef.current = cleanup;
  };

  if (!visible) return null;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleContextScan}
        disabled={isScanning || disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          isScanning || disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-lg'
        }`}
        title="Scan codebase and generate/update contexts"
      >
        {isScanning ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Scanning...</span>
          </>
        ) : (
          <>
            <Scan className="w-3 h-3" />
            <span>Context Scan</span>
          </>
        )}
      </motion.button>

      {/* Golden Progress Bar - Shows when context scan is running */}
      {isScanning && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gray-700/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 rounded-full shadow-lg shadow-amber-500/50"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}
    </>
  );
}
