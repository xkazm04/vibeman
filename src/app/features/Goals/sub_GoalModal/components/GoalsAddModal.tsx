'use client';

import React, { useState, useEffect } from 'react';
import { Target, Code } from 'lucide-react';
import { Goal } from '../../../../../types';
import { useActiveProjectStore } from '../../../../../stores/activeProjectStore';
import { useContextStore } from '../../../../../stores/contextStore';
import { UniversalModal } from '@/components/UniversalModal';
import { useSimpleErrorHandler } from '@/hooks/useErrorHandler';
import GoalForm from './GoalForm';
import CodeRequirementForm from './CodeRequirementForm';

// Context interface (matches API response)
interface Context {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface GoalsAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: Omit<Goal, 'id' | 'order' | 'projectId'>) => void;
  projectPath?: string;
  onRequirementCreated?: () => void;
}

type TabType = 'goal' | 'code';

export default function GoalsAddModal({ isOpen, onClose, onSubmit, projectPath, onRequirementCreated }: GoalsAddModalProps) {
  const { activeProject } = useActiveProjectStore();
  const { selectedContextIds } = useContextStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('goal');

  // Goal form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Goal['status']>('open');
  const [contextId, setContextId] = useState<string>('');
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loadingContexts, setLoadingContexts] = useState(false);

  // Code requirement states
  const [requirementName, setRequirementName] = useState('');
  const [requirementDescription, setRequirementDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Error handling for code tab
  const {
    error,
    isError,
    handleError,
    clearError,
  } = useSimpleErrorHandler('GoalsAddModal-Code');

  // Fetch contexts when activeProject changes
  useEffect(() => {
    if (activeProject?.id && isOpen) {
      setLoadingContexts(true);
      fetch(`/api/contexts?projectId=${activeProject.id}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch contexts');
          return res.json();
        })
        .then(data => {
          // API returns { success, data: { contexts: [...], groups: [...] } }
          setContexts(data?.data?.contexts || []);
        })
        .catch(() => {
          setContexts([]);
        })
        .finally(() => {
          setLoadingContexts(false);
        });
    }
  }, [activeProject?.id, isOpen]);

  // Pre-select context from store when modal opens
  useEffect(() => {
    if (isOpen && selectedContextIds.size > 0) {
      const firstSelectedId = Array.from(selectedContextIds)[0];
      setContextId(firstSelectedId);
    }
  }, [isOpen, selectedContextIds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        contextId: contextId || undefined
      });
      setTitle('');
      setDescription('');
      setStatus('open');
      setContextId('');
      onClose();
    }
  };

  const handleClose = () => {
    // Reset goal form
    setTitle('');
    setDescription('');
    setStatus('open');
    setContextId('');
    // Reset code form
    setRequirementName('');
    setRequirementDescription('');
    clearError();
    // Reset tab
    setActiveTab('goal');
    onClose();
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
          requirementName: requirementName,
          content: requirementDescription,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        const error = new Error(data.error || 'Failed to create requirement');
        (error as any).status = response.status;
        throw error;
      }

      // Reset form
      setRequirementName('');
      setRequirementDescription('');

      // Call callback if provided
      if (onRequirementCreated) {
        onRequirementCreated();
      }

      // Close modal
      handleClose();
    } catch (err) {
      handleError(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={handleClose}
      title={activeTab === 'goal' ? 'Add New Goal' : 'Add Code Requirement'}
      subtitle={activeTab === 'goal' ? 'Define a new objective for your project' : 'Create a new Claude Code requirement'}
      icon={activeTab === 'goal' ? Target : Code}
      iconBgColor="from-cyan-800/60 to-blue-900/60"
      iconColor="text-cyan-300"
      maxWidth="max-w-2xl"
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

      {/* Goal Form */}
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
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      )}

      {/* Code Form */}
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
    </UniversalModal>
  );
}
