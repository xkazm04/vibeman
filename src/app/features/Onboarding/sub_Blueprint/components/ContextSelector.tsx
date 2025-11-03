'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X } from 'lucide-react';

interface Context {
  id: string;
  name: string;
  groupName?: string;
  groupColor?: string;
}

interface ContextSelectorProps {
  projectId: string;
  onSelect: (contextId: string, contextName: string) => void;
  onClose: () => void;
}

export default function ContextSelector({
  projectId,
  onSelect,
  onClose,
}: ContextSelectorProps) {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContexts();
  }, [projectId]);

  const loadContexts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/contexts?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        // Sort by name ascending
        const sortedContexts = (data.data.contexts || []).sort((a: Context, b: Context) =>
          a.name.localeCompare(b.name)
        );
        setContexts(sortedContexts);
      }
    } catch (error) {
      // Failed to load contexts - silently handle error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-gradient-to-br from-gray-900 via-slate-900 to-blue-900/30 border border-gray-700/50 rounded-2xl p-6 max-w-md w-full max-h-[70vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white font-mono">
                Select Context
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700/50 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Context List */}
          <div className="overflow-y-auto max-h-[calc(70vh-120px)]">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading contexts...
              </div>
            ) : contexts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No contexts found for this project.
              </div>
            ) : (
              <div className="space-y-2">
                {contexts.map((context, index) => (
                  <motion.button
                    key={context.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => onSelect(context.id, context.name)}
                    className="w-full text-left px-4 py-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-cyan-500/50 rounded-lg transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-white font-medium font-mono group-hover:text-cyan-300 transition-colors">
                          {context.name}
                        </div>
                        {context.groupName && (
                          <div
                            className="text-xs mt-1 font-mono"
                            style={{ color: context.groupColor || '#6B7280' }}
                          >
                            {context.groupName}
                          </div>
                        )}
                      </div>
                      <Layers
                        className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors"
                        style={{
                          color: context.groupColor || undefined,
                        }}
                      />
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
