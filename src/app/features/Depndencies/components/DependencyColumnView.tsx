'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Package, Download } from 'lucide-react';
import { Project, ProjectDependency, LibraryRow, getLatestVersion, getVersionColor, getCellBackground, isPackageOutdated } from '../lib';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import PackageUpdateModalContent from './PackageUpdateModalContent';

interface DependencyColumnViewProps {
  projects: Project[];
  dependencies: Record<string, ProjectDependency[]>;
  registryVersions?: Record<string, string | null>;
}

export default function DependencyColumnView({
  projects,
  dependencies,
  registryVersions = {}
}: DependencyColumnViewProps) {
  const [selectedPackages, setSelectedPackages] = useState<Map<string, string>>(new Map()); // "libraryName|||projectId" -> targetVersion
  const { showModal, hideModal } = useGlobalModal();

  // Process and organize dependencies into rows
  const libraryRows = useMemo(() => {
    const libraryMap = new Map<string, LibraryRow>();

    // Collect all dependencies from all projects
    Object.entries(dependencies).forEach(([projectId, deps]) => {
      deps.forEach((dep) => {
        if (!libraryMap.has(dep.dependency_name)) {
          libraryMap.set(dep.dependency_name, {
            name: dep.dependency_name,
            type: dep.dependency_type,
            projectVersions: {},
            isShared: false,
            projectCount: 0,
            latestVersion: null,
            registryVersion: registryVersions?.[dep.dependency_name] || null
          });
        }

        const lib = libraryMap.get(dep.dependency_name)!;
        lib.projectVersions[projectId] = dep.dependency_version;
        lib.projectCount++;
      });
    });

    // Mark shared dependencies and find latest versions
    libraryMap.forEach((lib) => {
      lib.isShared = lib.projectCount > 1;

      // Find latest version among scanned projects (for comparison)
      if (lib.isShared) {
        const versions = Object.values(lib.projectVersions).filter(Boolean) as string[];
        lib.latestVersion = getLatestVersion(versions);
      }
    });

    // Convert to array and sort
    const rows = Array.from(libraryMap.values());

    // Sort: shared dependencies first (by project count desc), then unique dependencies
    rows.sort((a, b) => {
      if (a.isShared && !b.isShared) return -1;
      if (!a.isShared && b.isShared) return 1;
      if (a.isShared && b.isShared) {
        return b.projectCount - a.projectCount;
      }
      return a.name.localeCompare(b.name);
    });

    return rows;
  }, [dependencies, registryVersions]);

  // Create a library versions map for the modal
  const libraryVersionsMap = useMemo(() => {
    const map = new Map<string, Map<string, string | null>>();
    libraryRows.forEach(lib => {
      map.set(lib.name, new Map(Object.entries(lib.projectVersions)));
    });
    return map;
  }, [libraryRows]);

  const togglePackageSelection = (libraryName: string, projectId: string, targetVersion: string | null) => {
    const key = `${libraryName}|||${projectId}`;
    setSelectedPackages(prev => {
      const newMap = new Map(prev);
      if (newMap.has(key)) {
        newMap.delete(key);
      } else {
        newMap.set(key, targetVersion || 'latest');
      }
      return newMap;
    });
  };

  const isPackageSelected = (libraryName: string, projectId: string): boolean => {
    const key = `${libraryName}|||${projectId}`;
    return selectedPackages.has(key);
  };

  const handleOpenUpdateModal = () => {
    if (selectedPackages.size > 0) {
      showModal(
        {
          title: 'Generate Package Update Requirements',
          icon: Download,
          iconColor: 'text-yellow-400',
          iconBgColor: 'bg-yellow-500/20',
          maxWidth: 'max-w-2xl',
          maxHeight: 'max-h-[90vh]'
        },
        <PackageUpdateModalContent
          onClose={hideModal}
          selectedPackages={selectedPackages}
          projects={projects}
          libraryVersions={libraryVersionsMap}
        />
      );
    }
  };

  const handleClearSelection = () => {
    setSelectedPackages(new Map());
  };

  return (
    <>
      <div className="w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-max">
          {/* Action Bar */}
          {selectedPackages.size > 0 && (
            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-between">
              <span className="text-sm text-yellow-300 font-medium">
                {selectedPackages.size} package{selectedPackages.size !== 1 ? 's' : ''} selected for update
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 text-sm text-gray-300 hover:text-gray-100 border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleOpenUpdateModal}
                  className="px-3 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Generate Requirements
                </button>
              </div>
            </div>
          )}

          {/* Header Row */}
          <div className="flex items-stretch border-b border-gray-700/50 bg-gray-800/60 sticky top-0 z-10">
            {/* Library Name Column Header */}
            <div className="w-64 px-4 py-3 font-semibold text-yellow-300 border-r border-gray-700/50 flex items-center gap-2 sticky left-0 bg-gray-800/60 z-20">
              <Package className="w-4 h-4" />
              <span>Library</span>
            </div>

            {/* Latest (Registry) Column Header - LEFTMOST */}
            <div className="w-40 px-4 py-3 border-r border-gray-700/50 text-center font-semibold text-blue-300 bg-gray-800/60 sticky left-64 z-20">
              <div>Latest</div>
              <div className="text-sm text-gray-500 mt-1">Registry</div>
            </div>

            {/* Project Column Headers */}
            {projects.map((project) => (
              <div
                key={project.id}
                className="w-48 px-4 py-3 border-r border-gray-700/50 text-center"
              >
                <div className="font-semibold text-yellow-300 mb-1">{project.name}</div>
                <div className="text-sm text-gray-500">{project.type}</div>
              </div>
            ))}
          </div>

          {/* Data Rows */}
          <div className="relative">
            {libraryRows.map((lib, index) => (
              <motion.div
                key={lib.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.01 }}
                className={`flex items-stretch border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors ${
                  lib.isShared ? 'border-l-2 border-l-yellow-500/50' : ''
                }`}
              >
                {/* Library Name Cell */}
                <div className="w-64 px-4 py-3 border-r border-gray-700/50 sticky left-0 bg-gray-900/80 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-2">
                    {lib.isShared && (
                      <div className="flex items-center gap-1 text-yellow-400" title="Shared dependency">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-[10px] font-mono">×{lib.projectCount}</span>
                      </div>
                    )}
                    <div className="flex-1 truncate" title={lib.name}>
                      <div className="text-sm text-gray-200 font-medium">{lib.name}</div>
                      <div className="text-sm text-gray-500">{lib.type}</div>
                    </div>
                  </div>
                </div>

                {/* Latest (Registry) Column Cell - LEFTMOST */}
                <div className="w-40 px-4 py-3 border-r border-gray-700/50 text-center bg-blue-500/5 sticky left-64 backdrop-blur-sm z-10">
                  {lib.registryVersion ? (
                    <div className="text-sm font-mono text-blue-300">
                      {lib.registryVersion}
                    </div>
                  ) : (
                    <div className="text-gray-600 text-sm">—</div>
                  )}
                </div>

                {/* Project Version Cells */}
                {projects.map((project) => {
                  const version = lib.projectVersions[project.id];
                  // Compare against registry version instead of project's latest version
                  const versionColor = getVersionColor(lib.isShared, version, lib.registryVersion);
                  const cellBg = getCellBackground(lib.isShared, version, lib.registryVersion);
                  const isOutdated = isPackageOutdated(version, lib.registryVersion);
                  const isSelected = isPackageSelected(lib.name, project.id);

                  // Apply yellow background if selected
                  const selectedBg = isSelected ? 'bg-yellow-500/20 border-yellow-500/40' : '';

                  return (
                    <div
                      key={`${lib.name}-${project.id}`}
                      className={`w-48 px-4 py-3 border-r border-gray-700/50 text-center ${cellBg} ${selectedBg} ${
                        isOutdated && version ? 'cursor-pointer group relative transition-all' : ''
                      }`}
                      onClick={() => {
                        if (isOutdated && version) {
                          togglePackageSelection(lib.name, project.id, lib.registryVersion);
                        }
                      }}
                    >
                      {version ? (
                        <div className="flex items-center justify-center">
                          <div className={`text-sm font-mono ${versionColor}`}>
                            {version}
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-600 text-sm">—</div>
                      )}
                      {isOutdated && version && !isSelected && (
                        <div className="absolute inset-0 bg-yellow-500/0 group-hover:bg-yellow-500/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-sm text-yellow-300 font-medium">Click to select</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {libraryRows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Package className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">No dependencies found</p>
              <p className="text-sm">Run a scan to analyze project dependencies</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-gray-800/40 border border-gray-700/30 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Color Legend</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/40"></div>
              <span className="text-gray-400">Up-to-date with Registry</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/40"></div>
              <span className="text-gray-400">Outdated (vs Registry) - Click to select</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-800/40 border border-gray-700/40"></div>
              <span className="text-gray-400">Unique Library</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-400">Shared Across Projects</span>
            </div>
          </div>
        </div>

        {/* Custom scrollbar styles */}
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            height: 8px;
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(31, 41, 55, 0.5);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(234, 179, 8, 0.3);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(234, 179, 8, 0.5);
          }
        `}</style>
      </div>
    </>
  );
}
