import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, AlertCircle, Save, Check } from 'lucide-react';
import MarkdownViewer from '../../../components/markdown/MarkdownViewer';
import SaveFileDialog from '../../../components/ui/SaveFileDialog';
import { useGlobalModal } from '@/hooks/useGlobalModal';

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
  const { showModal, showInfoModal, showFullScreenModal } = useGlobalModal();

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

  // Show the modal when component mounts or content changes
  useEffect(() => {
    if (loading) {
      showInfoModal("Generating Documentation", <LoadingAnimation />, {
        subtitle: "AI is analyzing your project...",
        icon: FileText,
        iconBgColor: "from-blue-800/60 to-blue-900/60",
        iconColor: "text-blue-300",
        maxWidth: "max-w-md",
        maxHeight: "max-h-[50vh]"
      });
    } else if (error) {
      showInfoModal("Generation Failed", (
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Selection</span>
          </button>
        </div>
      ), {
        subtitle: "Unable to generate documentation",
        icon: AlertCircle,
        iconBgColor: "from-red-800/60 to-red-900/60",
        iconColor: "text-red-300",
        maxWidth: "max-w-md",
        maxHeight: "max-h-[50vh]"
      });
    } else if (content) {
      const modalContent = (
        <div className="flex flex-col h-full">
          {/* Actions Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/30">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Selection</span>
            </button>

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
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {previewMode === 'preview' ? (
              <div className="h-full overflow-y-auto custom-scrollbar">
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
              <div className="h-full">
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
      );

      showFullScreenModal("AI Project Documentation", modalContent, {
        subtitle: "Comprehensive analysis and insights for your project",
        icon: FileText,
        iconBgColor: "from-slate-800/60 to-slate-900/60",
        iconColor: "text-slate-300"
      });
    }
  }, [loading, error, content, previewMode, isSaved, showModal, onBack, onPreviewModeChange, onContentChange]);

  // Return null since we're using the global modal
  return (
    <>
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
    </>
  );
}