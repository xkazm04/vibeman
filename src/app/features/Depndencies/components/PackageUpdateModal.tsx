'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { PackageUpdateGroup, Project } from '../lib/types';
import { createPackageUpdateRequirement } from '../lib/api';

interface PackageUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackages: Map<string, string>; // "libraryName-projectId" -> targetVersion
  projects: Project[];
  libraryVersions: Map<string, Map<string, string | null>>; // libraryName -> projectId -> version
}

export default function PackageUpdateModal({
  isOpen,
  onClose,
  selectedPackages,
  projects,
  libraryVersions
}: PackageUpdateModalProps) {
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Array<{ project: string; success: boolean; error?: string }>>([]);

  // Group packages by project
  const packageGroups = React.useMemo(() => {
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

  const handleGenerateRequirements = async () => {
    setGenerating(true);
    setResults([]);

    const newResults = [];

    for (const group of packageGroups) {
      try {
        const result = await createPackageUpdateRequirement(
          group.projectPath,
          group.projectName,
          group.packages
        );

        newResults.push({
          project: group.projectName,
          success: result.success,
          error: result.error
        });
      } catch (error) {
        newResults.push({
          project: group.projectName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setResults(newResults);
    setGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-gray-800 border border-yellow-700/30 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-yellow-300">Generate Package Update Requirements</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {results.length === 0 ? (
              <>
                <p className="text-gray-300 mb-4">
                  Claude Code requirement files will be generated for the following projects:
                </p>

                <div className="space-y-4">
                  {packageGroups.map((group) => (
                    <div
                      key={group.projectId}
                      className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-4"
                    >
                      <h3 className="text-yellow-300 font-semibold mb-2">{group.projectName}</h3>
                      <p className="text-xs text-gray-500 mb-3">{group.projectPath}</p>
                      <div className="space-y-2">
                        {group.packages.map((pkg, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{pkg.name}</span>
                            <span className="text-gray-500">
                              {pkg.currentVersion || 'none'} → <span className="text-green-400">{pkg.targetVersion || 'latest'}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-300">
                    <strong>Note:</strong> Each requirement file will include instructions to update packages,
                    start the server to verify, and clean up the terminal.
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">Generation Results</h3>
                {results.map((result, idx) => (
                  <div
                    key={idx}
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
                      <p className={`font-medium ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                        {result.project}
                      </p>
                      {result.error && (
                        <p className="text-sm text-gray-400 mt-1">{result.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-end gap-3">
            {results.length === 0 ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateRequirements}
                  disabled={generating}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:from-gray-700 disabled:to-gray-700 text-gray-900 font-semibold rounded-lg transition-all disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Download className="w-4 h-4" />
                      </motion.div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generate Requirements
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
