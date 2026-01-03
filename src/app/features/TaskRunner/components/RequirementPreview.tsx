'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronDown, Code, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface RequirementPreviewProps {
  requirementName: string;
  projectPath: string;
  onLoad?: (content: string) => void;
  className?: string;
  maxLines?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * RequirementPreview - Shows a preview of requirement file content
 *
 * Loads the first few lines of a requirement file for quick preview.
 */
export function RequirementPreview({
  requirementName,
  projectPath,
  onLoad,
  className = '',
  maxLines = 5,
  expanded = false,
  onToggleExpand,
}: RequirementPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      if (!expanded || content) return;

      setLoading(true);
      try {
        const reqPath = `${projectPath}/.claude/requirements/${requirementName}.md`;
        const response = await fetch(`/api/disk/read-file?path=${encodeURIComponent(reqPath)}`);
        const data = await response.json();

        if (data.success && data.content) {
          const lines = data.content.split('\n').slice(0, maxLines);
          const preview = lines.join('\n');
          setContent(preview);
          onLoad?.(data.content);
        } else {
          setError('Could not load file');
        }
      } catch (err) {
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [expanded, projectPath, requirementName, maxLines, content, onLoad]);

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-2 bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-mono text-gray-300">{requirementName}</span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </motion.div>
      </button>

      {/* Preview Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-gray-900/50 border-t border-gray-700/50">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading preview...</span>
                </div>
              ) : error ? (
                <div className="text-red-400 text-sm">{error}</div>
              ) : content ? (
                <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap overflow-hidden">
                  {content}
                  {content.split('\n').length >= maxLines && (
                    <span className="text-gray-600">...</span>
                  )}
                </pre>
              ) : (
                <div className="text-gray-500 text-sm">No content</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Example requirement card for empty states
 */
export function ExampleRequirementCard({ className = '' }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 0.6, y: 0 }}
      className={`p-4 bg-gray-800/30 border border-gray-700/30 rounded-lg ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Code className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-300 mb-1">add-dark-mode</h4>
          <p className="text-xs text-gray-500 mb-2">
            Implement dark mode toggle with theme persistence
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~5 min
            </span>
            <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">
              feature
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * TaskRunner empty state with example requirements
 */
export function TaskRunnerEmptyState({
  projectPath,
  onCreateExample,
  className = '',
}: {
  projectPath?: string;
  onCreateExample?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center py-8 px-4 ${className}`}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
        <div className="relative p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
          <FileText className="w-8 h-8 text-purple-400" />
        </div>
      </motion.div>

      <h3 className="text-lg font-semibold text-gray-200 mb-2">No Requirements Found</h3>
      <p className="text-sm text-gray-400 text-center max-w-xs mb-6">
        Requirements are markdown files in{' '}
        <code className="text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded text-xs">
          .claude/requirements/
        </code>
      </p>

      {/* Example Cards */}
      <div className="w-full max-w-sm space-y-2 mb-6">
        <p className="text-xs text-gray-500 text-center mb-2">Example requirements:</p>
        <ExampleRequirementCard />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.4, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-gray-800/20 border border-gray-700/20 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400/60" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-400 mb-1">fix-login-bug</h4>
              <p className="text-xs text-gray-600">Fix session timeout issue</p>
            </div>
          </div>
        </motion.div>
      </div>

      {onCreateExample && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={onCreateExample}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400
                     rounded-lg border border-purple-500/30 transition-colors text-sm"
        >
          Create Example Requirement
        </motion.button>
      )}
    </div>
  );
}

export default RequirementPreview;
