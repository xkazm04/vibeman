import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, AlertCircle, Save } from 'lucide-react';
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
    } catch (error) {
      console.error('Failed to save:', error);
      throw error;
    }
  };
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
          <div className=''>
            <h2 className="text-xl font-semibold text-white font-mono">
              AI Project Documentation
            </h2>
            <p className="text-sm text-gray-400">
              Comprehensive analysis and insights for your project
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* Save Button */}
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!content.trim()}
            className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Save className="w-3 h-3" />
            <span>Save</span>
          </button>

          {/* Mode Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => onPreviewModeChange('preview')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${previewMode === 'preview'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              Preview
            </button>
            <button
              onClick={() => onPreviewModeChange('edit')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${previewMode === 'edit'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {previewMode === 'preview' ? (
          <div className="h-full overflow-y-auto custom-scrollbar p-6">
            {content ? (
              <MarkdownViewer
                content={content}
                theme="dark"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
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
              className="w-full h-full p-6 bg-gray-900 text-gray-300 font-mono text-sm resize-none border-none outline-none custom-scrollbar"
              placeholder="AI-generated documentation will appear here..."
            />
          </div>
        )}
      </div>

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
    </div>
  );
}