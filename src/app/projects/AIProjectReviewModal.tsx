import React, { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';
import { useActiveProjectStore } from '../../stores/activeProjectStore';
import BaseModal from '../../components/ui/BaseModal';
import ModalHeader from '../../components/ui/ModalHeader';
import AIContentSelector from './ProjectAI/ScanModal/AIContentSelector_main';
import { SupportedProvider, DefaultProviderStorage } from '../../lib/llm';
import { AIReviewMode } from '@/lib/api/aiProjectReviewApi';
import { AI_REVIEW_MODE_CONFIG } from './ProjectAI/ScanModal/aiReviewConfig';
import * as AIReviewAPI from '@/lib/api/aiProjectReviewApi';
import { useAIContentLoader, Task, Goal, CodeTask } from './ProjectAI/hooks/useAIContentLoader';

interface AIProjectReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIProjectReviewModal({
  isOpen,
  onClose
}: AIProjectReviewModalProps) {
  const { activeProject } = useActiveProjectStore();

  // Use centralized AI content loader hook
  const { state: contentState, actions: contentActions } = useAIContentLoader();

  // UI State
  const [currentView, setCurrentView] = useState<'selector' | AIReviewMode>('selector');
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('preview');
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>(() =>
    DefaultProviderStorage.getDefaultProvider()
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentView('selector');
      contentActions.resetAll();
      setPreviewMode('preview');
    }
  }, [isOpen]);

  const handleSelectMode = async (mode: AIReviewMode, backgroundTask?: boolean) => {
    if (!activeProject) {
      return;
    }

    if (backgroundTask) {
      await handleBackgroundGeneration(mode);
      return;
    }

    setCurrentView(mode);
    await generateContent(mode);
  };

  const handleBackgroundGeneration = async (mode: AIReviewMode) => {
    if (!activeProject) return;

    try {
      const result = await AIReviewAPI.queueBackgroundTask({
        projectId: activeProject.id,
        projectPath: activeProject.path,
        projectName: activeProject.name,
        taskType: mode,
        priority: 1,
      });

      console.log(`Background ${mode} task queued:`, result.task);
      handleClose();
    } catch (error) {
      console.error(`Failed to queue background ${mode} task:`, error);
    }
  };

  /**
   * Unified content generation using hook's centralized state management
   */
  const generateContent = async (mode: AIReviewMode) => {
    if (!activeProject || mode === 'file-scanner') return;

    // Map AIReviewMode to content loader mode
    const modeMap: Record<AIReviewMode, 'docs' | 'goals' | 'contexts'> = {
      docs: 'docs',
      goals: 'goals',
      context: 'contexts',
      'file-scanner': 'docs', // fallback, won't be used due to early return
    };

    const loaderMode = modeMap[mode];
    if (!loaderMode) return;

    contentActions.setLoading(loaderMode, true);
    contentActions.setError(loaderMode, null);

    try {
      let data;

      switch (mode) {
        case 'docs':
          data = await AIReviewAPI.generateDocs(
            activeProject.id,
            activeProject.path,
            activeProject.name,
            selectedProvider
          );
          break;
        case 'goals':
          data = await AIReviewAPI.generateGoals(
            activeProject.id,
            activeProject.path,
            activeProject.name,
            selectedProvider
          );
          break;
        case 'context':
          data = await AIReviewAPI.generateContexts(
            activeProject.id,
            activeProject.path,
            activeProject.name,
            selectedProvider
          );
          break;
      }

      if (data) {
        contentActions.setData(loaderMode, data as any);
      }
    } catch (error) {
      contentActions.setError(
        loaderMode,
        error instanceof Error ? error.message : `Failed to generate ${mode}`
      );
    } finally {
      contentActions.setLoading(loaderMode, false);
    }
  };

  const handleBack = () => {
    setCurrentView('selector');
  };

  const handleAcceptTask = (index: number) => {
    console.log('Accept task:', contentState.tasks.data[index]);
    // TODO: Implement task acceptance logic
  };

  const handleRejectTask = (index: number) => {
    console.log('Reject task:', contentState.tasks.data[index]);
    // TODO: Implement task rejection logic
  };

  const handleAcceptGoal = (index: number) => {
    console.log('Accept goal:', contentState.goals.data[index]);
    // TODO: Implement goal acceptance logic
  };

  const handleRejectGoal = (index: number) => {
    console.log('Reject goal:', contentState.goals.data[index]);
    // TODO: Implement goal rejection logic
  };

  const handleClose = () => {
    setCurrentView('selector');
    contentActions.resetAll();
    onClose();
  };

  const renderContent = () => {
    if (currentView === 'selector') {
      return (
        <AIContentSelector
          onSelectMode={handleSelectMode}
          activeProject={activeProject}
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
        />
      );
    }

    // Use configuration-based rendering with centralized state
    const config = AI_REVIEW_MODE_CONFIG[currentView as AIReviewMode];
    if (!config) return null;

    // Map mode to content state
    const modeStateMap: Record<string, any> = {
      docsContent: contentState.docs.data,
      tasks: contentState.tasks.data,
      goals: contentState.goals.data,
      contexts: contentState.contexts.data,
      codeTasks: contentState.code.data,
      docsLoading: contentState.docs.loading,
      tasksLoading: contentState.tasks.loading,
      goalsLoading: contentState.goals.loading,
      contextsLoading: contentState.contexts.loading,
      codeLoading: contentState.code.loading,
      docsError: contentState.docs.error,
      tasksError: contentState.tasks.error,
      goalsError: contentState.goals.error,
      contextsError: contentState.contexts.error,
      codeError: contentState.code.error,
    };

    return config.renderComponent({
      data: modeStateMap[config.dataKey],
      loading: modeStateMap[config.loadingKey],
      error: modeStateMap[config.errorKey],
      onBack: handleBack,
      activeProject,
      // Docs-specific props
      previewMode,
      onPreviewModeChange: setPreviewMode,
      onContentChange: (content: string) => contentActions.setData('docs', content),
      // Task/Goal-specific props
      onAcceptTask: handleAcceptTask,
      onRejectTask: handleRejectTask,
      onAcceptGoal: handleAcceptGoal,
      onRejectGoal: handleRejectGoal,
    });
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-8xl" maxHeight="max-h-[90vh]">
      {currentView === 'selector' ? (
        <ModalHeader
          title="AI Project Assistant"
          subtitle="Choose how you'd like AI to help analyze and improve your project"
          icon={<Brain className="w-5 h-5 text-blue-400" />}
          onClose={handleClose}
        />
      ) : (
        <div className="flex-shrink-0">
          {/* Header is handled by individual display components */}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </BaseModal>
  );
}