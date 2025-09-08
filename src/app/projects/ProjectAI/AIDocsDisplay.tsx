import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ArrowLeft, AlertCircle, Save, Check, X } from 'lucide-react';
import MarkdownViewer from '../../../components/markdown/MarkdownViewer';
import SaveFileDialog from '../../../components/ui/SaveFileDialog';

// Loading Animation Component with 1-minute timer
function LoadingAnimation() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 60000; // 1 minute in milliseconds
    const interval = 100; // Update every 100ms
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + increment;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center py-10 rounded-xl  max-w-md">
        <div className="relative mb-6">
          <FileText className="w-16 h-16 mx-auto text-blue-400 animate-pulse" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">
          Generating Project Documentation
        </h3>
        <p className="text-gray-400 mb-4 leading-relaxed">
          AI is conducting a comprehensive analysis of your project structure, code quality, and architecture...
        </p>
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <motion.div
            className="bg-blue-400 h-2 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {Math.round(progress)}% complete • {Math.round((100 - progress) * 0.6)} seconds remaining
        </p>
      </div>
    </div>
  );
}

interface AIDocsDisplayProps {
  content: string;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  previewMode: 'edit' | 'preview';
  onPreviewModeChange: (mode: 'edit' | 'preview') => void;
  onContentChange?: (content: string) => void;
  activeProject?: any;
}

export default function AIDocsDisplay({
  content,
  loading,
  error,
  onBack,
  previewMode,
  onPreviewModeChange,
  onContentChange,
  activeProject
}: AIDocsDisplayProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async (folderPath: string, fileName: string) => {
    if (!content.trim()) return;

    try {
      const response = await fetch('/api/kiro/save-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderPath,
          fileName,
          content,
          projectPath: activeProject?.path // Pass the actual project path
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save file');
      }

      console.log('File saved successfully:', result.filePath);
      setIsSaved(true);
    } catch (error) {
      console.error('Failed to save:', error);
      throw error;
    }
  };

  // Reset saved state when content changes
  useEffect(() => {
    setIsSaved(false);
  }, [content]);
  if (loading) {
    return <LoadingAnimation />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-3">
            Generation Failed
          </h3>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Selection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {/* Enhanced Backdrop with Gradient */}
      <motion.div
        key="docs-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-br from-black/70 via-black/60 to-slate-900/50 backdrop-blur-md"
        onClick={onBack}
      />

      {/* Enhanced Modal Container */}
      <motion.div
        key="docs-container"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 300,
          mass: 0.8
        }}
        className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8"
      >
        <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Enhanced Modal Background with Gradient and Border Effects */}
          <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/95 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl border border-slate-700/40">
            {/* Animated Border Gradient */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-slate-600/20 via-slate-500/10 to-slate-600/20 opacity-50" />

            {/* Inner Content Container */}
            <div className="relative z-10 h-full flex flex-col">
              {/* Enhanced Header with Gradient Background */}
              <div className="relative p-6 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/40 via-slate-800/30 to-slate-700/40 flex-shrink-0">
                {/* Header Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/5 to-transparent" />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={onBack}
                      className="p-2 hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 rounded-xl transition-all duration-200 group border border-transparent hover:border-slate-600/30"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-300 transition-colors" />
                    </button>
                    <div className="p-2.5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl border border-slate-600/30 shadow-lg backdrop-blur-sm">
                      <FileText className="w-5 h-5 text-slate-300" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white tracking-wide bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                        AI Project Documentation
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Comprehensive analysis and insights for your project
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3">
                    {/* Save Button */}
                    <button
                      onClick={() => !isSaved && setShowSaveDialog(true)}
                      disabled={!content.trim() || isSaved}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${isSaved
                        ? 'bg-green-500/30 text-green-300 cursor-default'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3" />
                          <span>Save</span>
                        </>
                      )}
                    </button>

                    {/* Mode Toggle */}
                    <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/30">
                      <button
                        onClick={() => onPreviewModeChange('preview')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${previewMode === 'preview'
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-300'
                          }`}
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => onPreviewModeChange('edit')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${previewMode === 'edit'
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-300'
                          }`}
                      >
                        Edit
                      </button>
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={onBack}
                      className="p-2 hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 rounded-xl transition-all duration-200 group border border-transparent hover:border-slate-600/30"
                    >
                      <X className="w-5 h-5 text-slate-400 group-hover:text-slate-300 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content Area with Enhanced Styling and Proper Scrolling */}
              <div className="flex-1 overflow-hidden bg-gradient-to-b from-slate-900/20 to-slate-800/10">
                {previewMode === 'preview' ? (
                  <div className="h-full overflow-y-auto custom-scrollbar p-6">
                    {content ? (
                      <MarkdownViewer
                        content={content}
                        theme="dark"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="text-center">
                          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg mb-2">No content to display</p>
                          <p className="text-sm">Generate AI documentation to see content here</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full p-6">
                    <textarea
                      value={content}
                      onChange={(e) => onContentChange?.(e.target.value)}
                      className="w-full h-full bg-slate-900/50 text-slate-300 font-mono text-sm resize-none border border-slate-700/30 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent backdrop-blur-sm custom-scrollbar"
                      placeholder="AI-generated documentation will appear here..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save Dialog */}
      <SaveFileDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSave}
        title="Save Project Documentation"
        description="Choose location and file name for the AI-generated documentation"
        defaultFileName="project-analysis.md"
        defaultFolder="docs"
        fileExtension=".md"
      />
    </AnimatePresence>
  );
}