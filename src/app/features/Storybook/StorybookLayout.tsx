'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStorybookStore } from './lib/storybookStore';
import { StorybookHeader } from './components/StorybookHeader';
import { ComponentList } from './components/ComponentList';
import { ComponentDetail } from './components/ComponentDetail';
import { CoverageChart } from './components/CoverageChart';
import { Loader2 } from 'lucide-react';

export default function StorybookLayout() {
  const {
    fetchComponents,
    isLoading,
    error,
    coverage,
    matches,
    selectedComponent
  } = useStorybookStore();

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]" data-testid="storybook-loading">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Scanning components...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px]" data-testid="storybook-error">
        <div className="text-center text-red-400">
          <p>Failed to scan components</p>
          <p className="text-sm opacity-60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6" data-testid="storybook-layout">
      <StorybookHeader coverage={coverage} />

      <div className="grid grid-cols-12 gap-6 mt-6">
        {/* Coverage Chart - Top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-12"
        >
          <CoverageChart coverage={coverage} matches={matches} />
        </motion.div>

        {/* Left Panel - Storybook Components */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-5"
        >
          <ComponentList
            title="Central Storybook"
            subtitle="C:\Users\kazda\kiro\storybook"
            source="storybook"
          />
        </motion.div>

        {/* Right Panel - Vibeman Components */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-5"
        >
          <ComponentList
            title="Vibeman Components"
            subtitle="src/components/ui"
            source="vibeman"
          />
        </motion.div>

        {/* Detail Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="col-span-2"
        >
          <ComponentDetail component={selectedComponent} />
        </motion.div>
      </div>
    </div>
  );
}
