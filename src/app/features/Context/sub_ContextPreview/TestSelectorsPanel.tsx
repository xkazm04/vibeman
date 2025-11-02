'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Loader2 } from 'lucide-react';

interface TestSelector {
  id: string;
  contextId: string;
  dataTestid: string;
  title: string;
  filepath: string;
  createdAt: string;
  updatedAt: string;
}

interface TestSelectorsPanelProps {
  contextId: string;
  groupColor: string;
}

export default function TestSelectorsPanel({
  contextId,
  groupColor,
}: TestSelectorsPanelProps) {
  const [selectors, setSelectors] = useState<TestSelector[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSelectors();
  }, [contextId]);

  const loadSelectors = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tester/selectors?contextId=${contextId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectors(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load test selectors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract filename without extension
  const getFileName = (filepath: string) => {
    const parts = filepath.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.[^/.]+$/, ''); // Remove extension
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4" style={{ color: groupColor }} />
        <label className="block text-sm font-medium text-gray-400 font-mono">
          Test Selectors ({selectors.length})
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      ) : selectors.length === 0 ? (
        <div className="text-xs text-gray-500 text-center py-4 font-mono">
          No test selectors found. Run Selectors scan to discover them.
        </div>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {selectors.map((selector, index) => (
            <motion.div
              key={selector.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="px-2 py-1.5 bg-gray-900/50 border border-gray-600/30 rounded text-xs font-mono hover:bg-gray-800/50 transition-colors"
            >
              <span className="text-gray-300">
                {getFileName(selector.filepath)}:
              </span>{' '}
              <span className="text-gray-400">{selector.title}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
