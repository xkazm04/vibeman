'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, AlertCircle, Code, Plus, Loader2 } from 'lucide-react';
import { Goal } from '../../../../../types';
import { getStatusInfo } from '../lib';
import { useActiveProjectStore } from '../../../../../stores/activeProjectStore';
import { useContextStore } from '../../../../../stores/contextStore';
import { UniversalModal } from '@/components/UniversalModal';
import { UniversalSelect } from '@/components/ui/UniversalSelect';
import { useSimpleErrorHandler } from '@/hooks/useErrorHandler';
import { InlineErrorDisplay } from '@/components/errors/ErrorBoundary';

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
      const response = await fetch('/api/claude-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: effectiveProjectPath,
          action: 'create-requirement',
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
        >
          <Code className="w-4 h-4" />
          Code
        </button>
      </div>

      {/* Goal Form */}
      {activeTab === 'goal' && (
        <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Field */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
            Title <span className="text-red-400">*</span>
          </label>
          <div className="relative group">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a clear and concise goal title..."
              className="w-full px-4 py-3 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40 
                       border border-slate-700/50 rounded-lg text-white placeholder-slate-400/60 
                       focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 
                       transition-all duration-300 hover:border-slate-600/50"
              autoFocus
            />
            {/* Subtle glow on focus */}
            <div className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
                 style={{
                   background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.05), transparent)',
                   filter: 'blur(8px)'
                 }}
            />
          </div>
          {!title.trim() && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 mt-2 text-sm text-slate-500"
            >
              <AlertCircle className="w-3 h-3" />
              <span>Title is required</span>
            </motion.div>
          )}
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
            Description <span className="text-slate-500">(Optional)</span>
          </label>
          <div className="relative group">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the goal, including specific objectives and success criteria..."
              rows={4}
              className="w-full px-4 py-3 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40 
                       border border-slate-700/50 rounded-lg text-white placeholder-slate-400/60 
                       focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 
                       transition-all duration-300 resize-none hover:border-slate-600/50 
                       custom-scrollbar"
            />
            <div className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
                 style={{
                   background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.05), transparent)',
                   filter: 'blur(8px)'
                 }}
            />
          </div>
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
          <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
            Initial Status
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['open', 'in_progress', 'done'] as const).map((statusOption) => {
              const statusInfo = getStatusInfo(statusOption);
              const isSelected = status === statusOption;
              
              return (
                <motion.button
                  key={statusOption}
                  type="button"
                  onClick={() => setStatus(statusOption)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-3 rounded-lg border text-sm font-medium transition-all duration-300 overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-800/30 via-slate-800/50 to-blue-800/30 border-cyan-500/50 text-cyan-100 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:bg-slate-700/50 hover:border-slate-600/50'
                  }`}
                >
                  {/* Subtle animated gradient for selected */}
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.3), transparent)'
                      }}
                      animate={{
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear'
                      }}
                    />
                  )}
                  <span className="relative z-10">{statusInfo.text}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700/30">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50
                     text-slate-300 rounded-lg transition-all duration-200 font-medium"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={!title.trim()}
            className="relative px-6 py-2.5 bg-gradient-to-r from-cyan-700/50 to-blue-700/50
                     hover:from-cyan-600/60 hover:to-blue-600/60 border border-cyan-600/30
                     rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 shadow-lg shadow-cyan-500/20 overflow-hidden group"
          >
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.2), transparent)'
              }}
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
            <span className="relative z-10">Add Goal</span>
          </motion.button>
        </div>
      </form>
      )}

      {/* Code Form */}
      {activeTab === 'code' && (
        <div className="space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
              Requirement Name <span className="text-red-400">*</span>
            </label>
            <div className="relative group">
              <input
                type="text"
                value={requirementName}
                onChange={(e) => setRequirementName(e.target.value)}
                placeholder="e.g., add-auth, fix-login-bug"
                className="w-full px-4 py-3 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40
                         border border-slate-700/50 rounded-lg text-white placeholder-slate-400/60
                         focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                         transition-all duration-300 hover:border-slate-600/50"
                disabled={isCreating}
                autoFocus
              />
              <div className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
                   style={{
                     background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.05), transparent)',
                     filter: 'blur(8px)'
                   }}
              />
            </div>
            {!requirementName.trim() && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 mt-2 text-sm text-slate-500"
              >
                <AlertCircle className="w-3 h-3" />
                <span>Requirement name is required</span>
              </motion.div>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
              Description <span className="text-red-400">*</span>
            </label>
            <div className="relative group">
              <textarea
                value={requirementDescription}
                onChange={(e) => setRequirementDescription(e.target.value)}
                placeholder="What should Claude Code do? Be specific about your requirements..."
                rows={6}
                className="w-full px-4 py-3 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40
                         border border-slate-700/50 rounded-lg text-white placeholder-slate-400/60
                         focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                         transition-all duration-300 resize-none hover:border-slate-600/50
                         custom-scrollbar"
                disabled={isCreating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey && !isCreating) {
                    handleCreateRequirement();
                  }
                }}
              />
              <div className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
                   style={{
                     background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.05), transparent)',
                     filter: 'blur(8px)'
                   }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-500">Press Ctrl+Enter to submit</p>
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
          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700/30">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50
                       text-slate-300 rounded-lg transition-all duration-200 font-medium"
              disabled={isCreating}
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleCreateRequirement}
              disabled={isCreating || !requirementName.trim() || !requirementDescription.trim()}
              className="relative px-6 py-2.5 bg-gradient-to-r from-purple-700/50 to-pink-700/50
                       hover:from-purple-600/60 hover:to-pink-600/60 border border-purple-600/30
                       rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 shadow-lg shadow-purple-500/20 overflow-hidden group"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.2), transparent)'
                    }}
                    animate={{
                      x: ['-100%', '100%']
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                  />
                  <Plus className="w-4 h-4 inline mr-2" />
                  <span className="relative z-10">Create Requirement</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      )}
    </UniversalModal>
  );
} 