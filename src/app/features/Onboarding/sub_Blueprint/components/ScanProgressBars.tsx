'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useBlueprintStore } from '../store/blueprintStore';

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
            className="relative"
            style={{ marginTop: index * 28 }}
            data-testid={`scan-progress-${scan.id}`}
          >
            {/* Background bar */}
            <div className="h-6 bg-gray-900/80 backdrop-blur-sm border-b border-cyan-500/20">
              {/* Progress fill */}
              {scan.progress > 0 ? (
                // Determinate progress bar
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-600/60 via-blue-500/60 to-cyan-600/60"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${scan.progress}%`,
                    backgroundPosition: ['0% 0%', '200% 0%'],
                  }}
                  transition={{
                    width: { duration: 0.5 },
                    backgroundPosition: {
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear',
                    },
                  }}
                  style={{
                    backgroundSize: '200% 100%',
                  }}
                />
              ) : (
                // Indeterminate progress bar (for scans that don't report progress)
                <motion.div
                  className="h-full w-full bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent"
                  animate={{
                    backgroundPosition: ['0% 0%', '200% 0%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  style={{
                    backgroundSize: '50% 100%',
                  }}
                />
              )}

              {/* Scan name and progress label */}
              <div className="absolute inset-0 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  {/* Animated scanning indicator */}
                  <motion.div
                    className="w-2 h-2 rounded-full bg-cyan-400"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.6, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />

                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    {scan.name} Scan
                  </span>
                </div>

                <span className="text-xs font-mono text-cyan-400/80">
                  {scan.progress > 0 ? `${Math.round(scan.progress)}%` : 'Scanning...'}
                </span>
              </div>
            </div>

            {/* Bottom glow effect */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
