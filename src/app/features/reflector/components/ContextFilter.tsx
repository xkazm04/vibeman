'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { Context } from '@/lib/queries/contextQueries';

interface ContextFilterProps {
  selectedProjectIds: string[];
  selectedContextIds: string[];
  onChange: (contextIds: string[]) => void;
}

export default function ContextFilter({ selectedProjectIds, selectedContextIds, onChange }: ContextFilterProps) {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProjectIds.length > 0) {
      loadContexts();
    } else {
      setContexts([]);
    }
  }, [selectedProjectIds]);

  const loadContexts = async () => {
    try {
      setLoading(true);
      const contextPromises = selectedProjectIds.map((projectId) =>
        fetch(`/api/contexts?projectId=${encodeURIComponent(projectId)}`)
          .then((res) => res.ok ? res.json() : null)
      );

      const responses = await Promise.all(contextPromises);
      const allContexts: Context[] = [];

      responses.forEach((response) => {
        if (response?.data?.contexts) {
          allContexts.push(...response.data.contexts);
        }
      });

      setContexts(allContexts);
    } catch (error) {    } finally {
      setLoading(false);
    }
  };

  const toggleContext = (contextId: string) => {
    if (selectedContextIds.includes(contextId)) {
      onChange(selectedContextIds.filter((id) => id !== contextId));
    } else {
      onChange([...selectedContextIds, contextId]);
    }
  };

  const toggleAll = () => {
    if (selectedContextIds.length === contexts.length + 1) { // +1 for "No Context"
      onChange([]);
    } else {
      onChange(['null', ...contexts.map((c) => c.id)]);
    }
  };

  if (selectedProjectIds.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        Select projects to filter by context
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Contexts
        </label>
        {contexts.length > 0 && (
          <button
            onClick={toggleAll}
            className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            {selectedContextIds.length === contexts.length + 1 ? 'Clear All' : 'Select All'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 py-4 text-center">Loading contexts...</div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {/* No Context option */}
          <motion.button
            onClick={() => toggleContext('null')}
            className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all ${
              selectedContextIds.includes('null')
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60'
            }`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">No Context</span>
          </motion.button>

          {contexts.map((context) => {
            const isSelected = selectedContextIds.includes(context.id);
            return (
              <motion.button
                key={context.id}
                onClick={() => toggleContext(context.id)}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  isSelected
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                    : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60'
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{context.name}</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
