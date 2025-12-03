/**
 * XRayModeToggle Component
 * Toggle button to enable/disable X-Ray mode in the Architecture Explorer
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Radio, Wifi, WifiOff } from 'lucide-react';

interface XRayModeToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
  isConnected?: boolean;
  eventCount?: number;
}

export default function XRayModeToggle({
  isEnabled,
  onToggle,
  isConnected = false,
  eventCount = 0,
}: XRayModeToggleProps) {
  return (
    <motion.button
      onClick={onToggle}
      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
        isEnabled
          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
          : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:text-gray-300 hover:border-gray-600/50'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      data-testid="xray-mode-toggle"
    >
      {/* Pulse glow effect when enabled and connected */}
      {isEnabled && isConnected && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-cyan-500/10"
          animate={{
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Scanning animation when enabled */}
      {isEnabled && (
        <motion.div
          className="absolute inset-0 rounded-lg overflow-hidden"
          initial={false}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>
      )}

      <div className="relative flex items-center gap-2">
        <Radio className={`w-4 h-4 ${isEnabled ? 'text-cyan-400' : ''}`} />
        <span className="text-xs font-medium">
          {isEnabled ? 'X-Ray Active' : 'X-Ray'}
        </span>

        {/* Connection status indicator */}
        {isEnabled && (
          <motion.div
            className="flex items-center gap-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {isConnected ? (
              <Wifi className="w-3 h-3 text-green-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-400" />
            )}
            {eventCount > 0 && (
              <span className="text-[10px] text-cyan-400 font-mono">
                {eventCount > 999 ? '999+' : eventCount}
              </span>
            )}
          </motion.div>
        )}

        {/* Toggle indicator */}
        <div
          className={`relative w-8 h-4 rounded-full transition-colors ${
            isEnabled ? 'bg-cyan-500/40' : 'bg-gray-700/60'
          }`}
        >
          <motion.div
            className={`absolute top-0.5 w-3 h-3 rounded-full ${
              isEnabled ? 'bg-cyan-400' : 'bg-gray-500'
            }`}
            animate={{
              left: isEnabled ? '16px' : '2px',
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>
      </div>
    </motion.button>
  );
}
