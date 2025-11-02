'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Loader2, Copy, Check } from 'lucide-react';

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
  activeStepId?: string | null;
  onSelectorClick?: (testId: string) => void;
}

export default function TestSelectorsPanel({
  contextId,
  groupColor,
  activeStepId,
  onSelectorClick,
}: TestSelectorsPanelProps) {
  const [selectors, setSelectors] = useState<TestSelector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopy = async (testId: string, selectorId: string) => {
    try {
      await navigator.clipboard.writeText(testId);
      setCopiedId(selectorId);
      // Clear copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: groupColor }} />
          <label className="block text-sm font-medium text-gray-400 font-mono">
            Test Selectors ({selectors.length})
          </label>
        </div>
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
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {selectors.map((selector, index) => (
            <motion.div
              key={selector.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-start gap-1 px-2 py-1.5 bg-gray-900/50 border rounded text-xs font-mono transition-all ${
                activeStepId
                  ? 'border-cyan-500/30'
                  : 'border-gray-600/30'
              }`}
            >
              {/* Main clickable area */}
              <button
                onClick={() => onSelectorClick?.(selector.dataTestid)}
                disabled={!activeStepId}
                className={`flex-1 text-left ${
                  activeStepId
                    ? 'hover:text-cyan-400 cursor-pointer'
                    : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div>
                  <span className="text-gray-300">
                    {getFileName(selector.filepath)}:
                  </span>{' '}
                  <span className="text-gray-400">{selector.title}</span>
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  {selector.dataTestid}
                </div>
              </button>

              {/* Copy button */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(selector.dataTestid, selector.id);
                }}
                className="flex-shrink-0 p-1 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Copy to clipboard"
              >
                {copiedId === selector.id ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
