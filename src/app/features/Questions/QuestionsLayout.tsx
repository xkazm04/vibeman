/**
 * Questions & Directions Layout
 *
 * Orchestrates the strategic questioning workflow:
 *   1. **Select** — pick context maps to explore
 *   2. **Generate** — create questions and/or direction proposals via LLM
 *   3. **Review** — triage results in table / matrix / carousel / tree views
 *
 * Key state flows:
 * - Context selection drives which areas are explored during generation.
 * - Answering a question triggers auto-deepening, which may create follow-up
 *   questions if ambiguity is detected (see `handleSaveAnswer`).
 * - Directions can be accepted (creates a requirement) or rejected.
 *
 * Sub-components extracted for readability:
 * - `ViewModeToggle` — segmented control for switching review views
 * - `AutoDeepenToast` — floating notification for auto-deepen results
 */
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Compass, RefreshCw } from 'lucide-react';
import LiquidStepRail from '@/components/ui/LiquidStepRail';
import ContextMapSelector from './components/ContextMapSelector';
import CombinedGeneratePanel from './components/CombinedGeneratePanel';
import UnifiedTable from './components/UnifiedTable';
import DirectionMatrix from './components/DirectionMatrix';
import QuestionTree from './components/QuestionTree';
import DirectionCarousel from '@/app/features/Proposals/components/DirectionCarousel';
import AnswerQuestionModal from './components/AnswerQuestionModal';
import AutoDeepenToast from './components/AutoDeepenToast';
import ViewModeToggle from './components/ViewModeToggle';
import { useQuestionsData, useGenerationOrchestrator, useViewMode } from './hooks';

// Interrogative engines for programmatic access to the generate → decide → act pattern.
// UI components continue using React Query hooks for rendering; these engines provide
// the same pattern for non-UI consumers (tests, automation, CLI tools).
export { createQuestionsEngine, createDirectionsEngine } from '@/lib/interrogative-engine';

interface QuestionsLayoutProps {
  /** Optional project ID override; falls back to the active project from the store. */
  projectId?: string | null;
}

export default function QuestionsLayout({ projectId: propProjectId }: QuestionsLayoutProps) {
  const data = useQuestionsData(propProjectId);
  const { viewMode, setViewMode, treeData } = useViewMode(data.effectiveProjectId);

  const orchestrator = useGenerationOrchestrator({
    activeProject: data.activeProject,
    contexts: data.contexts,
    selectedContextIds: data.selectedContextIds,
    questions: data.questions,
    answeredQuestions: data.answeredQuestions,
  });

  const isLoading = data.combinedLoading;

  // Step rail state
  const step1Done = data.selectedContextIds.length > 0;
  const step2Done = data.contexts.length > 0 && data.selectedContextIds.length > 0;
  const step3Done = data.questions.length > 0 || data.directions.length > 0;
  const activeStep = !step1Done ? 0 : !step2Done ? 1 : 2;

  return (
    <div className="min-h-full bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl border shadow-lg bg-gradient-to-br from-purple-500/20 via-cyan-500/10 to-teal-500/20 border-purple-500/30 shadow-purple-500/10">
                <div className="flex items-center gap-0.5">
                  <HelpCircle className="w-5 h-5 text-purple-400" />
                  <Compass className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Questions & Directions
                </h1>
                <p className="text-gray-400">
                  Brainstorm development direction through strategic questions
                </p>
              </div>
            </div>

            {/* Stats & Refresh */}
            <div className="flex items-center gap-4">
              {data.totalPending > 0 && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {data.totalPending}
                  </div>
                  <div className="text-xs text-gray-400">pending</div>
                </div>
              )}
              <button
                onClick={data.handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Project check */}
        {!data.activeProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-8 border border-gray-700/40 text-center"
          >
            <p className="text-gray-400">Select a project to get started</p>
          </motion.div>
        )}

        {data.activeProject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-4"
          >
            {/* Step indicator rail */}
            <div className="pt-4 flex-shrink-0">
              <LiquidStepRail
                steps={[
                  { id: 'select', label: 'Select', tooltip: 'Select Contexts', done: step1Done },
                  { id: 'generate', label: 'Generate', tooltip: 'Generate Questions & Directions', done: step2Done },
                  { id: 'review', label: 'Review', tooltip: 'Review Results', done: step3Done },
                ]}
                activeIndex={activeStep}
                direction="vertical"
                accentFrom="#a855f7"
                accentTo="#06b6d4"
              />
            </div>

            {/* Content sections */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Context Map Selector */}
              <ContextMapSelector
                groupedContexts={data.groupedContexts}
                allContexts={data.contexts}
                selectedContextIds={data.selectedContextIds}
                onToggleContext={data.handleToggleContext}
                onSelectAll={data.handleSelectAll}
                onClearAll={data.handleClearAll}
                loading={data.contextLoading}
                error={data.contextError instanceof Error ? data.contextError.message : data.contextError ? String(data.contextError) : null}
                onSetupContextMap={orchestrator.handleSetupContextMap}
              />

              {/* Combined Generate Panel */}
              {data.contexts.length > 0 && (
                <CombinedGeneratePanel
                  contexts={data.contexts}
                  selectedContextIds={data.selectedContextIds}
                  answeredQuestions={data.answeredQuestions}
                  onGenerateQuestions={orchestrator.handleGenerateQuestions}
                  onGenerateDirections={orchestrator.handleGenerateDirections}
                  disabled={data.selectedContextIds.length === 0}
                />
              )}

              {/* Generated Items with View Toggle */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    Generated Items
                  </h2>
                  <ViewModeToggle
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    pendingDirections={data.directionsData?.counts.pending ?? 0}
                    totalTrees={treeData?.totalTrees ?? 0}
                  />
                </div>

                {viewMode === 'table' && (
                  <UnifiedTable
                    questions={data.questions}
                    directions={data.directions}
                    onAnswerQuestion={orchestrator.handleOpenAnswerModal}
                    onAcceptDirection={orchestrator.handleAcceptDirection}
                    onRejectDirection={orchestrator.handleRejectDirection}
                    onDeleteQuestion={orchestrator.handleDeleteQuestion}
                    onDeleteDirection={orchestrator.handleDeleteDirection}
                    loading={isLoading}
                  />
                )}
                {viewMode === 'matrix' && (
                  <DirectionMatrix
                    directions={data.directions}
                    onAcceptDirection={orchestrator.handleAcceptDirection}
                    onRejectDirection={orchestrator.handleRejectDirection}
                  />
                )}
                {viewMode === 'carousel' && (
                  <DirectionCarousel
                    directions={data.directions}
                    onAccept={orchestrator.handleAcceptDirection}
                    onReject={orchestrator.handleRejectDirection}
                    isLoading={isLoading}
                  />
                )}
                {viewMode === 'tree' && (
                  <QuestionTree
                    trees={treeData?.trees ?? []}
                    onAnswerQuestion={orchestrator.handleOpenAnswerModal}
                    onGenerateFollowUp={orchestrator.handleGenerateFollowUp}
                    onGenerateBrief={orchestrator.handleGenerateBrief}
                    onDeleteQuestion={orchestrator.handleDeleteQuestion}
                    onGenerateDirection={orchestrator.handleGenerateDirectionFromTree}
                    generatingFollowUp={orchestrator.generateFollowUpMutation.isPending ? (orchestrator.generateFollowUpMutation.variables?.questionId ?? null) : null}
                    generatingBrief={orchestrator.generateBriefMutation.isPending ? (orchestrator.generateBriefMutation.variables?.questionId ?? null) : null}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Answer Question Modal */}
      <AnswerQuestionModal
        question={orchestrator.answerModalQuestion}
        isOpen={orchestrator.answerModalQuestion !== null}
        onClose={orchestrator.handleCloseAnswerModal}
        onSave={orchestrator.handleSaveAnswer}
      />

      {/* Auto-Deepen Notification Toast */}
      <AutoDeepenToast
        result={orchestrator.autoDeepenResult}
        onDismiss={() => orchestrator.setAutoDeepenResult(null)}
      />
    </div>
  );
}
