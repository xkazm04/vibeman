import React from 'react';
import { AIReviewMode } from '@/lib/api/aiProjectReviewApi';
import AIDocsDisplay from '../AIDocsDisplay';
import TaskResultDisplay from '../TaskResultDisplay';
import GoalResultDisplay from '../ScanGoals/GoalResultDisplay';
import { ContextResultDisplay } from '../Context';

export interface AIReviewModeConfig {
  mode: AIReviewMode;
  loadingKey: 'docsLoading' | 'tasksLoading' | 'goalsLoading' | 'contextsLoading' | 'codeLoading';
  errorKey: 'docsError' | 'tasksError' | 'goalsError' | 'contextsError' | 'codeError';
  dataKey: 'docsContent' | 'tasks' | 'goals' | 'contexts' | 'codeTasks';
  setLoadingKey: 'setDocsLoading' | 'setTasksLoading' | 'setGoalsLoading' | 'setContextsLoading' | 'setCodeLoading';
  setErrorKey: 'setDocsError' | 'setTasksError' | 'setGoalsError' | 'setContextsError' | 'setCodeError';
  setDataKey: 'setDocsContent' | 'setTasks' | 'setGoals' | 'setContexts' | 'setCodeTasks';
  renderComponent: (props: any) => React.ReactElement;
}

export const AI_REVIEW_MODE_CONFIG: Record<AIReviewMode, AIReviewModeConfig> = {
  docs: {
    mode: 'docs',
    loadingKey: 'docsLoading',
    errorKey: 'docsError',
    dataKey: 'docsContent',
    setLoadingKey: 'setDocsLoading',
    setErrorKey: 'setDocsError',
    setDataKey: 'setDocsContent',
    renderComponent: (props) => (
      <AIDocsDisplay
        content={props.data}
        loading={props.loading}
        error={props.error}
        onBack={props.onBack}
        previewMode={props.previewMode}
        onPreviewModeChange={props.onPreviewModeChange}
        onContentChange={props.onContentChange}
        activeProject={props.activeProject}
      />
    ),
  },
  tasks: {
    mode: 'tasks',
    loadingKey: 'tasksLoading',
    errorKey: 'tasksError',
    dataKey: 'tasks',
    setLoadingKey: 'setTasksLoading',
    setErrorKey: 'setTasksError',
    setDataKey: 'setTasks',
    renderComponent: (props) => (
      <TaskResultDisplay
        tasks={props.data}
        loading={props.loading}
        error={props.error}
        onBack={props.onBack}
        onAcceptTask={props.onAcceptTask}
        onRejectTask={props.onRejectTask}
        activeProject={props.activeProject}
      />
    ),
  },
  goals: {
    mode: 'goals',
    loadingKey: 'goalsLoading',
    errorKey: 'goalsError',
    dataKey: 'goals',
    setLoadingKey: 'setGoalsLoading',
    setErrorKey: 'setGoalsError',
    setDataKey: 'setGoals',
    renderComponent: (props) => (
      <GoalResultDisplay
        goals={props.data}
        loading={props.loading}
        error={props.error}
        onBack={props.onBack}
        onAcceptGoal={props.onAcceptGoal}
        onRejectGoal={props.onRejectGoal}
        activeProject={props.activeProject}
      />
    ),
  },
  context: {
    mode: 'context',
    loadingKey: 'contextsLoading',
    errorKey: 'contextsError',
    dataKey: 'contexts',
    setLoadingKey: 'setContextsLoading',
    setErrorKey: 'setContextsError',
    setDataKey: 'setContexts',
    renderComponent: (props) => (
      <ContextResultDisplay
        contexts={props.data}
        loading={props.loading}
        error={props.error}
        onBack={props.onBack}
        activeProject={props.activeProject}
      />
    ),
  },
  code: {
    mode: 'code',
    loadingKey: 'codeLoading',
    errorKey: 'codeError',
    dataKey: 'codeTasks',
    setLoadingKey: 'setCodeLoading',
    setErrorKey: 'setCodeError',
    setDataKey: 'setCodeTasks',
    renderComponent: (props) => (
      <TaskResultDisplay
        tasks={props.data}
        loading={props.loading}
        error={props.error}
        onBack={props.onBack}
        onAcceptTask={props.onAcceptTask}
        onRejectTask={props.onRejectTask}
        activeProject={props.activeProject}
      />
    ),
  },
};
