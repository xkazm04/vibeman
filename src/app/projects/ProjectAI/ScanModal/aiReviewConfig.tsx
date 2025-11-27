import React from 'react';
import { AIReviewMode } from '@/lib/api/aiProjectReviewApi';
import { AIDocsDisplay } from '../sub_ScanHigh';
import { ContextResultDisplay } from '../Context';
import { Project } from '@/types';

interface RenderComponentProps {
  data: unknown;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  previewMode?: boolean;
  onPreviewModeChange?: (mode: boolean) => void;
  onContentChange?: (content: string) => void;
  activeProject: Project | undefined;
}

export interface AIReviewModeConfig {
  mode: AIReviewMode;
  loadingKey: 'docsLoading' | 'tasksLoading' | 'goalsLoading' | 'contextsLoading' | 'codeLoading';
  errorKey: 'docsError' | 'tasksError' | 'goalsError' | 'contextsError' | 'codeError';
  dataKey: 'docsContent' | 'goals' | 'contexts';
  setLoadingKey: 'setDocsLoading' | 'setTasksLoading' | 'setGoalsLoading' | 'setContextsLoading' | 'setCodeLoading';
  setErrorKey: 'setDocsError' | 'setTasksError' | 'setGoalsError' | 'setContextsError' | 'setCodeError';
  setDataKey: 'setDocsContent' | 'setTasks' | 'setGoals' | 'setContexts' | 'setCodeTasks';
  renderComponent: (props: RenderComponentProps) => React.ReactElement;
}

export const AI_REVIEW_MODE_CONFIG: Partial<Record<AIReviewMode, AIReviewModeConfig>> = {
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
        activeProject={props.activeProject}
        onBack={props.onBack}
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
        contexts={props.data as Array<{ filename: string; content: string }>}
        loading={props.loading}
        error={props.error}
        onBack={props.onBack}
        activeProject={props.activeProject as { id: string; name: string; path: string } | null}
      />
    ),
  }
};
