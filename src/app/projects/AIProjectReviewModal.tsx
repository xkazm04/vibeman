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

// Type definitions for AI-generated content
interface Task {
  title: string;
  description: string;
  priority?: string;
  status?: string;
}

interface Goal {
  title: string;
  description: string;
  type?: string;
}

interface CodeTask {
  file: string;
  task: string;
  priority?: string;
}

interface AIProjectReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIProjectReviewModal({
  isOpen,
  onClose
}: AIProjectReviewModalProps) {
  const { activeProject } = useActiveProjectStore();

  // UI State
  const [currentView, setCurrentView] = useState<'selector' | AIReviewMode>('selector');
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('preview');
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>(() => 
    DefaultProviderStorage.getDefaultProvider()
  );

  // Content State
  const [docsContent, setDocsContent] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contexts, setContexts] = useState<Array<{ filename: string; content: string }>>([]);
  const [codeTasks, setCodeTasks] = useState<CodeTask[]>([]);

  // Loading States
  const [docsLoading, setDocsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [contextsLoading, setContextsLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);

  // Error States
  const [docsError, setDocsError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [contextsError, setContextsError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentView('selector');
      setDocsContent('');
      setTasks([]);
      setGoals([]);
      setContexts([]);
      setCodeTasks([]);
      setDocsError(null);
      setTasksError(null);
      setGoalsError(null);
      setContextsError(null);
      setCodeError(null);
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
   * Unified content generation using configuration mapping
   */
  const generateContent = async (mode: AIReviewMode) => {
    if (!activeProject || mode === 'file-scanner') return;

    const setters = {
      setDocsLoading,
      setTasksLoading,
      setGoalsLoading,
      setContextsLoading,
      setCodeLoading,
      setDocsError,
      setTasksError,
      setGoalsError,
      setContextsError,
      setCodeError,
      setDocsContent,
      setTasks,
      setGoals,
      setContexts,
      setCodeTasks,
    };

    const config = AI_REVIEW_MODE_CONFIG[mode];
    if (!config) return;

    const setLoading = setters[config.setLoadingKey];
    const setError = setters[config.setErrorKey];
    const setData = setters[config.setDataKey];

    setLoading(true);
    setError(null);

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
        setData(data as never);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : `Failed to generate ${mode}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentView('selector');
  };

  const handleAcceptTask = (index: number) => {
    console.log('Accept task:', tasks[index]);
    // TODO: Implement task acceptance logic
  };

  const handleRejectTask = (index: number) => {
    console.log('Reject task:', tasks[index]);
    // TODO: Implement task rejection logic
  };

  const handleAcceptGoal = (index: number) => {
    console.log('Accept goal:', goals[index]);
    // TODO: Implement goal acceptance logic
  };

  const handleRejectGoal = (index: number) => {
    console.log('Reject goal:', goals[index]);
    // TODO: Implement goal rejection logic
  };

  const handleClose = () => {
    setCurrentView('selector');
    setDocsContent('');
    setTasks([]);
    setGoals([]);
    setContexts([]);
    setCodeTasks([]);
    setDocsError(null);
    setTasksError(null);
    setGoalsError(null);
    setContextsError(null);
    setCodeError(null);
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

    // Use configuration-based rendering
    const config = AI_REVIEW_MODE_CONFIG[currentView as AIReviewMode];
    if (!config) return null;

    const stateMap = {
      docsContent,
      tasks,
      goals,
      contexts,
      codeTasks,
      docsLoading,
      tasksLoading,
      goalsLoading,
      contextsLoading,
      codeLoading,
      docsError,
      tasksError,
      goalsError,
      contextsError,
      codeError,
    };

    return config.renderComponent({
      data: stateMap[config.dataKey],
      loading: stateMap[config.loadingKey],
      error: stateMap[config.errorKey],
      onBack: handleBack,
      activeProject,
      // Docs-specific props
      previewMode,
      onPreviewModeChange: setPreviewMode,
      onContentChange: setDocsContent,
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