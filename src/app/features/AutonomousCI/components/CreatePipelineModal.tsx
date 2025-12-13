'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitBranch, Clock, Zap, Play } from 'lucide-react';
import type { PipelineTriggerType } from '@/app/db/models/autonomous-ci.types';

interface CreatePipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description?: string;
    triggerType: PipelineTriggerType;
    scheduleCron?: string;
  }) => void;
  isLoading?: boolean;
}

export default function CreatePipelineModal({
  isOpen,
  onClose,
  onCreate,
  isLoading,
}: CreatePipelineModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<PipelineTriggerType>('manual');
  const [scheduleCron, setScheduleCron] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      triggerType,
      scheduleCron: triggerType === 'on_schedule' ? scheduleCron : undefined,
    });
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTriggerType('manual');
    setScheduleCron('');
  };

  const triggerOptions: Array<{
    value: PipelineTriggerType;
    label: string;
    icon: React.ElementType;
    description: string;
  }> = [
    {
      value: 'manual',
      label: 'Manual',
      icon: Play,
      description: 'Run builds manually when needed',
    },
    {
      value: 'on_push',
      label: 'On Push',
      icon: GitBranch,
      description: 'Run automatically on git push',
    },
    {
      value: 'on_schedule',
      label: 'Scheduled',
      icon: Clock,
      description: 'Run on a schedule (cron)',
    },
    {
      value: 'auto',
      label: 'Auto (AI)',
      icon: Zap,
      description: 'AI decides when to run',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50"
            data-testid="create-pipeline-modal"
          >
            <div className="bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                    <GitBranch className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Create Pipeline</h2>
                    <p className="text-xs text-gray-400">Configure a new CI pipeline</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  data-testid="close-modal-btn"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Pipeline Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Main Build Pipeline"
                    className="w-full px-4 py-2.5 rounded-lg
                      bg-white/5 border border-white/10
                      text-white placeholder-gray-500
                      focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30
                      transition-colors"
                    data-testid="pipeline-name-input"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this pipeline do?"
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg
                      bg-white/5 border border-white/10
                      text-white placeholder-gray-500
                      focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30
                      transition-colors resize-none"
                    data-testid="pipeline-description-input"
                  />
                </div>

                {/* Trigger Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Trigger Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {triggerOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTriggerType(option.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          triggerType === option.value
                            ? 'bg-amber-500/20 border-amber-500/50'
                            : 'bg-white/5 border-white/10 hover:bg-white/8'
                        }`}
                        data-testid={`trigger-${option.value}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <option.icon
                            className={`w-4 h-4 ${
                              triggerType === option.value ? 'text-amber-400' : 'text-gray-400'
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              triggerType === option.value ? 'text-amber-400' : 'text-gray-300'
                            }`}
                          >
                            {option.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule Cron (conditional) */}
                {triggerType === 'on_schedule' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Cron Schedule
                    </label>
                    <input
                      type="text"
                      value={scheduleCron}
                      onChange={(e) => setScheduleCron(e.target.value)}
                      placeholder="0 0 * * * (daily at midnight)"
                      className="w-full px-4 py-2.5 rounded-lg
                        bg-white/5 border border-white/10
                        text-white placeholder-gray-500 font-mono text-sm
                        focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30
                        transition-colors"
                      data-testid="pipeline-cron-input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: minute hour day month weekday
                    </p>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/10 transition-colors"
                    data-testid="cancel-create-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || isLoading}
                    className="px-6 py-2 rounded-lg
                      bg-gradient-to-r from-amber-500 to-orange-500
                      hover:from-amber-600 hover:to-orange-600
                      text-white font-medium
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all"
                    data-testid="submit-create-btn"
                  >
                    {isLoading ? 'Creating...' : 'Create Pipeline'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
