'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpCircle, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { GradientButton } from '@/components/ui';
import { PackageUpdateGroup, Project } from '../lib/types';
import { upgradePackagesWithProgress, PackageUpgrade } from '../lib/directUpgrade';

interface BatchUpdateModalContentProps {
  onClose: () => void;
  selectedPackages: Map<string, string>; // "libraryName|||projectId" -> targetVersion
  projects: Project[];
  libraryVersions: Map<string, Map<string, string | null>>; // libraryName -> projectId -> version
  onComplete?: () => void;
}

export default function BatchUpdateModalContent({
  onClose,
  selectedPackages,
  projects,
  libraryVersions,
  onComplete
}: BatchUpdateModalContentProps) {
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState({ projectName: '', message: '', percent: 0 });
  const [results, setResults] = useState<Array<{ project: string; success: boolean; packagesUpdated?: number; error?: string }>>([]);

  // Group packages by project
  const packageGroups = useMemo(() => {
    const groups = new Map<string, PackageUpdateGroup>();

    selectedPackages.forEach((targetVersion, key) => {
      const [libraryName, projectId] = key.split('|||');
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      if (!groups.has(projectId)) {
        groups.set(projectId, {
          projectId,
          projectName: project.name,
          projectPath: project.path,
          packages: []
        });
      }

      const currentVersion = libraryVersions.get(libraryName)?.get(projectId) || null;

      groups.get(projectId)!.packages.push({
        name: libraryName,
        currentVersion,
        targetVersion
      });
    });

    return Array.from(groups.values());
  }, [selectedPackages, projects, libraryVersions]);

  const handleBatchUpdate = async () => {
    setUpdating(true);
    setResults([]);

    const newResults: typeof results = [];

    // Use direct upgrade for each project
    for (const group of packageGroups) {
      setProgress({
        projectName: group.projectName,
        message: 'Starting upgrade...',
        percent: 0
      });

      const packages: PackageUpgrade[] = group.packages.map(pkg => ({
        name: pkg.name,
        currentVersion: pkg.currentVersion || '',
        targetVersion: pkg.targetVersion || 'latest',
        isDev: false // We don't have this info from libraryVersions, will be detected server-side
      }));

      try {
        const result = await upgradePackagesWithProgress(
          group.projectPath,
          packages,
          (message, percent) => {
            setProgress({ projectName: group.projectName, message, percent });
          }
        );

        newResults.push({
          project: group.projectName,
          success: result.success,
          packagesUpdated: result.updatedPackages?.length,
          error: result.error
        });
      } catch (error) {
        newResults.push({
          project: group.projectName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      setResults([...newResults]);
    }

    setUpdating(false);
    onComplete?.();
  };

  const totalPackages = useMemo(() => {
    return packageGroups.reduce((sum, group) => sum + group.packages.length, 0);
  }, [packageGroups]);

  return (
    <div className="space-y-4">
      {results.length === 0 ? (
        <>
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <p className="text-sm text-cyan-300">
              <strong>Direct Upgrade:</strong> This will directly modify package.json and run npm install for all selected packages across {packageGroups.length} project{packageGroups.length !== 1 ? 's' : ''}.
            </p>
          </div>

          {/* Progress indicator when updating */}
          {updating && (
            <div className="p-4 bg-gray-800/40 border border-gray-700/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300 font-medium">{progress.projectName}</span>
                <span className="text-sm text-cyan-400">{progress.message}</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {packageGroups.map((group) => (
              <div
                key={group.projectId}
                className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-yellow-300" />
                  <h3 className="text-yellow-300 font-semibold">{group.projectName}</h3>
                  <span className="text-xs text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded">
                    {group.packages.length} package{group.packages.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3 font-mono">{group.projectPath}</p>
                <div className="space-y-2">
                  {group.packages.map((pkg, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-gray-800/40 p-2 rounded">
                      <span className="text-gray-300 font-medium">{pkg.name}</span>
                      <span className="text-gray-500 font-mono text-xs">
                        {pkg.currentVersion || 'none'} → <span className="text-green-400">{pkg.targetVersion || 'latest'}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
            <span className="text-sm text-gray-400">Total packages to update:</span>
            <span className="text-lg font-semibold text-yellow-300">{totalPackages}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <GradientButton
              onClick={handleBatchUpdate}
              disabled={updating}
              loading={updating}
              colorScheme="cyan"
              icon={ArrowUpCircle}
              iconPosition="left"
              size="lg"
              data-testid="batch-upgrade-btn"
            >
              {updating ? 'Upgrading...' : 'Upgrade Packages'}
            </GradientButton>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Upgrade Results</h3>
            {results.map((result, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center gap-3 p-4 rounded-lg border ${
                  result.success
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                      {result.project}
                    </p>
                    {result.success && result.packagesUpdated !== undefined && (
                      <span className="text-sm text-cyan-400">
                        {result.packagesUpdated} package{result.packagesUpdated !== 1 ? 's' : ''} updated
                      </span>
                    )}
                  </div>
                  {result.error && (
                    <p className="text-sm text-gray-400 mt-1">{result.error}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-800/40 border border-gray-700/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Success Rate:</span>
              <span className="text-green-400 font-semibold">
                {results.filter(r => r.success).length} / {results.length}
              </span>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex items-center justify-end pt-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
              data-testid="close-results-btn"
            >
              Close
            </button>
          </div>
        </>
      )}

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
  );
}
