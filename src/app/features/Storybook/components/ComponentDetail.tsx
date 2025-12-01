'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ComponentMatch } from '../lib/types';
import { FileCode, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ComponentDetailProps {
  component: ComponentMatch | null;
}

export function ComponentDetail({ component }: ComponentDetailProps) {
  const [copied, setCopied] = useState(false);

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="bg-gray-900/50 rounded-xl border border-white/10 h-[500px] flex flex-col"
      data-testid="component-detail"
    >
      <div className="p-4 border-b border-white/10">
        <h3 className="font-semibold text-white">Details</h3>
      </div>

      <AnimatePresence mode="wait">
        {component ? (
          <motion.div
            key={component.storybookComponent?.path || component.vibemanComponent?.path || 'detail'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 p-4 overflow-y-auto"
          >
            {/* Storybook Component */}
            {component.storybookComponent && (
              <div className="mb-4" data-testid="detail-storybook-section">
                <div className="text-xs text-gray-500 uppercase mb-2">
                  Storybook
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="font-medium text-white">
                    {component.storybookComponent.name}
                  </div>
                  <button
                    onClick={() => copyPath(component.storybookComponent!.path)}
                    className="text-xs text-gray-400 flex items-center gap-1 mt-1 hover:text-cyan-400 transition-colors"
                    data-testid="copy-storybook-path-btn"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span className="truncate max-w-[180px]">{component.storybookComponent.path}</span>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {component.storybookComponent.exports.map(exp => (
                      <span key={exp} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Vibeman Component */}
            {component.vibemanComponent && (
              <div className="mb-4" data-testid="detail-vibeman-section">
                <div className="text-xs text-gray-500 uppercase mb-2">
                  Vibeman
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="font-medium text-white">
                    {component.vibemanComponent.name}
                  </div>
                  <button
                    onClick={() => copyPath(component.vibemanComponent!.path)}
                    className="text-xs text-gray-400 flex items-center gap-1 mt-1 hover:text-cyan-400 transition-colors"
                    data-testid="copy-vibeman-path-btn"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span className="truncate max-w-[180px]">{component.vibemanComponent.path}</span>
                  </button>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      {component.vibemanComponent.lineCount} lines
                    </span>
                    {component.vibemanComponent.hasExamples && (
                      <span className="text-xs text-purple-400">Has examples</span>
                    )}
                  </div>
                  {component.vibemanComponent.exports.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {component.vibemanComponent.exports.map(exp => (
                        <span key={exp} className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs rounded">
                          {exp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {component.status === 'missing' && (
                <button
                  className="w-full px-3 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors"
                  data-testid="create-component-btn"
                >
                  Create Component
                </button>
              )}
              {component.status === 'unique' && (
                <button
                  className="w-full px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 transition-colors"
                  data-testid="add-to-storybook-btn"
                >
                  Add to Storybook
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center text-gray-500"
          >
            <div className="text-center">
              <FileCode className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a component</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
