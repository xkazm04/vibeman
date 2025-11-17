'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { ArrowRight, CheckCircle2, Shield, Zap, Wrench, Network, TestTube, Component, Info, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer, CyberCard } from '@/components/ui/wizard';
import { SCAN_TECHNIQUE_GROUPS, getScanGroupsForProjectType, type ProjectType, type ScanTechniqueGroup } from '../lib/scanTechniques';
import { useState, useEffect } from 'react';
import ProviderSelector from '@/components/llm/ProviderSelector';


const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle2,
  Shield,
  Zap,
  Wrench,
  Network,
  TestTube,
  Component,
};

export default function SettingsStep() {
  const {
    selectedScanGroups,
    toggleScanGroup,
    selectAllGroups,
    clearGroupSelection,
    setCurrentStep,
    setAnalysisError,
    llmProvider,
    setLLMProvider,
  } = useRefactorStore();

  const activeProject = useActiveProjectStore(state => state.activeProject);
  const [projectType, setProjectType] = useState<ProjectType>('generic');
  const [relevantGroups, setRelevantGroups] = useState<ScanTechniqueGroup[]>(SCAN_TECHNIQUE_GROUPS);

  // Detect project type based on active project
  useEffect(() => {
    if (activeProject?.type) {
      const type = activeProject.type === 'nextjs' ? 'nextjs' :
                   activeProject.type === 'fastapi' ? 'fastapi' : 'generic';
      setProjectType(type);
      const groups = getScanGroupsForProjectType(type);
      setRelevantGroups(groups);
    } else {
      // Default to showing all groups
      setRelevantGroups(SCAN_TECHNIQUE_GROUPS);
    }
  }, [activeProject]);

  const handleContinue = () => {
    if (selectedScanGroups.size === 0) {
      setAnalysisError('Please select at least one scan group to continue');
      return;
    }
    setCurrentStep('scan');
  };

  const handleSelectAll = () => {
    selectAllGroups();
  };

  const handleClearAll = () => {
    clearGroupSelection();
  };

  return (
    <StepContainer
      isLoading={false}
      error={null}
      data-testid="settings-step-container"
    >
      {/* Project Type Info */}
      <CyberCard variant="glow" data-testid="project-type-info">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
            <Info className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium">Project Type Detected</h4>
            <p className="text-sm text-gray-400 mt-1">
              <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300 font-mono">
                {projectType}
              </span>
              <span className="ml-2">- {relevantGroups.length} relevant scan groups available</span>
            </p>
          </div>
        </div>
      </CyberCard>

      {/* AI Provider Selection - FIXED */}
      <CyberCard variant="glow" data-testid="ai-provider-card">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium">AI Provider Settings</h4>
              <p className="text-sm text-gray-400 mt-1">
                Select LLM provider for package generation and analysis
              </p>
            </div>
          </div>

          {/* FIXED: Use correct prop name */}
          <ProviderSelector
            selectedProvider={llmProvider as any}
            onSelectProvider={(provider) => setLLMProvider(provider)}
            compact={true}
            showAllProviders={true}
          />

          <p className="text-xs text-gray-500">
            💡 Package generation uses AI to intelligently group refactoring opportunities into strategic packages
          </p>
        </div>
      </CyberCard>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-300 text-sm font-medium rounded-lg transition-all duration-200"
            data-testid="select-all-groups-btn"
          >
            Select All
          </button>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-gray-300 text-sm font-medium rounded-lg transition-all duration-200"
            data-testid="clear-all-groups-btn"
          >
            Clear All
          </button>
        </div>
        <p className="text-sm text-gray-400">
          {selectedScanGroups.size} of {relevantGroups.length} selected
        </p>
      </div>

      {/* Technique Groups List */}
      <div className="space-y-3 max-h-[800px] py-6 overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {relevantGroups.map((group, index) => {
            const isSelected = selectedScanGroups.has(group.id);
            const Icon = ICON_MAP[group.icon] || Info;
            const techniqueCount = group.techniques.length;

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                data-testid={`settings-group-${group.id}`}
              >
                <CyberCard
                  variant={isSelected ? 'glow' : 'dark'}
                  className="!p-0 overflow-hidden cursor-pointer hover:border-cyan-500/30 transition-all duration-200"
                  onClick={() => toggleScanGroup(group.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center space-x-4">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleScanGroup(group.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 accent-cyan-500 cursor-pointer"
                        data-testid={`settings-group-checkbox-${group.id}`}
                      />

                      {/* Icon */}
                      <div className={`p-3 rounded-lg transition-all duration-200 ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                          : 'bg-white/10 border border-white/20'
                      }`}>
                        <Icon className={`w-6 h-6 transition-colors ${
                          isSelected ? 'text-cyan-400' : 'text-gray-400'
                        }`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-medium transition-colors ${
                            isSelected ? 'text-white' : 'text-gray-300'
                          }`}>
                            {group.name}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {techniqueCount} technique{techniqueCount !== 1 ? 's' : ''}
                            </span>
                            {group.priority >= 9 && (
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded text-xs font-medium">
                                High Priority
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">{group.description}</p>

                        {/* Technique Names Preview */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {group.techniques.slice(0, 3).map((tech) => (
                            <span
                              key={tech.id}
                              className="px-2 py-0.5 bg-black/30 border border-white/10 rounded text-xs text-gray-400"
                            >
                              {tech.name}
                            </span>
                          ))}
                          {group.techniques.length > 3 && (
                            <span className="px-2 py-0.5 bg-black/30 border border-white/10 rounded text-xs text-gray-500">
                              +{group.techniques.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CyberCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={selectedScanGroups.size === 0}
        className="w-full py-4 bg-gradient-to-r cursor-pointer from-cyan-700 to-blue-700 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none relative overflow-hidden group"
        data-testid="settings-continue-btn"
      >
        {/* Blueprint grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        <span className="flex items-center justify-center space-x-2 relative z-10">
          <span>Continue to Scan</span>
          <ArrowRight className="w-5 h-5" />
        </span>
      </button>

      {/* Help Text */}
      {selectedScanGroups.size === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-sm text-yellow-400/80">
            Select at least one scan group to continue
          </p>
        </motion.div>
      )}
    </StepContainer>
  );
}
