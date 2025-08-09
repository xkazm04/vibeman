import React, { useState, useEffect } from 'react';
import { Brain, AlertCircle } from 'lucide-react';
import { useActiveProjectStore } from '../../stores/activeProjectStore';
import BaseModal from '../../components/ui/BaseModal';
import ModalHeader from '../../components/ui/ModalHeader';
import AIContentSelector from './ProjectAI/AIContentSelector_main';
import AIDocsDisplay from './ProjectAI/AIDocsDisplay';
import TaskResultDisplay from './ProjectAI/TaskResultDisplay';
import GoalResultDisplay from './ProjectAI/GoalResultDisplay';
import ContextResultDisplay from './ProjectAI/ContextResultDisplay';

interface AIProjectReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to parse AI JSON responses that may include ```json wrapper
function parseAIJsonResponse(response: string): any {
  // Normalize special characters that might cause JSON parsing issues
  const normalizeJson = (jsonStr: string): string => {
    return jsonStr
      // Replace various dash types with regular hyphen
      .replace(/[‑–—−]/g, '-')
      // Replace smart quotes with regular quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Replace other problematic Unicode characters
      .replace(/[…]/g, '...')
      // Remove any BOM or invisible characters
      .replace(/^\uFEFF/, '')
      // Remove any other invisible/control characters including narrow no-break space
      .replace(/[\u200B-\u200D\uFEFF\u202F]/g, '')
      .trim();
  };

  const tryParse = (jsonStr: string): any => {
    try {
      const normalized = normalizeJson(jsonStr);
      console.log('Attempting to parse normalized JSON:', normalized.substring(0, 200) + '...');
      return JSON.parse(normalized);
    } catch (error) {
      console.error('JSON parsing failed for:', jsonStr.substring(0, 200) + '...');
      console.error('Parse error:', error);
      throw error;
    }
  };

  console.log('parseAIJsonResponse called with response length:', response.length);
  console.log('Response starts with:', response.substring(0, 50));

  // Check if response has ```json wrapper first
  if (response.includes('```json')) {
    console.log('Found ```json marker, extracting...');

    // Find the start of JSON content after ```json
    const startIndex = response.indexOf('```json') + 7; // 7 = length of '```json'
    const endIndex = response.indexOf('```', startIndex);

    if (endIndex !== -1) {
      const jsonContent = response.substring(startIndex, endIndex).trim();
      console.log('Extracted JSON content:', jsonContent.substring(0, 100) + '...');
      console.log('JSON content length:', jsonContent.length);
      return tryParse(jsonContent);
    }
  }

  // If no wrapper, try to parse as-is
  try {
    return tryParse(response);
  } catch (error) {
    console.log('Direct parsing failed, trying to find JSON array...');

    // Try to find JSON array in the response
    const arrayMatch = response.match(/\[[\s\S]*?\]/);
    if (arrayMatch) {
      console.log('Found JSON array in response, extracting...');
      return tryParse(arrayMatch[0]);
    }

    // Log the full response for debugging
    console.error('Failed to parse AI response:', response);
    throw new Error(`Failed to parse AI JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default function AIProjectReviewModal({
  isOpen,
  onClose
}: AIProjectReviewModalProps) {
  const { activeProject } = useActiveProjectStore();

  // UI State
  const [currentView, setCurrentView] = useState<'selector' | 'docs' | 'tasks' | 'goals' | 'context' | 'code'>('selector');
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('preview');

  // Content State
  const [docsContent, setDocsContent] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [contexts, setContexts] = useState<Array<{ filename: string; content: string }>>([]);
  const [codeTasks, setCodeTasks] = useState<any[]>([]);

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

  const handleSelectMode = async (mode: 'docs' | 'tasks' | 'goals' | 'context' | 'code', backgroundTask?: boolean) => {
    if (!activeProject) {
      return;
    }

    if (backgroundTask) {
      // Handle background task generation
      await handleBackgroundGeneration(mode);
      return;
    }

    setCurrentView(mode);

    // Generate content based on mode
    switch (mode) {
      case 'docs':
        await generateDocs();
        break;
      case 'tasks':
        await generateTasks();
        break;
      case 'goals':
        await generateGoals();
        break;
      case 'context':
        await generateContexts();
        break;
      case 'code':
        await generateCodeTasks();
        break;
    }
  };

  const handleBackgroundGeneration = async (mode: 'docs' | 'tasks' | 'goals' | 'context' | 'code') => {
    if (!activeProject) return;

    try {
      const response = await fetch('/api/kiro/background-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectPath: activeProject.path,
          projectName: activeProject.name,
          taskType: mode,
          priority: 1 // Higher priority for user-initiated tasks
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Show success message and close modal
        console.log(`Background ${mode} task queued:`, result.task);
        handleClose();
      } else {
        throw new Error(result.error || `Failed to queue background ${mode} task`);
      }
    } catch (error) {
      console.error(`Failed to queue background ${mode} task:`, error);
      // You might want to show an error toast here
    }
  };

  const generateDocs = async () => {
    if (!activeProject) return;

    setDocsLoading(true);
    setDocsError(null);

    try {
      const response = await fetch('/api/kiro/ai-project-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectPath: activeProject.path,
          projectName: activeProject.name,
          mode: 'docs'
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate project documentation');
      }

      setDocsContent(result.analysis);
    } catch (error) {
      setDocsError(error instanceof Error ? error.message : 'Failed to generate documentation');
    } finally {
      setDocsLoading(false);
    }
  };

  const generateTasks = async () => {
    if (!activeProject) return;

    setTasksLoading(true);
    setTasksError(null);

    try {
      const response = await fetch('/api/kiro/ai-project-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectPath: activeProject.path,
          projectName: activeProject.name,
          mode: 'tasks'
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate tasks');
      }

      if (result.tasks) {
        setTasks(result.tasks);
      } else if (result.rawResponse) {
        // Try to extract JSON from raw response using robust parser
        try {
          const parsedTasks = parseAIJsonResponse(result.rawResponse);
          setTasks(parsedTasks);
        } catch (parseError) {
          throw new Error('Failed to parse tasks from AI response');
        }
      }
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Failed to generate tasks');
    } finally {
      setTasksLoading(false);
    }
  };

  const generateGoals = async () => {
    if (!activeProject) return;

    setGoalsLoading(true);
    setGoalsError(null);

    try {
      const response = await fetch('/api/kiro/ai-project-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectPath: activeProject.path,
          projectName: activeProject.name,
          mode: 'goals'
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate goals');
      }

      if (result.goals) {
        setGoals(result.goals);
      } else if (result.rawResponse) {
        // Try to extract JSON from raw response using robust parser
        try {
          const parsedGoals = parseAIJsonResponse(result.rawResponse);
          setGoals(parsedGoals);
        } catch (parseError) {
          throw new Error('Failed to parse goals from AI response');
        }
      }
    } catch (error) {
      setGoalsError(error instanceof Error ? error.message : 'Failed to generate goals');
    } finally {
      setGoalsLoading(false);
    }
  };

  const generateContexts = async () => {
    if (!activeProject) return;

    setContextsLoading(true);
    setContextsError(null);

    try {
      const response = await fetch('/api/kiro/ai-project-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectPath: activeProject.path,
          projectName: activeProject.name,
          mode: 'context'
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate context files');
      }

      if (result.contexts) {
        setContexts(result.contexts);
      } else {
        throw new Error('No context files were generated');
      }
    } catch (error) {
      setContextsError(error instanceof Error ? error.message : 'Failed to generate context files');
    } finally {
      setContextsLoading(false);
    }
  };

  const generateCodeTasks = async () => {
    if (!activeProject) return;

    setCodeLoading(true);
    setCodeError(null);

    try {
      const response = await fetch('/api/kiro/ai-project-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectPath: activeProject.path,
          projectName: activeProject.name,
          mode: 'code'
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate code optimization tasks');
      }

      if (result.tasks) {
        setCodeTasks(result.tasks);
      } else if (result.rawResponse) {
        // Try to extract JSON from raw response using robust parser
        try {
          const parsedTasks = parseAIJsonResponse(result.rawResponse);
          setCodeTasks(parsedTasks);
        } catch (parseError) {
          throw new Error('Failed to parse code tasks from AI response');
        }
      }
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : 'Failed to generate code optimization tasks');
    } finally {
      setCodeLoading(false);
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
    switch (currentView) {
      case 'selector':
        return (
          <AIContentSelector
            onSelectMode={handleSelectMode}
            activeProject={activeProject}
          />
        );

      case 'docs':
        return (
          <AIDocsDisplay
            content={docsContent}
            loading={docsLoading}
            error={docsError}
            onBack={handleBack}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
            onContentChange={setDocsContent}
          />
        );

      case 'tasks':
        return (
          <TaskResultDisplay
            tasks={tasks}
            loading={tasksLoading}
            error={tasksError}
            onBack={handleBack}
            onAcceptTask={handleAcceptTask}
            onRejectTask={handleRejectTask}
            activeProject={activeProject}
          />
        );

      case 'goals':
        return (
          <GoalResultDisplay
            goals={goals}
            loading={goalsLoading}
            error={goalsError}
            onBack={handleBack}
            onAcceptGoal={handleAcceptGoal}
            onRejectGoal={handleRejectGoal}
            activeProject={activeProject}
          />
        );

      case 'context':
        return (
          <ContextResultDisplay
            contexts={contexts}
            loading={contextsLoading}
            error={contextsError}
            onBack={handleBack}
            activeProject={activeProject}
          />
        );

      case 'code':
        return (
          <TaskResultDisplay
            tasks={codeTasks}
            loading={codeLoading}
            error={codeError}
            onBack={handleBack}
            onAcceptTask={handleAcceptTask}
            onRejectTask={handleRejectTask}
            activeProject={activeProject}
          />
        );

      default:
        return null;
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-6xl" maxHeight="max-h-[95vh]">
      {currentView === 'selector' ? (
        <ModalHeader
          title="AI Project Assistant"
          subtitle="Choose how you'd like AI to help analyze and improve your project"
          icon={<Brain className="w-5 h-5 text-purple-400" />}
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