'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  GraduationCap,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import type { AssignedWorkItem } from '@/app/db/models/onboarding-accelerator.types';

interface CreatePathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { developerName: string; assignedWork: AssignedWorkItem[] }) => void;
  isLoading?: boolean;
}

export const CreatePathModal: React.FC<CreatePathModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}) => {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  const [developerName, setDeveloperName] = useState('');
  const [assignedWork, setAssignedWork] = useState<AssignedWorkItem[]>([]);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkType, setNewWorkType] = useState<AssignedWorkItem['type']>('feature');
  const [newWorkDescription, setNewWorkDescription] = useState('');

  const handleAddWork = () => {
    if (!newWorkTitle.trim()) return;

    setAssignedWork([
      ...assignedWork,
      {
        title: newWorkTitle.trim(),
        type: newWorkType,
        description: newWorkDescription.trim() || undefined,
      },
    ]);

    setNewWorkTitle('');
    setNewWorkDescription('');
  };

  const handleRemoveWork = (index: number) => {
    setAssignedWork(assignedWork.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!developerName.trim()) return;
    onCreate({
      developerName: developerName.trim(),
      assignedWork,
    });
  };

  const workTypeColors: Record<string, string> = {
    feature: 'bg-blue-500/20 text-blue-400',
    bugfix: 'bg-red-500/20 text-red-400',
    refactor: 'bg-purple-500/20 text-purple-400',
    documentation: 'bg-green-500/20 text-green-400',
    other: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-gray-900 border border-gray-700/50 rounded-xl w-full max-w-xl max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <GraduationCap className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Create Learning Path</h2>
                  <p className="text-sm text-gray-400">Set up personalized onboarding</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                data-testid="close-create-path-modal"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Developer Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Developer Name</label>
                <input
                  type="text"
                  value={developerName}
                  onChange={(e) => setDeveloperName(e.target.value)}
                  placeholder="Enter developer name..."
                  className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  data-testid="developer-name-input"
                />
              </div>

              {/* Assigned Work */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Assigned Work (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Add tasks or features the developer will be working on. The learning path will prioritize relevant code areas.
                </p>

                {/* Existing work items */}
                {assignedWork.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {assignedWork.map((work, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${workTypeColors[work.type]}`}>
                            {work.type}
                          </span>
                          <span className="text-white text-sm">{work.title}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveWork(index)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                          data-testid={`remove-work-item-${index}`}
                        >
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new work item */}
                <div className="space-y-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newWorkTitle}
                      onChange={(e) => setNewWorkTitle(e.target.value)}
                      placeholder="Task title..."
                      className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                      data-testid="new-work-title-input"
                    />
                    <select
                      value={newWorkType}
                      onChange={(e) => setNewWorkType(e.target.value as AssignedWorkItem['type'])}
                      className="px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      data-testid="new-work-type-select"
                    >
                      <option value="feature">Feature</option>
                      <option value="bugfix">Bugfix</option>
                      <option value="refactor">Refactor</option>
                      <option value="documentation">Documentation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={newWorkDescription}
                    onChange={(e) => setNewWorkDescription(e.target.value)}
                    placeholder="Description (optional)..."
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                    data-testid="new-work-description-input"
                  />
                  <button
                    onClick={handleAddWork}
                    disabled={!newWorkTitle.trim()}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white text-sm flex items-center justify-center gap-2 hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="add-work-item-btn"
                  >
                    <Plus className="w-4 h-4" />
                    Add Task
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700/50">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
                data-testid="cancel-create-path-btn"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={!developerName.trim() || isLoading}
                className={`px-4 py-2 rounded-lg bg-gradient-to-r ${colors.primary} text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid="create-path-submit-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create & Generate Path
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
