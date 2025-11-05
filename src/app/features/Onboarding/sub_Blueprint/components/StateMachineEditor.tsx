'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, RotateCcw, AlertCircle, Check, GripVertical } from 'lucide-react';
import { useStateMachineStore } from '@/stores/stateMachineStore';
import { TECHNIQUE_GROUPS } from '../lib/defaultStateMachines';
import type { TechniqueGroup } from '../lib/stateMachineTypes';
import { useState } from 'react';

interface StateMachineEditorProps {
  projectType: string;
  onClose: () => void;
}

export default function StateMachineEditor({
  projectType,
  onClose,
}: StateMachineEditorProps) {
  const {
    editorConfig,
    editorIsDirty,
    editorValidationErrors,
    applyEditorAction,
    saveEditorChanges,
    discardEditorChanges,
  } = useStateMachineStore();

  const [draggedState, setDraggedState] = useState<string | null>(null);

  if (!editorConfig) return null;

  const handleSave = async () => {
    if (editorValidationErrors.length > 0) {
      alert('Cannot save: configuration has validation errors');
      return;
    }

    await saveEditorChanges();
    onClose();
  };

  const handleReset = () => {
    if (confirm('Reset to default configuration? This will discard all changes.')) {
      applyEditorAction({ type: 'RESET_TO_DEFAULT' });
    }
  };

  const handleToggleGroup = (group: TechniqueGroup) => {
    applyEditorAction({ type: 'TOGGLE_GROUP', group });
  };

  const handleToggleState = (stateId: string) => {
    applyEditorAction({ type: 'TOGGLE_STATE', stateId });
  };

  const handleDragStart = (stateId: string) => {
    setDraggedState(stateId);
  };

  const handleDragOver = (e: React.DragEvent, targetStateId: string) => {
    e.preventDefault();
    if (!draggedState || draggedState === targetStateId) return;

    const states = [...editorConfig.states];
    const draggedIndex = states.findIndex(s => s.id === draggedState);
    const targetIndex = states.findIndex(s => s.id === targetStateId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Swap order values
    const draggedOrder = states[draggedIndex].order;
    applyEditorAction({
      type: 'REORDER_STATE',
      stateId: draggedState,
      newOrder: states[targetIndex].order,
    });
    applyEditorAction({
      type: 'REORDER_STATE',
      stateId: targetStateId,
      newOrder: draggedOrder,
    });
  };

  const handleDragEnd = () => {
    setDraggedState(null);
  };

  // Group states by technique group
  const groupedStates = new Map<TechniqueGroup, typeof editorConfig.states>();
  editorConfig.states.forEach(state => {
    if (!groupedStates.has(state.group)) {
      groupedStates.set(state.group, []);
    }
    groupedStates.get(state.group)!.push(state);
  });

  // Sort states within each group
  groupedStates.forEach(states => {
    states.sort((a, b) => a.order - b.order);
  });

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
        data-testid="state-machine-editor-backdrop"
      />

      {/* Editor Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="bg-gradient-to-br from-gray-950 via-blue-950/30 to-gray-950 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 max-w-5xl w-full max-h-[90vh] overflow-hidden"
          data-testid="state-machine-editor-modal"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-light text-white tracking-wide">
                  Onboarding Flow Configurator
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Customize the onboarding wizard for {editorConfig.name}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {editorIsDirty && (
                  <span className="text-xs text-yellow-400 px-2 py-1 bg-yellow-400/10 rounded">
                    Unsaved changes
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                  data-testid="close-state-machine-editor"
                >
                  <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {editorValidationErrors.length > 0 && (
            <div className="mx-8 mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium">Configuration Errors</p>
                  <ul className="text-red-200/80 text-sm mt-2 space-y-1 list-disc list-inside">
                    {editorValidationErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-8 overflow-y-auto max-h-[calc(90vh-250px)]">
            {/* Technique Groups */}
            <div className="space-y-6">
              {TECHNIQUE_GROUPS.map(group => {
                const states = groupedStates.get(group.id) || [];
                if (states.length === 0) return null;

                const allEnabled = states.every(s => s.enabled);
                const Icon = group.icon;

                return (
                  <div
                    key={group.id}
                    className="border border-white/10 rounded-xl overflow-hidden"
                  >
                    {/* Group Header */}
                    <button
                      onClick={() => handleToggleGroup(group.id)}
                      className="w-full px-6 py-4 bg-black/30 hover:bg-black/40 transition-colors flex items-center justify-between"
                      data-testid={`toggle-group-${group.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 bg-gradient-to-br from-${group.color}-500/20 to-${group.color}-500/10 rounded-lg`}
                        >
                          <Icon className={`w-5 h-5 text-${group.color}-400`} />
                        </div>
                        <div className="text-left">
                          <p className="text-white font-medium">{group.label}</p>
                          <p className="text-gray-400 text-xs mt-0.5">
                            {group.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-400">
                          {states.filter(s => s.enabled).length} / {states.length} enabled
                        </span>
                        <div
                          className={`w-12 h-6 rounded-full transition-colors ${
                            allEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                          } relative`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              allEnabled ? 'translate-x-6' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Group States */}
                    <div className="divide-y divide-white/5">
                      {states.map(state => {
                        const StateIcon = state.icon;
                        return (
                          <div
                            key={state.id}
                            draggable
                            onDragStart={() => handleDragStart(state.id)}
                            onDragOver={(e) => handleDragOver(e, state.id)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors cursor-move ${
                              draggedState === state.id ? 'opacity-50' : ''
                            }`}
                            data-testid={`state-item-${state.id}`}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <GripVertical className="w-4 h-4 text-gray-600" />
                              <div
                                className={`p-2 bg-gradient-to-br from-${state.color}-500/20 to-${state.color}-500/10 rounded-lg`}
                              >
                                <StateIcon className={`w-4 h-4 text-${state.color}-400`} />
                              </div>
                              <div className="flex-1">
                                <p className="text-white text-sm font-medium">{state.label}</p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                  {state.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4">
                              {state.estimatedTime && (
                                <span className="text-xs text-gray-500">
                                  ~{state.estimatedTime}
                                </span>
                              )}
                              {state.requiredForCompletion && (
                                <span className="text-xs text-yellow-400 px-2 py-1 bg-yellow-400/10 rounded">
                                  Required
                                </span>
                              )}
                              <button
                                onClick={() => handleToggleState(state.id)}
                                className={`w-10 h-6 rounded-full transition-colors ${
                                  state.enabled ? 'bg-cyan-500' : 'bg-gray-600'
                                } relative`}
                                data-testid={`toggle-state-${state.id}`}
                              >
                                <div
                                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                    state.enabled ? 'translate-x-4' : ''
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-blue-500/5">
            <div className="flex items-center justify-between">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg transition-colors flex items-center space-x-2"
                data-testid="reset-to-default-btn"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Default</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  onClick={discardEditorChanges}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg transition-colors"
                  data-testid="discard-changes-btn"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={editorValidationErrors.length > 0}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none flex items-center space-x-2"
                  data-testid="save-config-btn"
                >
                  {editorValidationErrors.length === 0 ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Configuration</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>Cannot Save (Errors)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
