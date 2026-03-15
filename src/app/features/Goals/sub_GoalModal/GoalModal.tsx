'use client';
import React, { useState, useEffect } from 'react';
import { Target, Code } from 'lucide-react';
import { Goal } from '../../../../types';
import { useClientProjectStore } from '../../../../stores/clientProjectStore';
import { useContextStore } from '../../../../stores/contextStore';
import { useSimpleErrorHandler } from '@/hooks/useErrorHandler';
import GoalModalShell from './components/GoalModalShell';
import GoalForm from './components/GoalForm';
import CodeRequirementForm from './components/CodeRequirementForm';
import GoalsDetailModalContent from './components/GoalsDetailModalContent';

interface Context {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface GoalModalProps {
  mode: 'add' | 'detail';
  isOpen: boolean;
  onClose: () => void;

  // Props for 'add' mode
  onSubmit?: (goal: Omit<Goal, 'id' | 'order' | 'projectId'>) => void;
  projectPath?: string;
  onRequirementCreated?: () => void;

  // Props for 'detail' mode
  goal?: Goal | null;
  onSave?: (goalId: string, updates: Partial<Goal>) => Promise<Goal | null>;
  projectId?: string | null;
}

type TabType = 'goal' | 'code';

/**
 * Unified GoalModal: directly renders add form or detail view inside GoalModalShell.
 * No intermediate wrapper component — two layers max.
 */
export default function GoalModal({
  mode,
  isOpen,
  onClose,
  onSubmit,
  projectPath,
  onRequirementCreated,
  goal,
  onSave,
  projectId,
}: GoalModalProps) {
  const { activeProject } = useClientProjectStore();
  const { selectedContextIds } = useContextStore();

  // Add-mode state
  const [activeTab, setActiveTab] = useState<TabType>('goal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Goal['status']>('open');
  const [contextId, setContextId] = useState<string>('');
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loadingContexts, setLoadingContexts] = useState(false);
  const [requirementName, setRequirementName] = useState('');
  const [requirementDescription, setRequirementDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { error, isError, handleError, clearError } = useSimpleErrorHandler('GoalModal-Code');

  useEffect(() => {
    if (mode === 'add' && activeProject?.id && isOpen) {
      setLoadingContexts(true);
      fetch(`/api/contexts?projectId=${activeProject.id}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch contexts');
          return res.json();
        })
        .then(data => {
          setContexts(data?.data?.contexts || []);
        })
        .catch(() => {
          setContexts([]);
        })
        .finally(() => {
          setLoadingContexts(false);
        });
    }
  }, [mode, activeProject?.id, isOpen]);

  useEffect(() => {
    if (mode === 'add' && isOpen && selectedContextIds.size > 0) {
      setContextId(Array.from(selectedContextIds)[0]);
    }
  }, [mode, isOpen, selectedContextIds]);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setStatus('open');
    setContextId('');
    setRequirementName('');
    setRequirementDescription('');
    setActiveTab('goal');
    clearError();
    onClose();
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && onSubmit) {
      onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        contextId: contextId || undefined,
      });
      setTitle('');
      setDescription('');
      setStatus('open');
      setContextId('');
      onClose();
    }
  };

  const handleCreateRequirement = async () => {
    if (!requirementName.trim() || !requirementDescription.trim()) {
      handleError(new Error('Both name and description are required'));
      return;
    }
    const effectiveProjectPath = projectPath || activeProject?.path;
    if (!effectiveProjectPath) {
      handleError(new Error('No project path available'));
      return;
    }
    setIsCreating(true);
    clearError();
    try {
      const response = await fetch('/api/claude-code/requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: effectiveProjectPath,
          requirementName,
          content: requirementDescription,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        const err = new Error(data.error || 'Failed to create requirement');
        (err as any).status = response.status;
        throw err;
      }
      setRequirementName('');
      setRequirementDescription('');
      if (onRequirementCreated) onRequirementCreated();
      handleClose();
    } catch (err) {
      handleError(err);
    } finally {
      setIsCreating(false);
    }
  };

  if (mode === 'add') {
    return (
      <GoalModalShell
        isOpen={isOpen}
        onClose={handleClose}
        title={activeTab === 'goal' ? 'Add New Goal' : 'Add Code Requirement'}
        subtitle={activeTab === 'goal' ? 'Define a new objective for your project' : 'Create a new Claude Code requirement'}
        icon={activeTab === 'goal' ? Target : Code}
      >
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <button
            type="button"
            onClick={() => setActiveTab('goal')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 ${
              activeTab === 'goal'
                ? 'bg-gradient-to-r from-cyan-700/50 to-blue-700/50 text-white shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
            }`}
            data-testid="goal-tab-btn"
          >
            <Target className="w-4 h-4" />
            Goal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 ${
              activeTab === 'code'
                ? 'bg-gradient-to-r from-purple-700/50 to-pink-700/50 text-white shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
            }`}
            data-testid="code-tab-btn"
          >
            <Code className="w-4 h-4" />
            Code
          </button>
        </div>

        {activeTab === 'goal' && (
          <GoalForm
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            status={status}
            setStatus={setStatus}
            contextId={contextId}
            setContextId={setContextId}
            contexts={contexts}
            loadingContexts={loadingContexts}
            onSubmit={handleGoalSubmit}
            onClose={handleClose}
          />
        )}

        {activeTab === 'code' && (
          <CodeRequirementForm
            requirementName={requirementName}
            setRequirementName={setRequirementName}
            requirementDescription={requirementDescription}
            setRequirementDescription={setRequirementDescription}
            isCreating={isCreating}
            isError={isError}
            error={error}
            clearError={clearError}
            onClose={handleClose}
            onSubmit={handleCreateRequirement}
          />
        )}
      </GoalModalShell>
    );
  }

  if (mode === 'detail' && goal) {
    return (
      <GoalModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Goal Details"
        subtitle="View goal information"
        icon={Target}
        iconBgColor="from-blue-600/20 to-slate-600/20"
        iconColor="text-blue-400"
        maxWidth="max-w-6xl"
      >
        <GoalsDetailModalContent
          goal={goal}
          projectId={projectId || null}
          onSave={onSave}
          onClose={onClose}
        />
      </GoalModalShell>
    );
  }

  return null;
}
