'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Filter, CheckCircle2, XCircle, GitBranch, AlertCircle } from 'lucide-react';
import { useRefactorStore } from '@/stores/refactorStore';
import PackageCard from './PackageCard';
import { validatePackageSelection } from '../lib/dependencyAnalyzer';

interface PackageStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function PackageStep({ onNext, onBack }: PackageStepProps) {
  const {
    packages,
    selectedPackages,
    packageDependencies,
    packageFilter,
    togglePackageSelection,
    selectPackagesWithDependencies,
    setPackageFilter,
    selectAllPackages,
    clearPackageSelection,
    selectPackagesByCategory,
    selectFoundationalPackages,
  } = useRefactorStore();

  // Filter packages
  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      if (packageFilter.category !== 'all' && pkg.category !== packageFilter.category) {
        return false;
      }
      if (packageFilter.impact !== 'all' && pkg.impact !== packageFilter.impact) {
        return false;
      }
      if (packageFilter.effort !== 'all' && pkg.effort !== packageFilter.effort) {
        return false;
      }
      return true;
    });
  }, [packages, packageFilter]);

  // Validate selection
  const missingDependencies = useMemo(() => {
    return validatePackageSelection(selectedPackages, packages);
  }, [selectedPackages, packages]);

  const handleSelectWithDeps = (packageId: string) => {
    selectPackagesWithDependencies(packageId);
  };

  const canProceed = selectedPackages.size > 0 && missingDependencies.length === 0;

  return (
    <div className="space-y-6" data-testid="package-step">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-cyan-400" />
            Select Refactoring Packages
          </h2>
          <p className="text-gray-400 mt-1">
            Choose strategic packages to implement ({packages.length} available)
          </p>
        </div>

        <div className="text-sm text-gray-400">
          {selectedPackages.size} / {packages.length} selected
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={selectAllPackages}
          className="px-3 py-2 text-sm rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors flex items-center gap-2"
          data-testid="select-all-packages"
        >
          <CheckCircle2 className="w-4 h-4" />
          Select All
        </button>

        <button
          onClick={clearPackageSelection}
          className="px-3 py-2 text-sm rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors flex items-center gap-2"
          data-testid="clear-package-selection"
        >
          <XCircle className="w-4 h-4" />
          Clear Selection
        </button>

        <button
          onClick={selectFoundationalPackages}
          className="px-3 py-2 text-sm rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-colors flex items-center gap-2"
          data-testid="select-foundational"
        >
          <GitBranch className="w-4 h-4" />
          Select Foundational
        </button>

        <button
          onClick={() => selectPackagesByCategory('security')}
          className="px-3 py-2 text-sm rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 transition-colors"
          data-testid="select-security"
        >
          Select Security
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filters:</span>
        </div>

        <select
          value={packageFilter.category}
          onChange={(e) => setPackageFilter({ category: e.target.value as any })}
          className="px-3 py-1 text-sm rounded bg-gray-700 text-white border border-gray-600"
          data-testid="filter-category"
        >
          <option value="all">All Categories</option>
          <option value="migration">Migration</option>
          <option value="cleanup">Cleanup</option>
          <option value="security">Security</option>
          <option value="performance">Performance</option>
          <option value="architecture">Architecture</option>
        </select>

        <select
          value={packageFilter.impact}
          onChange={(e) => setPackageFilter({ impact: e.target.value as any })}
          className="px-3 py-1 text-sm rounded bg-gray-700 text-white border border-gray-600"
          data-testid="filter-impact"
        >
          <option value="all">All Impact Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={packageFilter.effort}
          onChange={(e) => setPackageFilter({ effort: e.target.value as any })}
          className="px-3 py-1 text-sm rounded bg-gray-700 text-white border border-gray-600"
          data-testid="filter-effort"
        >
          <option value="all">All Effort Levels</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="extra-large">Extra Large</option>
        </select>
      </div>

      {/* Validation warning */}
      {missingDependencies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-orange-500/10 border border-orange-500 rounded-lg text-orange-300"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Missing Dependencies</div>
              <div className="text-sm mt-1">
                Some selected packages have unselected dependencies.
                Click "Select with Dependencies" on those packages or select them manually.
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {/* Package grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">
          Packages ({filteredPackages.length})
        </h3>

        {filteredPackages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No packages match the current filters
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPackages.map(pkg => (
              <PackageCard
                key={pkg.id}
                package={pkg}
                isSelected={selectedPackages.has(pkg.id)}
                onToggleSelect={() => togglePackageSelection(pkg.id)}
                onSelectWithDependencies={() => handleSelectWithDeps(pkg.id)}
                dependencyCount={pkg.dependsOn.length}
                enabledCount={pkg.enables.length}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-700">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          data-testid="package-back"
        >
          ← Back
        </button>

        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-all
            ${canProceed
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
          data-testid="package-next"
        >
          Continue to Execute →
        </button>
      </div>
    </div>
  );
}
