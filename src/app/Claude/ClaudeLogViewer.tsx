'use client';
import React, { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRetryErrorHandler } from '@/hooks/useErrorHandler';
import { InlineErrorDisplay } from '@/components/errors/ErrorBoundary';

interface ClaudeLogViewerProps {
  logFilePath: string;
  requirementName: string;
}

export default function ClaudeLogViewer({ logFilePath, requirementName }: ClaudeLogViewerProps) {
  const [logContent, setLogContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const {
    error,
    isError,
    clearError,
    executeFetchWithRetry,
    retryCount,
  } = useRetryErrorHandler('ClaudeLogViewer', 3);

  const loadLog = async () => {
    setIsLoading(true);
    clearError();

    const data = await executeFetchWithRetry('/api/claude-code/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logFilePath }),
    });

    if (data) {
      setLogContent(data.content || 'No log content available');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadLog();
  }, [logFilePath]);

  const handleDownload = () => {
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${requirementName}_log.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-200">Execution Log</h3>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadLog}
            className="p-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Refresh log"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            disabled={!logContent}
            className="p-2 rounded bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download log"
          >
            <Download className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Log Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">
              Loading log...
              {retryCount > 0 && <span className="ml-2 text-xs">(Retry {retryCount}/3)</span>}
            </div>
          </div>
        ) : isError && error ? (
          <InlineErrorDisplay
            error={error}
            onRetry={loadLog}
            onDismiss={clearError}
          />
        ) : (
          <pre className="text-xs text-gray-300 bg-gray-900 p-4 rounded font-mono whitespace-pre-wrap break-words">
            {logContent}
          </pre>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-500">
        <div>Log file: {logFilePath}</div>
      </div>
    </div>
  );
}
