'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ZenHeader from './components/ZenHeader';
import { ZenControlPanel } from './sub_ZenControl';

/**
 * Zen Mode Layout - Embedded version for main page
 * Control panel for device mesh networking and remote batch management
 */
export default function ZenLayout() {
  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white rounded-xl overflow-hidden">
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
