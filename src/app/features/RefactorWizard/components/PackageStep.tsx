'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { Package, Box, Layers, ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Loader2, FolderTree, FileCode, AlertTriangle } from 'lucide-react';
import {
  StepContainer,
  CyberCard,
  StepHeader
} from '@/components/ui/wizard';
import { motion } from 'framer-motion';
import ProviderSelector from '@/components/llm/ProviderSelector';

export default function PackageStep() {
  const {
    packages,
    selectedPackages,
    togglePackageSelection,
    selectAllPackages,
    clearPackageSelection,
    selectFoundationalPackages,
    packageFilter,
    setPackageFilter,
    generatePackages,
    packageGenerationStatus,
    packageGenerationError,
    llmProvider,
    setLLMProvider,
    llmModel,
    setLLMModel,
    setCurrentStep,
    selectedFolders,
    selectedOpportunities,
    opportunities,
  } = useRefactorStore();

  // Get the opportunities that were selected in the review step
  const selectedOpps = opportunities.filter(o => selectedOpportunities.has(o.id));
  const selectedOppCount = selectedOpps.length;

  const handleGeneratePackages = async () => {
    await generatePackages();
  };

  // If no packages exist yet, show generation view
  if (packages.length === 0) {
    const isGenerating = packageGenerationStatus === 'generating';

    return (
      <StepContainer
        isLoading={false}
        error={packageGenerationError}
        onErrorDismiss={() => useRefactorStore.setState({ packageGenerationError: null })}
        data-testid="package-step-generation"
      >
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentStep('review')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            data-testid="package-back-button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <StepHeader
          title="Strategic Packaging"
          description="Group selected opportunities into logical, executable packages"
          icon={Package}
          currentStep={5}
          totalSteps={7}
        />

        {/* Context Summary */}
        <CyberCard variant="dark" className="!p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              {selectedFolders.length > 0 && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <FolderTree className="w-4 h-4" />
                  <span>{selectedFolders.length} folder(s) scoped</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{selectedOppCount} opportunities selected</span>
              </div>
            </div>
            {selectedOppCount === 0 && (
              <button
                onClick={() => setCurrentStep('review')}
                className="text-xs text-yellow-400 hover:underline"
              >
                Go back to select opportunities
              </button>
            )}
          </div>
        </CyberCard>

        <CyberCard className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 mb-4">
            <Package className="w-10 h-10 text-blue-400" />
          </div>

          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-bold text-white">Generate Refactoring Packages</h3>
            <p className="text-gray-400">
              AI will analyze your {selectedOppCount > 0 ? selectedOppCount : ''} selected opportunities and group them into logical packages based on dependencies, risk, and impact.
            </p>
          </div>

          <div className="w-full max-w-md bg-black/20 p-6 rounded-xl border border-white/5 text-left">
            <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              AI Configuration
            </h4>
            <ProviderSelector
              selectedProvider={llmProvider as any}
              onSelectProvider={(provider) => setLLMProvider(provider)}
              selectedModel={llmModel}
              onSelectModel={(model) => setLLMModel(model)}
              compact={false}
              showAllProviders={true}
            />
          </div>

          <button
            onClick={handleGeneratePackages}
            disabled={isGenerating || selectedOppCount === 0}
            className="w-full max-w-md py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Packages...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Packages{selectedOppCount > 0 ? ` (${selectedOppCount} issues)` : ''}</span>
              </>
            )}
          </button>

          {selectedOppCount === 0 && (
            <p className="text-sm text-yellow-400">
              Please go back and select opportunities to package
            </p>
          )}

          {isGenerating && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-blue-400 animate-pulse"
            >
              Analyzing dependencies and grouping changes...
            </motion.p>
          )}
        </CyberCard>
      </StepContainer>
    );
  }

  // Existing Package Selection View
  const filteredPackages = packages.filter(pkg => {
    if (packageFilter === 'all') return true;
    if (packageFilter === 'high-impact') return pkg.impact === 'high';
    if (packageFilter === 'quick-wins') return pkg.effort === 'low';
    if (packageFilter === 'foundational') return pkg.executionOrder === 1;
    return true;
  });

  const selectedCount = selectedPackages.size;
  const totalCount = packages.length;

  return (
    <StepContainer
      isLoading={false}
      error={null}
      onErrorDismiss={() => { }}
      data-testid="package-step-container"
    >
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentStep('review')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          data-testid="package-back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setCurrentStep('execute')}
          disabled={selectedCount === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="package-continue-button"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <StepHeader
        title="Select Packages"
        description="Choose which refactoring packages to execute"
        icon={Package}
        currentStep={5}
        totalSteps={7}
      />

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <CyberCard variant="dark" className="!p-4 flex flex-col justify-between">
          <span className="text-gray-400 text-xs uppercase tracking-wider">Selected</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-cyan-400">{selectedCount}</span>
            <span className="text-gray-500 text-sm">/ {totalCount}</span>
          </div>
        </CyberCard>

        <div className="md:col-span-3 flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'all', label: 'All Packages' },
            { id: 'foundational', label: 'Foundational' },
            { id: 'high-impact', label: 'High Impact' },
            { id: 'quick-wins', label: 'Quick Wins' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setPackageFilter(filter.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${packageFilter === filter.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-black/20 text-gray-400 border border-white/5 hover:bg-black/40'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={selectAllPackages}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Select All
        </button>
        <span className="text-gray-600">|</span>
        <button
          onClick={clearPackageSelection}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Clear Selection
        </button>
        <span className="text-gray-600">|</span>
        <button
          onClick={selectFoundationalPackages}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Select Foundational
        </button>
      </div>

      {/* Packages List */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
        {filteredPackages.map((pkg) => {
          const isSelected = selectedPackages.has(pkg.id);
          return (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative group cursor-pointer rounded-xl border transition-all duration-200 ${isSelected
                  ? 'bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                  : 'bg-black/20 border-white/5 hover:border-white/10'
                }`}
              onClick={() => togglePackageSelection(pkg.id)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {pkg.name}
                      </h4>
                      {pkg.executionOrder === 1 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          FOUNDATIONAL
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${pkg.impact === 'critical' || pkg.impact === 'high'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : pkg.impact === 'medium'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-green-500/10 text-green-400 border-green-500/20'
                        }`}>
                        {pkg.impact.toUpperCase()} IMPACT
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                      {pkg.description}
                    </p>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Box className="w-3 h-3" />
                        <span>{pkg.files?.length || 0} files</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>{pkg.dependsOn?.length || 0} dependencies</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileCode className="w-3 h-3" />
                        <span>{pkg.opportunities?.length || 0} issues</span>
                      </div>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSelected
                      ? 'bg-cyan-500 border-cyan-500'
                      : 'border-gray-600 group-hover:border-gray-500'
                    }`}>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-black" />}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredPackages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No packages found matching filter</p>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
        <p className="text-gray-500 text-sm">
          {selectedCount > 0
            ? `${selectedCount} of ${totalCount} packages selected`
            : 'Select packages to continue'}
        </p>
        <button
          onClick={() => setCurrentStep('execute')}
          disabled={selectedCount === 0}
          className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-lg shadow-cyan-500/20 disabled:shadow-none transition-all flex items-center gap-2"
        >
          <span>Create Requirements</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </StepContainer>
  );
}
