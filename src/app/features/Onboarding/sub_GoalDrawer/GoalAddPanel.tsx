'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { Target, Code, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { Goal } from '@/types';
import { getStatusInfo } from '@/app/features/Goals/sub_GoalModal/lib';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useContextStore } from '@/stores/contextStore';
import { UniversalSelect } from '@/components/ui/UniversalSelect';
import { useSimpleErrorHandler } from '@/hooks/useErrorHandler';
import { InlineErrorDisplay } from '@/components/errors/ErrorBoundary';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface Context {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface GoalAddPanelProps {
  projectId: string;
  onSubmit: (goal: Omit<Goal, 'id' | 'order' | 'projectId'>) => void;
  onClose: () => void;
  projectPath?: string;
  onRequirementCreated?: () => void;
}

type TabType = 'goal' | 'code';

export default function GoalAddPanel({
  projectId,
  onSubmit,
  onClose,
  projectPath,
  onRequirementCreated
}: GoalAddPanelProps) {
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
  } = useSimpleErrorHandler('GoalAddPanel-Code');

  // Fetch contexts on mount
  useEffect(() => {
    if (projectId) {
      setLoadingContexts(true);
      fetch(`/api/contexts?projectId=${projectId}`)
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
  }, [projectId]);

  // Pre-select context from store
  useEffect(() => {
    if (selectedContextIds.size > 0) {
      const firstSelectedId = Array.from(selectedContextIds)[0];
      setContextId(firstSelectedId);
    }
  }, [selectedContextIds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        contextId: contextId || undefined
      });
      // Reset form
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

      // Close panel
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            {activeTab === 'goal' ? (
              <Target className="w-5 h-5 text-cyan-400" />
            ) : (
              <Code className="w-5 h-5 text-purple-400" />
            )}
          </div>
          <h2
            className={`${caveat.className} text-4xl text-cyan-200/90 font-semibold`}
            style={{ textShadow: '0 2px 10px rgba(34, 211, 238, 0.5)' }}
          >
            {activeTab === 'goal' ? 'Add New Goal' : 'Add Code Requirement'}
          </h2>
        </div>
        <p className="text-sm text-gray-400 font-sans ml-14">
          {activeTab === 'goal'
            ? 'Define a new objective for your project'
            : 'Create a new Claude Code requirement'}
        </p>
      </motion.div>

      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.2 }}
        className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mb-6"
      />

      {/* Tab Switcher */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2 mb-6 p-1 bg-gray-800/50 rounded-lg border border-gray-700/50"
      >
        <button
          type="button"
          onClick={() => setActiveTab('goal')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 ${
            activeTab === 'goal'
              ? 'bg-gradient-to-r from-cyan-700/50 to-blue-700/50 text-white shadow-lg shadow-cyan-500/20'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
          }`}
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
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
          }`}
        >
          <Code className="w-4 h-4" />
          Code
        </button>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {/* Goal Form */}
        {activeTab === 'goal' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3 tracking-wide">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a clear and concise goal title..."
                className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/50 rounded-lg text-white placeholder-gray-400/60
                         focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20
                         transition-all duration-300 hover:border-gray-600/50"
                autoFocus
              />
              {!title.trim() && (
                <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                  <AlertCircle className="w-3 h-3" />
                  <span>Title is required</span>
                </div>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3 tracking-wide">
                Description <span className="text-gray-500">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of the goal..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/50 rounded-lg text-white placeholder-gray-400/60
                         focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20
                         transition-all duration-300 resize-none hover:border-gray-600/50"
              />
            </div>

            {/* Context Selection */}
            <UniversalSelect
              label="Context"
              value={contextId}
              onChange={setContextId}
              options={contexts.map(ctx => ({
                value: ctx.id,
                label: ctx.name
              }))}
              placeholder="No specific context"
              isLoading={loadingContexts}
              helperText={loadingContexts ? 'Loading contexts...' : undefined}
              variant="cyber"
            />

            {/* Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3 tracking-wide">
                Initial Status
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['open', 'in_progress', 'done'] as const).map((statusOption) => {
                  const statusInfo = getStatusInfo(statusOption);
                  const isSelected = status === statusOption;

                  return (
                    <button
                      key={statusOption}
                      type="button"
                      onClick={() => setStatus(statusOption)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all duration-300 ${
                        isSelected
                          ? 'bg-cyan-800/30 border-cyan-500/50 text-cyan-100 shadow-lg shadow-cyan-500/20'
                          : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:bg-gray-700/50 hover:border-gray-600/50'
                      }`}
                    >
                      {statusInfo.text}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700/30">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50
                         text-gray-300 rounded-lg transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-700/50 to-blue-700/50
                         hover:from-cyan-600/60 hover:to-blue-600/60 border border-cyan-600/30
                         rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 shadow-lg shadow-cyan-500/20"
              >
                Add Goal
              </button>
            </div>
          </form>
        )}

        {/* Code Form */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3 tracking-wide">
                Requirement Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={requirementName}
                onChange={(e) => setRequirementName(e.target.value)}
                placeholder="e.g., add-auth, fix-login-bug"
                className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/50 rounded-lg text-white placeholder-gray-400/60
                         focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                         transition-all duration-300 hover:border-gray-600/50"
                disabled={isCreating}
                autoFocus
              />
              {!requirementName.trim() && (
                <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                  <AlertCircle className="w-3 h-3" />
                  <span>Requirement name is required</span>
                </div>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3 tracking-wide">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={requirementDescription}
                onChange={(e) => setRequirementDescription(e.target.value)}
                placeholder="What should Claude Code do? Be specific about your requirements..."
                rows={6}
                className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/50 rounded-lg text-white placeholder-gray-400/60
                         focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                         transition-all duration-300 resize-none hover:border-gray-600/50"
                disabled={isCreating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey && !isCreating) {
                    handleCreateRequirement();
                  }
                }}
              />
              <p className="mt-2 text-sm text-gray-500">Press Ctrl+Enter to submit</p>
            </div>

            {/* Error Display */}
            {isError && error && (
              <div className="mt-2">
                <InlineErrorDisplay
                  error={error}
                  onDismiss={clearError}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700/30">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50
                         text-gray-300 rounded-lg transition-all duration-200 font-medium"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateRequirement}
                disabled={isCreating || !requirementName.trim() || !requirementDescription.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-700/50 to-pink-700/50
                         hover:from-purple-600/60 hover:to-pink-600/60 border border-purple-600/30
                         rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 shadow-lg shadow-purple-500/20"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 inline mr-2" />
                    Create Requirement
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
