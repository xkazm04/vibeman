'use client';

import React, { useState, useCallback } from 'react';
import { useRefactorStore, type RefactorOpportunity } from '@/stores/refactorStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useThemeStore } from '@/stores/themeStore';
import { Scan, ArrowLeft } from 'lucide-react';
import { StepContainer } from '@/components/ui/wizard';
import { StepHeader } from '@/components/ui/wizard/StepHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanConfigView } from './sub_ScanStep/ScanConfigView';
import { ScanProgressView } from './sub_ScanStep/ScanProgressView';
import SuggestionIntegrationPanel from '../../components/SuggestionIntegrationPanel';
import { mergeSuggestionsWithOpportunities } from '../../lib/suggestionAdapter';

/** ScanStep - Second step (2/7) of the RefactorWizard workflow for code analysis. */
export default function ScanStep() {
  const {
    startAnalysis, analysisStatus, analysisProgress, analysisProgressMessage,
    analysisError, setAnalysisError, stopPolling, selectedFolders, setSelectedFolders, setCurrentStep,
    opportunities, setOpportunities
  } = useRefactorStore();
  const activeProject = useActiveProjectStore(state => state.activeProject);
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  // State for suggestion panel expand/collapse
  const [isSuggestionPanelExpanded, setIsSuggestionPanelExpanded] = useState(false);

  React.useEffect(() => () => { stopPolling(); }, [stopPolling]);

  /**
   * Handle suggestions loaded from the SuggestionIntegrationPanel.
   * Merges suggestions with existing scan opportunities.
   * Requirements: 1.1, 1.5
   */
  const handleSuggestionsLoaded = useCallback(
    (newSuggestions: RefactorOpportunity[]) => {
      const merged = mergeSuggestionsWithOpportunities(newSuggestions, opportunities);
      setOpportunities(merged);
    },
    [opportunities, setOpportunities]
  );

  /**
   * Toggle suggestion panel expand/collapse
   */
  const handleToggleSuggestionPanel = useCallback(() => {
    setIsSuggestionPanelExpanded((prev) => !prev);
  }, []);

  const handleStartScan = async () => {
    if (!activeProject?.id || !activeProject?.path) {
      alert('Please select a project first');
      return;
    }
    await startAnalysis(activeProject.id, activeProject.path, false, undefined, undefined, activeProject.type, selectedFolders);
  };

  const isScanning = analysisStatus === 'scanning' || analysisStatus === 'analyzing';

  return (
    <StepContainer isLoading={false} error={analysisError} onErrorDismiss={() => setAnalysisError(null)} data-testid="scan-step-container">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setCurrentStep('settings')} disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          data-testid="scan-back-button">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        {isScanning && <span className={`text-sm ${colors.textDark} font-mono`}>{analysisProgress}% complete</span>}
      </div>

      <StepHeader title="Project Analysis" description="Scan your codebase to discover refactoring opportunities using intelligent static analysis"
        icon={Scan} currentStep={2} totalSteps={7} />

      <AnimatePresence mode="wait">
        {isScanning ? (
          <ScanProgressView progress={analysisProgress} progressMessage={analysisProgressMessage} />
        ) : (
          <ScanConfigView activeProject={activeProject} selectedFolders={selectedFolders} onFoldersChange={setSelectedFolders} />
        )}
      </AnimatePresence>

      {/* AI Refactor Suggestions Panel - Requirements: 1.1, 1.5 */}
      {activeProject && !isScanning && (
        <div className="mt-6">
          <SuggestionIntegrationPanel
            projectId={activeProject.id}
            projectPath={activeProject.path}
            projectType={activeProject.type}
            onSuggestionsLoaded={handleSuggestionsLoaded}
            isExpanded={isSuggestionPanelExpanded}
            onToggleExpand={handleToggleSuggestionPanel}
          />
        </div>
      )}

      {!isScanning && (
        <motion.button onClick={handleStartScan} disabled={!activeProject}
          whileHover={{ scale: !activeProject ? 1 : 1.02 }} whileTap={{ scale: !activeProject ? 1 : 0.98 }}
          className={`w-full py-4 bg-gradient-to-r ${colors.primary} hover:opacity-90 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg ${colors.shadow} disabled:shadow-none relative overflow-hidden group`}
          data-testid="start-refactor-scan">
          <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
            style={{ backgroundImage: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)', backgroundSize: '200% 200%' }}
            animate={{ backgroundPosition: ['0% 0%', '200% 200%'] }} transition={{ duration: 2, repeat: Infinity }} />
          <span className="flex items-center justify-center space-x-2">
            <Scan className="w-5 h-5" /><span>Start Analysis</span>
            <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
          </span>
        </motion.button>
      )}
    </StepContainer>
  );
}
