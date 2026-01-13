'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Compass, RefreshCw } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ContextMapSelector from './components/ContextMapSelector';
import GenerateQuestionsButton from './components/GenerateQuestionsButton';
import GenerateDirectionsButton from './components/GenerateDirectionsButton';
import QuestionsList from './components/QuestionsList';
import DirectionsList from './components/DirectionsList';
import {
  fetchContextMap,
  fetchQuestions,
  answerQuestion,
  deleteQuestion,
  generateQuestionRequirement,
  setupContextMapGenerator,
  ContextMapEntry,
  QuestionsResponse
} from './lib/questionsApi';
import {
  fetchDirections,
  acceptDirection,
  rejectDirection,
  deleteDirection,
  generateDirectionRequirement,
  DirectionsResponse
} from './lib/directionsApi';

type FeatureTab = 'questions' | 'directions';

export default function QuestionsLayout() {
  const { activeProject } = useActiveProjectStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<FeatureTab>('questions');

  // Context map state
  const [contexts, setContexts] = useState<ContextMapEntry[]>([]);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [contextMapLoading, setContextMapLoading] = useState(false);
  const [contextMapError, setContextMapError] = useState<string | null>(null);

  // Questions state
  const [questionsData, setQuestionsData] = useState<QuestionsResponse | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Directions state
  const [directionsData, setDirectionsData] = useState<DirectionsResponse | null>(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);

  // Load context map when project changes
  useEffect(() => {
    if (!activeProject?.path) {
      setContexts([]);
      setSelectedContextIds([]);
      setContextMapError(null);
      return;
    }

    loadContextMap();
  }, [activeProject?.path]);

  // Load questions when project changes
  useEffect(() => {
    if (!activeProject?.id) {
      setQuestionsData(null);
      return;
    }

    loadQuestions();
  }, [activeProject?.id]);

  // Load directions when project changes or tab switches to directions
  useEffect(() => {
    if (!activeProject?.id) {
      setDirectionsData(null);
      return;
    }

    if (activeTab === 'directions') {
      loadDirections();
    }
  }, [activeProject?.id, activeTab]);

  const loadContextMap = async () => {
    if (!activeProject?.path) return;

    setContextMapLoading(true);
    setContextMapError(null);

    try {
      const response = await fetchContextMap(activeProject.path);

      if (response.success && response.contextMap) {
        setContexts(response.contextMap.contexts);
        // Auto-select all contexts
        setSelectedContextIds(response.contextMap.contexts.map(c => c.id));
      } else {
        setContexts([]);
        setSelectedContextIds([]);
        setContextMapError(response.error || 'Context map not found');
      }
    } catch (err) {
      setContextMapError(err instanceof Error ? err.message : 'Failed to load context map');
      setContexts([]);
      setSelectedContextIds([]);
    } finally {
      setContextMapLoading(false);
    }
  };

  const loadQuestions = async () => {
    if (!activeProject?.id) return;

    setQuestionsLoading(true);

    try {
      const response = await fetchQuestions(activeProject.id);
      setQuestionsData(response);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const loadDirections = async () => {
    if (!activeProject?.id) return;

    setDirectionsLoading(true);

    try {
      const response = await fetchDirections(activeProject.id);
      setDirectionsData(response);
    } catch (err) {
      console.error('Failed to load directions:', err);
    } finally {
      setDirectionsLoading(false);
    }
  };

  const handleToggleContext = (contextId: string) => {
    setSelectedContextIds(prev =>
      prev.includes(contextId)
        ? prev.filter(id => id !== contextId)
        : [...prev, contextId]
    );
  };

  const handleSelectAll = () => {
    setSelectedContextIds(contexts.map(c => c.id));
  };

  const handleClearAll = () => {
    setSelectedContextIds([]);
  };

  const handleSetupContextMap = useCallback(async () => {
    if (!activeProject?.path) return;

    await setupContextMapGenerator(activeProject.path);
  }, [activeProject?.path]);

  // Questions handlers
  const handleGenerateQuestions = async (questionsPerContext: number) => {
    if (!activeProject) return;

    const selectedContexts = contexts.filter(c => selectedContextIds.includes(c.id));

    const result = await generateQuestionRequirement({
      projectId: activeProject.id,
      projectName: activeProject.name,
      projectPath: activeProject.path,
      selectedContexts,
      questionsPerContext
    });

    return {
      requirementPath: result.requirementPath,
      requirementName: result.requirementName
    };
  };

  const handleSaveAnswer = useCallback(async (questionId: string, answer: string) => {
    await answerQuestion(questionId, answer);
    // Reload questions to get updated state
    loadQuestions();
  }, [activeProject?.id]);

  const handleDeleteQuestion = useCallback(async (questionId: string) => {
    await deleteQuestion(questionId);
    // Remove from local state immediately
    setQuestionsData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        questions: prev.questions.filter(q => q.id !== questionId),
        grouped: prev.grouped.map(g => ({
          ...g,
          questions: g.questions.filter(q => q.id !== questionId)
        })).filter(g => g.questions.length > 0),
        counts: {
          ...prev.counts,
          total: prev.counts.total - 1,
          pending: prev.questions.find(q => q.id === questionId)?.status === 'pending'
            ? prev.counts.pending - 1
            : prev.counts.pending,
          answered: prev.questions.find(q => q.id === questionId)?.status === 'answered'
            ? prev.counts.answered - 1
            : prev.counts.answered
        }
      };
    });
  }, []);

  // Directions handlers
  const handleGenerateDirections = async (directionsPerContext: number) => {
    if (!activeProject) return;

    const selectedContexts = contexts.filter(c => selectedContextIds.includes(c.id));

    const result = await generateDirectionRequirement({
      projectId: activeProject.id,
      projectName: activeProject.name,
      projectPath: activeProject.path,
      selectedContexts,
      directionsPerContext
    });

    return {
      requirementPath: result.requirementPath,
      requirementName: result.requirementName
    };
  };

  const handleAcceptDirection = useCallback(async (directionId: string) => {
    if (!activeProject?.path) return;

    await acceptDirection(directionId, activeProject.path);
    // Reload directions to get updated state
    loadDirections();
  }, [activeProject?.path]);

  const handleRejectDirection = useCallback(async (directionId: string) => {
    await rejectDirection(directionId);
    // Reload directions to get updated state
    loadDirections();
  }, []);

  const handleDeleteDirection = useCallback(async (directionId: string) => {
    await deleteDirection(directionId);
    // Remove from local state immediately
    setDirectionsData(prev => {
      if (!prev) return null;
      const deletedDirection = prev.directions.find(d => d.id === directionId);
      return {
        ...prev,
        directions: prev.directions.filter(d => d.id !== directionId),
        grouped: prev.grouped.map(g => ({
          ...g,
          directions: g.directions.filter(d => d.id !== directionId)
        })).filter(g => g.directions.length > 0),
        counts: {
          ...prev.counts,
          total: prev.counts.total - 1,
          pending: deletedDirection?.status === 'pending'
            ? prev.counts.pending - 1
            : prev.counts.pending,
          accepted: deletedDirection?.status === 'accepted'
            ? prev.counts.accepted - 1
            : prev.counts.accepted,
          rejected: deletedDirection?.status === 'rejected'
            ? prev.counts.rejected - 1
            : prev.counts.rejected
        }
      };
    });
  }, []);

  const handleRefresh = () => {
    if (activeTab === 'questions') {
      loadQuestions();
    } else {
      loadDirections();
    }
  };

  // Dynamic stats based on active tab
  const currentStats = activeTab === 'questions'
    ? questionsData && questionsData.counts.total > 0
      ? { current: questionsData.counts.answered, total: questionsData.counts.total, label: 'answered' }
      : null
    : directionsData && directionsData.counts.total > 0
      ? { current: directionsData.counts.accepted, total: directionsData.counts.total, label: 'accepted' }
      : null;

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
              <div className={`
                flex items-center justify-center w-14 h-14 rounded-2xl border shadow-lg
                ${activeTab === 'questions'
                  ? 'bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-cyan-500/20 border-purple-500/30 shadow-purple-500/10'
                  : 'bg-gradient-to-br from-cyan-500/20 via-teal-500/10 to-emerald-500/20 border-cyan-500/30 shadow-cyan-500/10'
                }
              `}>
                {activeTab === 'questions' ? (
                  <HelpCircle className="w-7 h-7 text-purple-400" />
                ) : (
                  <Compass className="w-7 h-7 text-cyan-400" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  {activeTab === 'questions' ? 'Questions' : 'Directions'}
                </h1>
                <p className="text-gray-400">
                  {activeTab === 'questions'
                    ? 'Generate clarifying questions for precise idea generation'
                    : 'Get actionable development guidance for your contexts'
                  }
                </p>
              </div>
            </div>

            {/* Stats */}
            {currentStats && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {currentStats.current}/{currentStats.total}
                  </div>
                  <div className="text-xs text-gray-400">{currentStats.label}</div>
                </div>
                <button
                  onClick={handleRefresh}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 transition-colors"
                  title={`Refresh ${activeTab}`}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-800 mb-6">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('questions')}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                ${activeTab === 'questions'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
                }
              `}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="font-medium">Questions</span>
              {questionsData && questionsData.counts.pending > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                  {questionsData.counts.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('directions')}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                ${activeTab === 'directions'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-white'
                }
              `}
            >
              <Compass className="w-4 h-4" />
              <span className="font-medium">Directions</span>
              {directionsData && directionsData.counts.pending > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                  {directionsData.counts.pending}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Project check */}
        {!activeProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-8 border border-gray-700/40 text-center"
          >
            <p className="text-gray-400">Select a project to get started</p>
          </motion.div>
        )}

        {activeProject && (
          <AnimatePresence mode="wait">
            {/* Questions Tab Content */}
            {activeTab === 'questions' && (
              <motion.div
                key="questions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Context Map Selector */}
                <ContextMapSelector
                  contexts={contexts}
                  selectedContextIds={selectedContextIds}
                  onToggleContext={handleToggleContext}
                  onSelectAll={handleSelectAll}
                  onClearAll={handleClearAll}
                  loading={contextMapLoading}
                  error={contextMapError}
                  onSetupContextMap={handleSetupContextMap}
                />

                {/* Generate Button */}
                {contexts.length > 0 && (
                  <GenerateQuestionsButton
                    onGenerate={handleGenerateQuestions}
                    selectedCount={selectedContextIds.length}
                    disabled={selectedContextIds.length === 0}
                  />
                )}

                {/* Questions List */}
                <div className="pt-4">
                  <h2 className="text-lg font-semibold text-white mb-4">
                    Generated Questions
                  </h2>
                  <QuestionsList
                    grouped={questionsData?.grouped || []}
                    onSaveAnswer={handleSaveAnswer}
                    onDeleteQuestion={handleDeleteQuestion}
                    loading={questionsLoading}
                  />
                </div>
              </motion.div>
            )}

            {/* Directions Tab Content */}
            {activeTab === 'directions' && (
              <motion.div
                key="directions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Context Map Selector (shared) */}
                <ContextMapSelector
                  contexts={contexts}
                  selectedContextIds={selectedContextIds}
                  onToggleContext={handleToggleContext}
                  onSelectAll={handleSelectAll}
                  onClearAll={handleClearAll}
                  loading={contextMapLoading}
                  error={contextMapError}
                  onSetupContextMap={handleSetupContextMap}
                />

                {/* Generate Directions Button */}
                {contexts.length > 0 && (
                  <GenerateDirectionsButton
                    onGenerate={handleGenerateDirections}
                    selectedCount={selectedContextIds.length}
                    disabled={selectedContextIds.length === 0}
                  />
                )}

                {/* Directions List */}
                <div className="pt-4">
                  <h2 className="text-lg font-semibold text-white mb-4">
                    Generated Directions
                  </h2>
                  <DirectionsList
                    grouped={directionsData?.grouped || []}
                    onAccept={handleAcceptDirection}
                    onReject={handleRejectDirection}
                    onDelete={handleDeleteDirection}
                    loading={directionsLoading}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
