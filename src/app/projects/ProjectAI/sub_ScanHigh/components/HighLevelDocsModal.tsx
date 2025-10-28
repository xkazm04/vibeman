import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, AlertCircle } from 'lucide-react';
import { useHighLevelDocs } from '../hooks/useHighLevelDocs';
import DocsGenerator from './DocsGenerator';
import DocsViewer from './DocsViewer';
import LoadingAnimation from './LoadingAnimation';
import { SupportedProvider, DefaultProviderStorage } from '@/lib/llm';
import ScanLeftPanel from '../../ScanModal/ScanLeftPanel';
import ScanRightPanel from '../../ScanModal/ScanRightPanel';

interface HighLevelDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName: string;
  projectPath: string;
  provider?: SupportedProvider;
}

export default function HighLevelDocsModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  projectPath,
  provider: externalProvider
}: HighLevelDocsModalProps) {
  // Left panel state
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>(() =>
    externalProvider || DefaultProviderStorage.getDefaultProvider()
  );
  const [backgroundTask, setBackgroundTask] = useState(false);
  const [checkingDocs, setCheckingDocs] = useState(true);

  const {
    content,
    isLoading,
    isGenerating,
    isSaving,
    error,
    hasExistingDocs,
    loadDocs,
    generateDocs,
    saveDocs,
    updateContent,
    clearError,
    reset
  } = useHighLevelDocs({ projectPath, projectName, projectId });

  // Update checking docs state based on loading
  useEffect(() => {
    setCheckingDocs(isLoading);
  }, [isLoading]);

  // Load docs when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDocs();
    } else {
      reset();
    }
  }, [isOpen, loadDocs, reset]);

  const handleGenerate = async (vision?: string) => {
    const success = await generateDocs({ provider: selectedProvider, vision });
    // Auto-save is handled within generateDocs
  };

  const handleRegenerate = async (vision?: string) => {
    const success = await generateDocs({ provider: selectedProvider, vision });
    // Auto-save is handled within generateDocs
  };

  const handleSave = async () => {
    await saveDocs();
  };

  const handleClose = () => {
    clearError();
    onClose();
  };

  const handleShowAIDocs = async () => {
    // Handled by the main content area - docs are already shown
  };

  // Mock active project object for left panel
  const activeProject = projectId && projectName && projectPath ? {
    id: projectId,
    name: projectName,
    path: projectPath
  } : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative w-full max-w-[95vw] max-h-[90vh] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/30 bg-slate-900/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">High-Level Vision Documentation</h2>
              <p className="text-sm text-slate-400">Strategic overview and architectural philosophy</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/30 flex items-center justify-center transition-colors group"
          >
            <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Main Content with Side Panels */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel */}
          {activeProject && (
            <ScanLeftPanel
              aiDocsExist={hasExistingDocs}
              checkingDocs={checkingDocs}
              activeProject={activeProject}
              selectedProvider={selectedProvider}
              backgroundTask={backgroundTask}
              onProviderSelect={setSelectedProvider}
              onBackgroundTaskChange={setBackgroundTask}
              onShowAIDocs={handleShowAIDocs}
            />
          )}

          {/* Center Content */}
          <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {/* Loading State */}
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm"
              >
                <LoadingAnimation />
                <p className="text-slate-400 mt-4">Loading documentation...</p>
              </motion.div>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8"
              >
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
                <p className="text-slate-400 text-center max-w-md mb-6">{error}</p>
                <div className="flex space-x-3">
                  {!hasExistingDocs && (
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Try Again
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}

            {/* Generator View (no existing docs) */}
            {!isLoading && !error && !hasExistingDocs && !content && (
              <motion.div
                key="generator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <DocsGenerator
                  projectName={projectName}
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                />
              </motion.div>
            )}

            {/* Viewer (has content or just generated) */}
            {!isLoading && !error && (hasExistingDocs || content) && (
              <motion.div
                key="viewer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <DocsViewer
                  content={content}
                  onContentChange={updateContent}
                  onSave={handleSave}
                  onRegenerate={handleRegenerate}
                  isSaving={isSaving}
                  isRegenerating={isGenerating}
                  projectName={projectName}
                  projectId={projectId}
                  llmProvider={selectedProvider}
                />
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          {/* Right Panel */}
          {projectId && (
            <ScanRightPanel projectId={projectId} />
          )}
        </div>

        {/* Footer Info */}
        {!isLoading && !error && (hasExistingDocs || content) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 py-3 border-t border-slate-700/30 bg-slate-900/30 backdrop-blur-sm flex-shrink-0"
          >
            <div className="flex items-center justify-between text-sm text-slate-500">
              <div className="flex items-center space-x-4">
                <span>📁 {projectPath}/context/high.md</span>
                {isGenerating && (
                  <span className="flex items-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full"
                    />
                    <span className="text-blue-400">Generating...</span>
                  </span>
                )}
              </div>
              <span className="text-slate-600">High-level strategic documentation</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
