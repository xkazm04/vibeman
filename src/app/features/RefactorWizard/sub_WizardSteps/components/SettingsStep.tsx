'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { ArrowRight, Info, Sparkles, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { StepContainer, CyberCard, StepHeader } from '@/components/ui/wizard';
import { SCAN_TECHNIQUE_GROUPS, getScanGroupsForProjectType, type ProjectType, type ScanTechniqueGroup } from '../../lib/scanTechniques';
import { useState, useEffect } from 'react';
import ProviderSelector from '@/components/llm/ProviderSelector';
import ScanGroupList from './sub_SettingsStep/ScanGroupList';

/** SettingsStep - First step (1/7) of the RefactorWizard workflow. */
export default function SettingsStep() {
  const { selectedScanGroups, toggleScanGroup, selectAllGroups, clearGroupSelection, setCurrentStep, setAnalysisError, llmProvider, setLLMProvider } = useRefactorStore();
  const activeProject = useActiveProjectStore(state => state.activeProject);
  const [projectType, setProjectType] = useState<ProjectType>('generic');
  const [relevantGroups, setRelevantGroups] = useState<ScanTechniqueGroup[]>(SCAN_TECHNIQUE_GROUPS);

  useEffect(() => {
    if (activeProject?.type) {
      const type = activeProject.type === 'nextjs' ? 'nextjs' : activeProject.type === 'fastapi' ? 'fastapi' : 'generic';
      setProjectType(type);
      setRelevantGroups(getScanGroupsForProjectType(type));
    } else {
      setRelevantGroups(SCAN_TECHNIQUE_GROUPS);
    }
  }, [activeProject]);

  const handleContinue = () => {
    if (selectedScanGroups.size === 0) { setAnalysisError('Please select at least one scan group to continue'); return; }
    setCurrentStep('scan');
  };

  return (
    <StepContainer isLoading={false} error={null} data-testid="settings-step-container">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-500">Step 1 of 7</div>
        <button onClick={handleContinue} disabled={selectedScanGroups.size === 0} className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" data-testid="settings-continue-top">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <StepHeader title="Configure Scan" description="Select scan groups and AI provider for analysis" icon={Settings} currentStep={1} totalSteps={7} />

      <CyberCard variant="glow" data-testid="project-type-info">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30"><Info className="w-6 h-6 text-blue-400" /></div>
          <div className="flex-1">
            <h4 className="text-white font-medium">Project Type Detected</h4>
            <p className="text-sm text-gray-400 mt-1">
              <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300 font-mono">{projectType}</span>
              <span className="ml-2">- {relevantGroups.length} relevant scan groups available</span>
            </p>
          </div>
        </div>
      </CyberCard>

      <CyberCard variant="glow" data-testid="ai-provider-card">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30"><Sparkles className="w-6 h-6 text-purple-400" /></div>
            <div className="flex-1">
              <h4 className="text-white font-medium">AI Provider Settings</h4>
              <p className="text-sm text-gray-400 mt-1">Select LLM provider for package generation and analysis</p>
            </div>
          </div>
          <ProviderSelector selectedProvider={llmProvider as any} onSelectProvider={setLLMProvider} compact showAllProviders />
          <p className="text-xs text-gray-500">💡 Package generation uses AI to intelligently group refactoring opportunities</p>
        </div>
      </CyberCard>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button onClick={selectAllGroups} className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-300 text-sm font-medium rounded-lg transition-all duration-200" data-testid="select-all-groups-btn">Select All</button>
          <button onClick={clearGroupSelection} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-gray-300 text-sm font-medium rounded-lg transition-all duration-200" data-testid="clear-all-groups-btn">Clear All</button>
        </div>
        <p className="text-sm text-gray-400">{selectedScanGroups.size} of {relevantGroups.length} selected</p>
      </div>

      <ScanGroupList groups={relevantGroups} selectedGroups={selectedScanGroups} onToggleGroup={toggleScanGroup} />

      <button onClick={handleContinue} disabled={selectedScanGroups.size === 0} className="w-full py-4 bg-gradient-to-r cursor-pointer from-cyan-700 to-blue-700 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none relative overflow-hidden group" data-testid="settings-continue-btn">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" style={{ backgroundImage: 'linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <span className="flex items-center justify-center space-x-2 relative z-10"><span>Continue to Scan</span><ArrowRight className="w-5 h-5" /></span>
      </button>

      {selectedScanGroups.size === 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className="text-sm text-yellow-400/80">Select at least one scan group to continue</p>
        </motion.div>
      )}
    </StepContainer>
  );
}
