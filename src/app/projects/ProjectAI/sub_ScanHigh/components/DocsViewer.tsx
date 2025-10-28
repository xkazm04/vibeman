import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Check, Edit3, Eye, FileText, AlertCircle, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { MarkdownViewer } from '@/components/markdown';

interface DocsViewerProps {
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onRegenerate?: (vision?: string) => void;
  isSaving: boolean;
  isRegenerating?: boolean;
  projectName: string;
}

export default function DocsViewer({
  content,
  onContentChange,
  onSave,
  onRegenerate,
  isSaving,
  isRegenerating = false,
  projectName
}: DocsViewerProps) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [vision, setVision] = useState('');

  const handleContentChange = (newContent: string) => {
    onContentChange(newContent);
    setHasUnsavedChanges(true);
    setJustSaved(false);
  };

  const handleSave = async () => {
    await onSave();
    setHasUnsavedChanges(false);
    setJustSaved(true);

    // Reset "just saved" indicator after 3 seconds
    setTimeout(() => setJustSaved(false), 3000);
  };

  const handleRegenerateClick = () => {
    setShowRegenerateModal(true);
    setVision('');
  };

  const handleRegenerateConfirm = () => {
    if (onRegenerate) {
      onRegenerate(vision.trim() || undefined);
      setShowRegenerateModal(false);
      setVision('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/30 bg-slate-900/30 backdrop-blur-sm">
        {/* Left: Project Info */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-lg flex items-center justify-center border border-blue-500/30">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{projectName}</h3>
            <p className="text-slate-400 text-xs">context/high.md</p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {/* Unsaved Changes Indicator */}
          <AnimatePresence>
            {hasUnsavedChanges && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center space-x-2 text-amber-400 text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Unsaved changes</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Regenerate Button */}
          {onRegenerate && (
            <motion.button
              whileHover={!isRegenerating ? { scale: 1.05 } : {}}
              whileTap={!isRegenerating ? { scale: 0.95 } : {}}
              onClick={handleRegenerateClick}
              disabled={isRegenerating}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Regenerate</span>
                </>
              )}
            </motion.button>
          )}

          {/* Save Button */}
          <motion.button
            whileHover={!isSaving && hasUnsavedChanges ? { scale: 1.05 } : {}}
            whileTap={!isSaving && hasUnsavedChanges ? { scale: 0.95 } : {}}
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              justSaved
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : hasUnsavedChanges
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : justSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </motion.button>

          {/* Mode Toggle */}
          <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/30">
            <button
              onClick={() => setMode('preview')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                mode === 'preview'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Preview</span>
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                mode === 'edit'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-sm font-medium">Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === 'preview' ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto px-6 py-6 custom-scrollbar"
            >
              {content ? (
                <div className="max-w-5xl mx-auto">
                  <MarkdownViewer
                    content={content}
                    theme="dark"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No content yet</p>
                    <p className="text-sm">Switch to Edit mode to add content</p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full p-6"
            >
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-full bg-slate-900/50 text-slate-300 font-mono text-sm resize-none border border-slate-700/30 rounded-lg p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm custom-scrollbar"
                placeholder="# High-Level Vision Documentation

Start writing your project vision here...

## Mission Statement
...

## Architecture Vision
..."
                spellCheck={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Regenerate Modal */}
      <AnimatePresence>
        {showRegenerateModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowRegenerateModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 z-50 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-blue-600/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Regenerate Documentation</h3>
                    <p className="text-sm text-slate-400">Update your vision to refine the documentation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRegenerateModal(false)}
                  className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Vision Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Your Vision <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  autoFocus
                  placeholder="What's your vision for this project? What problem does it solve? What makes it unique?&#10;&#10;Examples:&#10;- 'Build a platform that helps developers manage multiple projects efficiently'&#10;- 'Create an AI-powered tool for code analysis and documentation'&#10;- 'Revolutionary approach to team collaboration with real-time insights'"
                  className="w-full h-40 bg-slate-900/50 text-slate-300 text-sm rounded-lg border border-slate-700/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none custom-scrollbar"
                />
                <p className="text-xs text-slate-500 mt-2">
                  This helps the AI understand your project's purpose and generate more personalized documentation
                </p>
              </div>

              {/* Warning */}
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-400 font-medium">This will replace your current documentation</p>
                    <p className="text-xs text-amber-300/70 mt-1">
                      Any unsaved changes will be lost. Make sure to save your work before regenerating.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowRegenerateModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegenerateConfirm}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 shadow-lg shadow-purple-500/30 flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Regenerate</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
