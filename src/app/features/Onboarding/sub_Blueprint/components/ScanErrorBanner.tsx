'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { useBlueprintStore } from '../store/blueprintStore';
import type { ScanStatus } from '../store/blueprintStore';

interface ScanErrorBannerProps {
  onRetry: (scanId: string) => void;
}

/**
 * Error banner component that displays failed scans with retry functionality.
 * Isolates failures to prevent blocking the entire onboarding flow.
 */
export default function ScanErrorBanner({ onRetry }: ScanErrorBannerProps) {
  const { getFailedScans, clearScanError } = useBlueprintStore();
  const failedScans = getFailedScans();

  const handleRetry = (scanId: string) => {
    clearScanError(scanId);
    onRetry(scanId);
  };

  const handleDismiss = (scanId: string) => {
    clearScanError(scanId);
  };

  if (failedScans.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute top-4 right-4 z-50 w-96 space-y-2"
      data-testid="scan-error-banner-container"
    >
      <AnimatePresence mode="popLayout">
        {failedScans.map((scan) => (
          <motion.div
            key={scan.name}
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden"
            data-testid={`scan-error-banner-${scan.name.toLowerCase()}`}
          >
            {/* Background with gradient border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 rounded-lg" />
            <div className="absolute inset-[1px] bg-gray-900/95 backdrop-blur-sm rounded-lg" />

            {/* Content */}
            <div className="relative p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-100">
                      {scan.name} Scan Failed
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(scan.lastRun || Date.now()).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => handleDismiss(scan.name.toLowerCase())}
                  className="p-1 hover:bg-gray-800 rounded transition-colors"
                  data-testid={`dismiss-error-${scan.name.toLowerCase()}-btn`}
                  aria-label={`Dismiss ${scan.name} error`}
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Error message */}
              <div className="mb-3 pl-7">
                <p className="text-xs text-gray-300 leading-relaxed">
                  {scan.errorMessage || 'Unknown error occurred'}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pl-7">
                <button
                  onClick={() => handleRetry(scan.name.toLowerCase())}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30
                    border border-blue-500/50 rounded text-blue-100 text-xs font-medium
                    transition-all duration-200 hover:scale-105"
                  data-testid={`retry-scan-${scan.name.toLowerCase()}-btn`}
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry Scan
                </button>
              </div>
            </div>

            {/* Animated border pulse */}
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.3), transparent)',
              }}
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
