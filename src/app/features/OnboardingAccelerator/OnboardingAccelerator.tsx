'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Plus,
  ArrowLeft,
  BookOpen,
  HelpCircle,
  Play,
  CheckCircle,
  ChevronRight,
  Zap,
  Loader2,
} from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useOnboardingAcceleratorStore } from '@/stores/onboardingAcceleratorStore';
import { LearningPathCard } from './components/LearningPathCard';
import { CreatePathModal } from './components/CreatePathModal';
import { ModuleCard } from './components/ModuleCard';
import { CodeWalkthroughViewer } from './components/CodeWalkthroughViewer';
import { QuizPanel } from './components/QuizPanel';
import * as api from './lib/api';

type ViewMode = 'list' | 'path' | 'module';
type ModuleTab = 'walkthroughs' | 'quiz';

export const OnboardingAccelerator: React.FC = () => {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  const { activeProject } = useActiveProjectStore();

  const {
    learningPaths,
    modules,
    walkthroughs,
    questions,
    currentPathId,
    currentModuleId,
    currentWalkthroughIndex,
    isLoading,
    isGenerating,
    setLearningPaths,
    setCurrentPath,
    setModules,
    setCurrentModule,
    setWalkthroughs,
    setQuestions,
    setCurrentWalkthroughIndex,
    markWalkthroughViewed,
    setLoading,
    setGenerating,
    updateLearningPath,
    addLearningPath,
    removeLearningPath,
    updateModule,
    getCurrentPath,
    getCurrentModule,
    startSession,
    endSession,
  } = useOnboardingAcceleratorStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [moduleTab, setModuleTab] = useState<ModuleTab>('walkthroughs');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPath = getCurrentPath();
  const currentModule = getCurrentModule();

  // Fetch learning paths when project changes
  useEffect(() => {
    if (!activeProject?.id) return;

    const fetchPaths = async () => {
      setLoading(true);
      try {
        const paths = await api.fetchLearningPaths(activeProject.id);
        setLearningPaths(paths);
      } catch (err) {
        console.error('Failed to fetch learning paths:', err);
        setError('Failed to load learning paths');
      } finally {
        setLoading(false);
      }
    };

    fetchPaths();
  }, [activeProject?.id, setLearningPaths, setLoading]);

  // Fetch modules when path is selected
  useEffect(() => {
    if (!currentPathId) return;

    const fetchPathData = async () => {
      setLoading(true);
      try {
        const pathData = await api.fetchLearningPath(currentPathId);
        setModules(pathData.modules);
      } catch (err) {
        console.error('Failed to fetch path data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPathData();
  }, [currentPathId, setModules, setLoading]);

  // Fetch module data when module is selected
  useEffect(() => {
    if (!currentModuleId) return;

    const fetchModuleData = async () => {
      setLoading(true);
      try {
        const moduleData = await api.fetchModule(currentModuleId);
        setWalkthroughs(moduleData.walkthroughs);
        setQuestions(moduleData.questions);
      } catch (err) {
        console.error('Failed to fetch module data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModuleData();
  }, [currentModuleId, setWalkthroughs, setQuestions, setLoading]);

  const handleCreatePath = async (data: { developerName: string; assignedWork: api.AssignedWorkItem[] }) => {
    if (!activeProject?.id) return;

    setGenerating(true);
    try {
      // Create the path
      const newPath = await api.createLearningPath({
        projectId: activeProject.id,
        developerName: data.developerName,
        assignedWork: data.assignedWork,
      });

      // Generate the learning content
      const generated = await api.generateLearningPath({
        pathId: newPath.id,
        projectId: activeProject.id,
        assignedWork: data.assignedWork,
        includeWalkthroughs: true,
        includeQuizzes: true,
      });

      addLearningPath(generated.path);
      setIsCreateModalOpen(false);
      setCurrentPath(generated.path.id);
      setModules(generated.modules);
      setViewMode('path');
    } catch (err: any) {
      console.error('Failed to create learning path:', err);
      setError(err.message || 'Failed to create learning path');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectPath = (pathId: string) => {
    setCurrentPath(pathId);
    setViewMode('path');
  };

  const handleDeletePath = async (pathId: string) => {
    try {
      await api.deleteLearningPath(pathId);
      removeLearningPath(pathId);
    } catch (err) {
      console.error('Failed to delete path:', err);
    }
  };

  const handleStartPath = async (pathId: string) => {
    try {
      await api.updateLearningPath(pathId, { status: 'active' });
      updateLearningPath(pathId, { status: 'active' });
      handleSelectPath(pathId);
    } catch (err) {
      console.error('Failed to start path:', err);
    }
  };

  const handleSelectModule = (moduleId: string) => {
    setCurrentModule(moduleId);
    setCurrentWalkthroughIndex(0);
    setModuleTab('walkthroughs');
    setViewMode('module');
  };

  const handleStartModule = async (moduleId: string) => {
    try {
      const updated = await api.updateModule(moduleId, { action: 'start' });
      updateModule(moduleId, updated);
      startSession(moduleId);
      handleSelectModule(moduleId);
    } catch (err) {
      console.error('Failed to start module:', err);
    }
  };

  const handleSkipModule = async (moduleId: string) => {
    try {
      const updated = await api.updateModule(moduleId, { action: 'skip' });
      updateModule(moduleId, updated);
    } catch (err) {
      console.error('Failed to skip module:', err);
    }
  };

  const handleCompleteModule = async () => {
    if (!currentModuleId) return;

    const session = endSession();
    try {
      const updated = await api.updateModule(currentModuleId, {
        action: 'complete',
        actualMinutes: session?.durationMinutes || 0,
      });
      updateModule(currentModuleId, updated);
      setViewMode('path');
      setCurrentModule(null);
    } catch (err) {
      console.error('Failed to complete module:', err);
    }
  };

  const handleWalkthroughViewed = useCallback(async (walkthroughId: string) => {
    if (!currentPathId) return;

    try {
      await api.markWalkthroughViewed(walkthroughId, currentPathId);
      markWalkthroughViewed(walkthroughId);
    } catch (err) {
      console.error('Failed to mark walkthrough as viewed:', err);
    }
  }, [currentPathId, markWalkthroughViewed]);

  const handleSubmitQuizAnswer = async (data: {
    questionId: string;
    answer: string;
    timeTakenSeconds: number;
  }) => {
    if (!currentPathId) throw new Error('No active path');

    return api.submitQuizAnswer({
      ...data,
      pathId: currentPathId,
    });
  };

  const handleBack = () => {
    if (viewMode === 'module') {
      setViewMode('path');
      setCurrentModule(null);
    } else if (viewMode === 'path') {
      setViewMode('list');
      setCurrentPath(null);
    }
  };

  // Loading state
  if (isLoading && learningPaths.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={`w-8 h-8 animate-spin ${colors.text}`} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {viewMode !== 'list' && (
            <motion.button
              onClick={handleBack}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <GraduationCap className={`w-6 h-6 ${colors.text}`} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                {viewMode === 'list' && 'Onboarding Accelerator'}
                {viewMode === 'path' && currentPath?.developer_name}
                {viewMode === 'module' && currentModule?.title}
              </h1>
              <p className="text-sm text-gray-400">
                {viewMode === 'list' && 'AI-powered developer onboarding'}
                {viewMode === 'path' && `${currentPath?.completed_modules}/${currentPath?.total_modules} modules completed`}
                {viewMode === 'module' && currentModule?.description}
              </p>
            </div>
          </div>
        </div>

        {viewMode === 'list' && (
          <motion.button
            onClick={() => setIsCreateModalOpen(true)}
            className={`px-4 py-2 rounded-lg bg-gradient-to-r ${colors.primary} text-white font-medium flex items-center gap-2`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="create-path-btn"
          >
            <Plus className="w-4 h-4" />
            New Learning Path
          </motion.button>
        )}
      </div>

      {/* Content based on view mode */}
      <AnimatePresence mode="wait">
        {/* List View - Learning Paths */}
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {learningPaths.length === 0 ? (
              <div className="text-center py-16">
                <div className={`w-16 h-16 mx-auto rounded-full ${colors.bg} flex items-center justify-center mb-4`}>
                  <GraduationCap className={`w-8 h-8 ${colors.text}`} />
                </div>
                <h2 className="text-xl font-medium text-white mb-2">No Learning Paths Yet</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Create a personalized learning path for new developers to accelerate their onboarding.
                </p>
                <motion.button
                  onClick={() => setIsCreateModalOpen(true)}
                  className={`px-6 py-3 rounded-lg bg-gradient-to-r ${colors.primary} text-white font-medium flex items-center gap-2 mx-auto`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="create-first-path-btn"
                >
                  <Zap className="w-5 h-5" />
                  Create First Learning Path
                </motion.button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {learningPaths.map((path) => (
                  <LearningPathCard
                    key={path.id}
                    path={path}
                    onSelect={() => handleSelectPath(path.id)}
                    onDelete={() => handleDeletePath(path.id)}
                    onStart={path.status === 'draft' ? () => handleStartPath(path.id) : undefined}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Path View - Modules */}
        {viewMode === 'path' && currentPath && (
          <motion.div
            key="path"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Progress overview */}
            <div className="p-4 bg-gray-900/70 border border-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">Overall Progress</span>
                <span className={`text-sm ${colors.text}`}>
                  {currentPath.progress_percentage}%
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${colors.primary}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${currentPath.progress_percentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
                <span>{currentPath.completed_modules} of {currentPath.total_modules} modules</span>
                <span>{currentPath.actual_hours.toFixed(1)}h / {currentPath.estimated_hours.toFixed(1)}h estimated</span>
              </div>
            </div>

            {/* Modules list */}
            <div className="space-y-3">
              {modules.map((module, index) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  onSelect={() => handleSelectModule(module.id)}
                  onStart={() => handleStartModule(module.id)}
                  onSkip={() => handleSkipModule(module.id)}
                  isActive={module.status === 'in_progress'}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Module View - Walkthroughs & Quiz */}
        {viewMode === 'module' && currentModule && (
          <motion.div
            key="module"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Tabs */}
            <div className="flex items-center gap-2 p-1 bg-gray-800/50 rounded-lg w-fit">
              <button
                onClick={() => setModuleTab('walkthroughs')}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                  moduleTab === 'walkthroughs'
                    ? `${colors.bg} ${colors.text}`
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="walkthroughs-tab"
              >
                <BookOpen className="w-4 h-4" />
                Walkthroughs
                {walkthroughs.length > 0 && (
                  <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">
                    {walkthroughs.filter(w => w.viewed).length}/{walkthroughs.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setModuleTab('quiz')}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                  moduleTab === 'quiz'
                    ? `${colors.bg} ${colors.text}`
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid="quiz-tab"
              >
                <HelpCircle className="w-4 h-4" />
                Quiz
                {questions.length > 0 && (
                  <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">
                    {questions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="bg-gray-900/70 border border-gray-700/50 rounded-lg p-6">
              {moduleTab === 'walkthroughs' ? (
                <CodeWalkthroughViewer
                  walkthroughs={walkthroughs}
                  currentIndex={currentWalkthroughIndex}
                  onIndexChange={setCurrentWalkthroughIndex}
                  onMarkViewed={handleWalkthroughViewed}
                  projectPath={activeProject?.path}
                />
              ) : (
                <QuizPanel
                  questions={questions}
                  pathId={currentPathId || ''}
                  onSubmitAnswer={handleSubmitQuizAnswer}
                  onComplete={handleCompleteModule}
                />
              )}
            </div>

            {/* Complete module button (after walkthroughs) */}
            {moduleTab === 'walkthroughs' && walkthroughs.length > 0 && (
              <div className="flex justify-end">
                <motion.button
                  onClick={() => setModuleTab('quiz')}
                  className={`px-6 py-2 rounded-lg bg-gradient-to-r ${colors.primary} text-white font-medium flex items-center gap-2`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="proceed-to-quiz-btn"
                >
                  {questions.length > 0 ? (
                    <>
                      Take Quiz
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Complete Module
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Path Modal */}
      <CreatePathModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreatePath}
        isLoading={isGenerating}
      />
    </div>
  );
};

export default OnboardingAccelerator;
