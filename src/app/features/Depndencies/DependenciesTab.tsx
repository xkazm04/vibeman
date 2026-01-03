'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { Network } from 'lucide-react';
import { ScanData, fetchScans, fetchScanData, ScanProvider } from './lib';
import {
  ScanSetupBar,
  DependencyColumnView,
  SecurityPipelineButton
} from './components';
import EmptyState from '@/components/DecisionPanel/EmptyState';

export default function DependenciesTab() {
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(false);

  const { projects, initializeProjects } = useProjectConfigStore();

  useEffect(() => {
    initializeProjects();
    loadLatestScan();
  }, [initializeProjects]);

  const loadLatestScan = async () => {
    try {
      const scansData = await fetchScans();

      // Auto-load the most recent scan if available
      if (scansData.length > 0) {
        loadScanData(scansData[0].id);
      }
    } catch (error) {
      // Failed to load latest scan
    }
  };

  const loadScanData = async (scanId: string) => {
    setLoading(true);

    try {
      const data = await fetchScanData(scanId);
      setScanData(data);
    } catch (error) {
      // Failed to load scan data
      setScanData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleScanComplete = async (scanId: string) => {
    await loadScanData(scanId);
  };

  return (
    <ScanProvider onScanComplete={handleScanComplete}>
      <div className="space-y-6">
        {/* Security Pipeline Button */}
        {projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SecurityPipelineButton
              projectId={projects[0].id}
              projectPath={projects[0].path}
              projectType={projects[0].type}
            />
          </motion.div>
        )}

        {/* Horizontal Scan Setup Bar */}
        <ScanSetupBar projects={projects} />

        {/* Column Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/40 backdrop-blur-sm border border-yellow-700/30 rounded-xl p-6"
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-96"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Network className="w-16 h-16 text-yellow-400 mb-4" />
                </motion.div>
                <div className="text-yellow-300 text-lg font-medium">Loading visualization...</div>
              </motion.div>
            ) : scanData && scanData.scan ? (
              <motion.div
                key="columns"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-yellow-300">Dependency Matrix</h4>
                  <div className="text-sm text-gray-400">
                    {scanData.scan.scan_name} - {new Date(scanData.scan.scan_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="bg-gray-900/60 rounded-lg border border-gray-700/30 overflow-hidden">
                  <DependencyColumnView
                    projects={scanData.projects}
                    dependencies={scanData.dependencies}
                    registryVersions={scanData.registryVersions}
                  />
                </div>
              </motion.div>
            ) : (
              <EmptyState
                key="empty"
                icon={Network}
                headline="No scan selected"
                subtext="Run a new scan or select from history to visualize dependencies"
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Custom scrollbar styles */}
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(31, 41, 55, 0.5);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(234, 179, 8, 0.3);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(234, 179, 8, 0.5);
          }
        `}</style>
      </div>
    </ScanProvider>
  );
}
