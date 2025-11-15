'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useBlueprintStore } from '../store/blueprintStore';
import ScanProgressBar from '@/app/components/ui/ScanProgressBar';

/**
 * ScanProgressBars Component
 *
 * Displays thin progress lines at the top of the Blueprint layout for all running scans.
 * Multiple scans can run concurrently, each with its own progress bar.
 */
export default function ScanProgressBars() {
  const { scans } = useBlueprintStore();

  // Get all currently running scans
  const runningScans = Object.entries(scans)
    .filter(([_, scan]) => scan.isRunning)
    .map(([id, scan]) => ({ id, ...scan }));

  if (runningScans.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none" data-testid="scan-progress-bars">
      <AnimatePresence>
        {runningScans.map((scan, index) => (
          <motion.div
            key={scan.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="relative bg-gray-900/80 backdrop-blur-sm border-b border-cyan-500/20"
            style={{ marginTop: index * 28 }}
            data-testid={`scan-progress-${scan.id}`}
          >
            {/* Use the reusable ScanProgressBar component */}
            <ScanProgressBar
              totalTokens={scan.progress > 0 ? 100 : undefined}
              processedTokens={scan.progress > 0 ? scan.progress : 0}
              state="scanning"
              label={`${scan.name} Scan`}
              height={12}
              showPercentage={scan.progress > 0}
              showTokenCounts={false}
              className="px-4"
            />

            {/* Bottom glow effect */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
