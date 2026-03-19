'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { transition } from '@/lib/motion';
import { X, Save, Zap } from 'lucide-react';
import {
  fetchAutoAssignConfig,
  saveAutoAssignConfig,
  DEFAULT_AUTO_ASSIGN_CONFIG,
  type AutoAssignConfig,
} from '@/lib/autoAssignConfig';

interface AutoAssignSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AutoAssignSettingsModal({ isOpen, onClose }: AutoAssignSettingsModalProps) {
  const [config, setConfig] = useState<AutoAssignConfig>(DEFAULT_AUTO_ASSIGN_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !loaded) {
      fetchAutoAssignConfig().then((c) => {
        setConfig(c);
        setLoaded(true);
      });
    }
  }, [isOpen, loaded]);

  // Reset loaded state when closed
  useEffect(() => {
    if (!isOpen) setLoaded(false);
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    await saveAutoAssignConfig(config);
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={transition.normal}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] bg-gray-900 border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700/40 bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-200">Auto-Assign Settings</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-5">
              {/* Gemini Rule */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Gemini Rule
                  </label>
                  <button
                    onClick={() => setConfig({ ...config, geminiRule: { ...config.geminiRule, enabled: !config.geminiRule.enabled } })}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      config.geminiRule.enabled ? 'bg-purple-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      config.geminiRule.enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {config.geminiRule.enabled && (
                  <div className="space-y-2 pl-2 border-l-2 border-purple-500/30">
                    <p className="text-2xs text-gray-500">
                      Route low-effort, low-risk tasks to a different provider.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-2xs text-gray-400 block mb-1">Max Effort</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={config.geminiRule.conditions?.effort ?? 1}
                          onChange={(e) => setConfig({
                            ...config,
                            geminiRule: {
                              ...config.geminiRule,
                              conditions: {
                                effort: Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                                risk: config.geminiRule.conditions?.risk ?? 1,
                              },
                            },
                          })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-purple-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-2xs text-gray-400 block mb-1">Max Risk</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={config.geminiRule.conditions?.risk ?? 1}
                          onChange={(e) => setConfig({
                            ...config,
                            geminiRule: {
                              ...config.geminiRule,
                              conditions: {
                                effort: config.geminiRule.conditions?.effort ?? 1,
                                risk: Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                              },
                            },
                          })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-purple-500/50 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-2xs text-gray-400 block mb-1">Provider Override</label>
                      <select
                        value={config.geminiRule.provider || 'gemini'}
                        onChange={(e) => setConfig({
                          ...config,
                          geminiRule: { ...config.geminiRule, provider: e.target.value as typeof config.geminiRule.provider },
                        })}
                        className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-purple-500/50 focus:outline-none"
                      >
                        <option value="claude">Claude</option>
                        <option value="gemini">Gemini</option>
                        <option value="copilot">Copilot</option>
                        <option value="ollama">Ollama</option>
                      </select>
                    </div>
                  </div>
                )}
              </section>

              {/* Separator */}
              <div className="border-t border-gray-700/30" />

              {/* Default Rule */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Default Rule
                  </label>
                  <button
                    onClick={() => setConfig({ ...config, defaultRule: { ...config.defaultRule, enabled: !config.defaultRule.enabled } })}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      config.defaultRule.enabled ? 'bg-cyan-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      config.defaultRule.enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <p className="text-2xs text-gray-500">
                  Assign remaining tasks (not matched by gemini rule) to free sessions using their current provider.
                </p>
              </section>

              {/* Separator */}
              <div className="border-t border-gray-700/30" />

              {/* General */}
              <section className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  General
                </label>

                {/* Consolidate before assign */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    <label className="text-2xs text-gray-400 block">Consolidate before assign</label>
                    <p className="text-2xs text-gray-500">
                      Aggregate same-role idea files across contexts before distributing to sessions.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, consolidateBeforeAssign: !config.consolidateBeforeAssign })}
                    className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                      config.consolidateBeforeAssign ? 'bg-purple-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      config.consolidateBeforeAssign ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="text-2xs text-gray-400 block mb-1">Max Tasks per Session</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={config.maxTasksPerSession}
                    onChange={(e) => setConfig({
                      ...config,
                      maxTasksPerSession: Math.max(1, Math.min(50, Number(e.target.value) || 10)),
                    })}
                    className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-purple-500/50 focus:outline-none"
                  />
                  <p className="text-2xs text-gray-500 mt-1">
                    When more tasks exceed this limit, they split into the next free session.
                  </p>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-700/40 bg-gray-800/30">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded transition-colors disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
