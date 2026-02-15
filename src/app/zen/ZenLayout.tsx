'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ZenHeader from './components/ZenHeader';
import { ZenControlPanel } from './sub_ZenControl';
import { useZenMode } from './lib/zenNavigationStore';
import { MissionControl } from './sub_MissionControl';
import { zen } from './lib/zenTheme';

/**
 * Zen Mode Layout - Embedded version for main page
 * Control panel for device mesh networking and remote batch management.
 * Includes Mission Control cinematic visualization mode.
 */
export default function ZenLayout() {
  const mode = useZenMode();

  // Mission Control gets full-width rendering without the standard container
  if (mode === 'mission-control') {
    return (
      <div className={`min-h-[calc(100vh-120px)] ${zen.bgSolid} text-white rounded-xl overflow-hidden`}>
        <ZenHeader embedded />
        <MissionControl />
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-120px)] ${zen.bgGradient} text-white rounded-xl overflow-hidden`}>
      {/* Header */}
      <ZenHeader embedded />

      {/* Main Content */}
      <main className="container mx-auto px-8 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ZenControlPanel />
        </motion.div>
      </main>
    </div>
  );
}
