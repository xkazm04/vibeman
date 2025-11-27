'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Check, Edit3, Eye, AlertCircle, Loader2, RotateCcw, Info } from 'lucide-react';
import { MarkdownViewer } from '@/components/markdown';
import { DEFAULT_PROMPT_TEMPLATE, STORAGE_KEY, buildPreviewContent } from './promptTemplate';

interface ExecutionPromptEditorProps {
  onClose: () => void;
}

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  variant?: 'primary' | 'secondary' | 'success';
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  disabled = false,
  icon: Icon,
  label,
  variant = 'secondary'
}) => {
  const baseClasses = "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200";

  const variantClasses = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30",
    secondary: "bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-gray-300 border border-gray-600/30",
    success: "bg-green-500/20 text-green-400 border border-green-500/30"
  };

  const disabledClasses = disabled ? "bg-gray-700/50 text-gray-400 cursor-not-allowed" : "";

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${disabled ? disabledClasses : variantClasses[variant]}`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </motion.button>
  );
};

export default function ExecutionPromptEditor({ onClose }: ExecutionPromptEditorProps) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [content, setContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load prompt from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      setContent(stored || DEFAULT_PROMPT_TEMPLATE);
    }
  }, []);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    setJustSaved(false);
  };

  const handleSave = () => {
    setIsSaving(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, content);
    }
    setTimeout(() => {
      setIsSaving(false);
      setHasUnsavedChanges(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    }, 500);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to the default prompt template? This cannot be undone.')) {
      setContent(DEFAULT_PROMPT_TEMPLATE);
      setHasUnsavedChanges(true);
      setJustSaved(false);
    }
  };

  // Render preview with variable examples
  const renderPreview = () => buildPreviewContent(content);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/30 bg-gray-900/30 backdrop-blur-sm">
        {/* Left: Info */}
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-400">
            Configure the prompt template sent to Claude Code CLI
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

          {/* Reset Button */}
          <ActionButton
            onClick={handleReset}
            icon={RotateCcw}
            label="Reset"
            variant="secondary"
          />

          {/* Save Button */}
          <motion.button
            whileHover={!isSaving && hasUnsavedChanges ? { scale: 1.05 } : {}}
            whileTap={!isSaving && hasUnsavedChanges ? { scale: 0.95 } : {}}
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              justSaved
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : hasUnsavedChanges
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
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
          <div className="flex bg-gray-800/50 rounded-lg p-1 border border-gray-700/30">
            <button
              onClick={() => setMode('preview')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                mode === 'preview'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Preview</span>
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                mode === 'edit'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-sm font-medium">Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Variables Info Box */}
      <div className="mx-6 mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Available Variables:</p>
            <div className="text-xs text-blue-300/80 space-y-0.5 font-mono">
              <div><code className="text-cyan-400">{`{{REQUIREMENT_CONTENT}}`}</code> - The requirement text</div>
              <div><code className="text-cyan-400">{`{{PROJECT_PATH}}`}</code> - Absolute project path</div>
              <div><code className="text-cyan-400">{`{{PROJECT_ID}}`}</code> - Project identifier</div>
              <div><code className="text-cyan-400">{`{{DB_PATH}}`}</code> - Database file path</div>
            </div>
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
              className="h-full overflow-y-auto px-6 py-4 custom-scrollbar"
            >
              <div className="max-w-5xl mx-auto">
                <MarkdownViewer
                  content={renderPreview()}
                />
              </div>
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
                className="w-full h-full bg-gray-900/50 text-gray-300 font-mono text-sm resize-none border border-gray-700/30 rounded-lg p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm custom-scrollbar"
                placeholder="Enter your execution prompt template..."
                spellCheck={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
