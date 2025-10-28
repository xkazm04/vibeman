'use client';

import React, { useState } from 'react';
import { Download, FileJson, FileText, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GradientButton from '@/components/ui/GradientButton';

export interface ExportButtonProps {
  projectId: string;
  projectName: string;
  aiDocsContent?: string;
  aiDocsProvider?: string;
  llmProvider?: string;
  className?: string;
  compact?: boolean;
}

export default function ExportButton({
  projectId,
  projectName,
  aiDocsContent,
  aiDocsProvider,
  llmProvider,
  className = '',
  compact = false
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async (format: 'json' | 'markdown') => {
    setIsExporting(true);
    setExportStatus('idle');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/export/project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          projectName,
          format,
          includeAIDocs: !!aiDocsContent,
          aiDocsContent,
          aiDocsProvider,
          llmProvider
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      // Create and download the file
      const blob = new Blob([result.data], {
        type: format === 'json' ? 'application/json' : 'text/markdown'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus('success');

      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false);
        setExportStatus('idle');
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Export Button */}
      {compact ? (
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-lg text-purple-400 transition-all duration-300 shadow-lg shadow-purple-500/10 backdrop-blur-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Export AI Review"
        >
          <Download className="w-4 h-4" />
        </motion.button>
      ) : (
        <GradientButton
          colorScheme="purple"
          icon={Download}
          onClick={() => setIsOpen(!isOpen)}
          size="md"
          className="shadow-lg shadow-purple-500/20"
        >
          Export AI Review
        </GradientButton>
      )}

      {/* Export Options Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md"
            >
              <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl shadow-purple-500/20 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                      <Download className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Export AI Review</h3>
                      <p className="text-sm text-gray-400">{projectName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Export Format Options */}
                <div className="space-y-3 mb-6">
                  <p className="text-sm font-medium text-gray-300">Select Export Format:</p>

                  {/* JSON Export */}
                  <motion.button
                    onClick={() => handleExport('json')}
                    disabled={isExporting}
                    className="w-full p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border border-blue-500/30 rounded-xl text-left transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={!isExporting ? { scale: 1.02, x: 4 } : {}}
                    whileTap={!isExporting ? { scale: 0.98 } : {}}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30 mt-0.5">
                        <FileJson className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white mb-1">JSON Format</div>
                        <div className="text-sm text-gray-400">
                          Machine-readable format for integration and automation
                        </div>
                      </div>
                    </div>
                  </motion.button>

                  {/* Markdown Export */}
                  <motion.button
                    onClick={() => handleExport('markdown')}
                    disabled={isExporting}
                    className="w-full p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/30 rounded-xl text-left transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={!isExporting ? { scale: 1.02, x: 4 } : {}}
                    whileTap={!isExporting ? { scale: 0.98 } : {}}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30 mt-0.5">
                        <FileText className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white mb-1">Markdown Format</div>
                        <div className="text-sm text-gray-400">
                          Human-readable format for documentation and sharing
                        </div>
                      </div>
                    </div>
                  </motion.button>
                </div>

                {/* Export Status */}
                <AnimatePresence mode="wait">
                  {exportStatus === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400"
                    >
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">Export successful!</span>
                    </motion.div>
                  )}

                  {exportStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
                    >
                      <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Export failed</div>
                        {errorMessage && (
                          <div className="text-sm text-red-300/80 mt-1">{errorMessage}</div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {isExporting && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400"
                    >
                      <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      <span className="text-sm font-medium">Exporting...</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Info */}
                <div className="mt-4 p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                  <p className="text-sm text-gray-400">
                    Export includes: AI docs, goals, tasks, contexts, scans, and implementation logs
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
