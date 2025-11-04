import React from 'react';
import { AIReviewMode } from '@/lib/api/aiProjectReviewApi';
import { AIDocsDisplay } from '../sub_ScanHigh';
import { ContextResultDisplay } from '../Context';

interface RenderComponentProps {
  data: unknown;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  previewMode?: boolean;
  onPreviewModeChange?: (mode: boolean) => void;
  onContentChange?: (content: string) => void;
  activeProject: unknown;
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
  }
};
