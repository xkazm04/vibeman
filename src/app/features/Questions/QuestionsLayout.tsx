'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, RefreshCw } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ContextMapSelector from './components/ContextMapSelector';
import GenerateQuestionsButton from './components/GenerateQuestionsButton';
import QuestionsList from './components/QuestionsList';
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

export default function QuestionsLayout() {
  const { activeProject } = useActiveProjectStore();

  // Context map state
  const [contexts, setContexts] = useState<ContextMapEntry[]>([]);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [contextMapLoading, setContextMapLoading] = useState(false);
  const [contextMapError, setContextMapError] = useState<string | null>(null);

  // Questions state
  const [questionsData, setQuestionsData] = useState<QuestionsResponse | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);

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

  const handleGenerate = async (questionsPerContext: number) => {
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

  return (
    <div className="min-h-full bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-cyan-500/20 border border-purple-500/30 shadow-lg shadow-purple-500/10">
                <HelpCircle className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Questions
                </h1>
                <p className="text-gray-400">
                  Generate clarifying questions for precise idea generation
                </p>
              </div>
            </div>

            {/* Stats */}
            {questionsData && questionsData.counts.total > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {questionsData.counts.answered}/{questionsData.counts.total}
                  </div>
                  <div className="text-xs text-gray-400">answered</div>
                </div>
                <button
                  onClick={loadQuestions}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 transition-colors"
                  title="Refresh questions"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>

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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
                onGenerate={handleGenerate}
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
      </div>
    </div>
  );
}
