'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Target, Loader2, Copy, Check, X, RefreshCw, AlertTriangle } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSelectors = useCallback(async () => {
    if (!contextId) {
      setError('No context ID provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`/api/tester/selectors?contextId=${contextId}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load selectors (${response.status})`);
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        setSelectors(data.data);
      } else {
        setSelectors([]);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load selectors');
      }
      console.error('[TestSelectorsPanel] Error loading selectors:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contextId]);

  useEffect(() => {
    loadSelectors();
  }, [loadSelectors]);

  // Extract filename without extension - with null check
  const getFileName = (filepath: string): string => {
    if (!filepath || typeof filepath !== 'string') {
      return 'unknown';
    }
    try {
      const parts = filepath.split(/[/\\]/); // Handle both forward and backslashes
      const filename = parts[parts.length - 1] || 'unknown';
      return filename.replace(/\.[^/.]+$/, ''); // Remove extension
    } catch {
      return 'unknown';
    }
  };

  const handleCopy = async (testId: string, selectorId: string) => {
    if (!testId) {
      setCopyError('No test ID to copy');
      return;
    }

    setCopyError(null);

    try {
      await navigator.clipboard.writeText(testId);
      setCopiedId(selectorId);
      // Clear copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('[TestSelectorsPanel] Clipboard error:', err);
      setCopyError('Failed to copy to clipboard');
      // Clear error after 3 seconds
      setTimeout(() => setCopyError(null), 3000);
    }
  };

  const handleDelete = async (selectorId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!selectorId) {
      setDeleteError('Invalid selector ID');
      return;
    }

    if (!confirm('Delete this test selector from the database?')) {
      return;
    }

    setDeleteError(null);
    setDeletingId(selectorId);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/api/tester/selectors/${selectorId}`, {
        method: 'DELETE',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete (${response.status})`);
      }

      // Optimistically remove from state instead of reloading
      setSelectors(prev => prev.filter(s => s.id !== selectorId));
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setDeleteError('Delete request timed out');
        } else {
          setDeleteError(err.message);
        }
      } else {
        setDeleteError('Failed to delete selector');
      }
      console.error('[TestSelectorsPanel] Delete error:', err);
      // Clear error after 5 seconds
      setTimeout(() => setDeleteError(null), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRetry = () => {
    loadSelectors();
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: groupColor }} />
            <label className="block text-sm font-medium text-gray-400 font-mono">
              Test Selectors ({selectors.length})
            </label>
          </div>
          {!isLoading && (
            <motion.button
              onClick={handleRetry}
              className="p-1 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Refresh selectors"
              data-testid="refresh-selectors-btn"
            >
              <RefreshCw className="w-3 h-3" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {(deleteError || copyError) && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 font-mono"
        >
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>{deleteError || copyError}</span>
          <button
            onClick={() => { setDeleteError(null); setCopyError(null); }}
            className="ml-auto p-0.5 hover:bg-red-500/20 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8" data-testid="loading-selectors">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      ) : error ? (
        <div className="text-center py-4 space-y-2" data-testid="selectors-error">
          <p className="text-xs text-red-400 font-mono">{error}</p>
          <motion.button
            onClick={handleRetry}
            className="flex items-center gap-1 px-2 py-1 text-xs text-cyan-400 hover:bg-cyan-500/10 rounded border border-cyan-500/30 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="retry-selectors-btn"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </motion.button>
        </div>
      ) : selectors.length === 0 ? (
        <div className="text-xs text-gray-500 text-center py-4 font-mono" data-testid="no-selectors">
          No test selectors found. Run Selectors scan to discover them.
        </div>
      ) : (
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {selectors.map((selector, index) => (
            <motion.div
              key={selector.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.5) }} // Cap animation delay
              className={`flex items-start gap-1 px-2 py-1.5 bg-gray-900/50 border rounded text-xs font-mono transition-all ${
                activeStepId
                  ? 'border-cyan-500/30'
                  : 'border-gray-600/30'
              } ${deletingId === selector.id ? 'opacity-50' : ''}`}
              data-testid={`selector-${index}`}
            >
              {/* Main clickable area */}
              <button
                onClick={() => onSelectorClick?.(selector.dataTestid)}
                disabled={!activeStepId || deletingId === selector.id}
                className={`flex-1 text-left ${
                  activeStepId && deletingId !== selector.id
                    ? 'hover:text-cyan-400 cursor-pointer'
                    : 'cursor-not-allowed opacity-50'
                }`}
                data-testid={`selector-${index}-btn`}
              >
                <div>
                  <span className="text-gray-300">
                    {getFileName(selector.filepath)}:
                  </span>{' '}
                  <span className="text-gray-400">{selector.title || 'Untitled'}</span>
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  {selector.dataTestid || 'No test ID'}
                </div>
              </button>

              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Copy button */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(selector.dataTestid, selector.id);
                  }}
                  disabled={deletingId === selector.id}
                  className="p-1 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors disabled:opacity-50"
                  whileHover={{ scale: deletingId !== selector.id ? 1.1 : 1 }}
                  whileTap={{ scale: deletingId !== selector.id ? 0.9 : 1 }}
                  title="Copy to clipboard"
                  data-testid={`selector-${index}-copy-btn`}
                >
                  {copiedId === selector.id ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </motion.button>

                {/* Delete button */}
                <motion.button
                  onClick={(e) => handleDelete(selector.id, e)}
                  disabled={deletingId === selector.id}
                  className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                  whileHover={{ scale: deletingId !== selector.id ? 1.1 : 1 }}
                  whileTap={{ scale: deletingId !== selector.id ? 0.9 : 1 }}
                  title="Delete selector"
                  data-testid={`selector-${index}-delete-btn`}
                >
                  {deletingId === selector.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
