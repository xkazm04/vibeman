'use client';
import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { Goal } from '../../../types';
import { getStatusConfig, validateGoalData } from './lib';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';

// Context type (matching the API response)
interface Context {
  id: string;
  projectId: string;
  groupId: string | null;
  name: string;
  description?: string;
  filePaths: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface GoalsAddModalContentProps {
  onSubmit: (goal: Omit<Goal, 'id' | 'order' | 'projectId'>) => void;
  onClose: () => void;
}

export default function GoalsAddModalContent({ onSubmit, onClose }: GoalsAddModalContentProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Goal['status']>('open');
  const [contextId, setContextId] = useState<string>('');
  
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const [availableContexts, setAvailableContexts] = useState<Context[]>([]);
  const [loadingContexts, setLoadingContexts] = useState(false);

  // Fetch contexts when component mounts
  useEffect(() => {
    if (activeProject?.id) {
      setLoadingContexts(true);
      
      // Fetch contexts via API
      fetch(`/api/contexts?projectId=${encodeURIComponent(activeProject.id)}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch contexts');
          }
          return response.json();
        })
        .then((data) => {
          if (data.success && data.data?.contexts) {
            setAvailableContexts(data.data.contexts);
          } else {
            setAvailableContexts([]);
          }
          setLoadingContexts(false);
        })
        .catch((error) => {
          console.error('Failed to fetch contexts:', error);
          setAvailableContexts([]);
          setLoadingContexts(false);
        });
    }
  }, [activeProject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const goalData = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      contextId: contextId || undefined
    };

    if (validateGoalData(goalData)) {
      onSubmit(goalData);
      // Reset form
      setTitle('');
      setDescription('');
      setStatus('open');
      setContextId('');
      onClose();
    }
  };

  const isValid = validateGoalData({ title });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title Field */}
      <div>
        <label className="block text-sm font-medium text-white/90 mb-3 tracking-wide">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a clear and concise goal title..."
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
          autoFocus
        />
        {!isValid && (
          <div className="flex items-center space-x-2 mt-2 text-sm text-slate-500">
            <AlertCircle className="w-3 h-3" />
            <span>Title is required</span>
          </div>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label className="block text-sm font-medium text-white/90 mb-3 tracking-wide">
          Description <span className="text-slate-500">(Optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide a detailed description of the goal, including specific objectives and success criteria..."
          rows={6}
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
        />
      </div>

      {/* Context Selection */}
      <div>
        <label className="block text-sm font-medium text-white/90 mb-3 tracking-wide">
          Context <span className="text-slate-500">(Optional)</span>
        </label>
        <select
          value={contextId}
          onChange={(e) => setContextId(e.target.value)}
          disabled={loadingContexts || availableContexts.length === 0}
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {loadingContexts ? 'Loading contexts...' : availableContexts.length === 0 ? 'No contexts available' : 'No context selected'}
          </option>
          {availableContexts.map((context) => (
            <option key={context.id} value={context.id}>
              {context.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-slate-500">
          Associate this goal with a specific context for better organization
        </p>
      </div>

      {/* Status Selection */}
      <div>
        <label className="block text-sm font-medium text-white/90 mb-3 tracking-wide">
          Initial Status
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['open', 'in_progress', 'done'] as const).map((statusOption) => {
            const statusConfig = getStatusConfig(statusOption);
            const StatusIcon = statusConfig.icon;
            const isSelected = status === statusOption;
            
            return (
              <button
                key={statusOption}
                type="button"
                onClick={() => setStatus(statusOption)}
                className={`p-4 rounded-lg border text-sm font-medium transition-all ${
                  isSelected
                    ? `${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.color}`
                    : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <StatusIcon className="w-5 h-5" />
                  <span>{statusConfig.text}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/30">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 text-slate-300 rounded-lg transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValid}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600/50 to-slate-600/50 hover:from-blue-500/60 hover:to-slate-500/60 border border-blue-500/30 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Goal</span>
        </button>
      </div>
    </form>
  );
}
