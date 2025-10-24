import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, Save, Check } from 'lucide-react';
import { saveGeneratedContent, validateMarkdownContent, prepareContentForSave } from '../lib/fileOperations';
import { MarkdownViewer } from '@/components/markdown';
import SaveFileDialog from '@/components/ui/SaveFileDialog';

interface ScanHighModalContentProps {
  content: string;
  onBack: () => void;
  previewMode: 'edit' | 'preview';
  onPreviewModeChange: (mode: 'edit' | 'preview') => void;
  onContentChange?: (content: string) => void;
  activeProject?: any;
}

export default function ScanHighModalContent({
  content,
  onBack,
  previewMode,
  onPreviewModeChange,
  onContentChange,
  activeProject
}: ScanHighModalContentProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (folderPath: string, fileName: string) => {
    if (!content.trim()) {
      setSaveError('Content cannot be empty');
      return;
    }

    try {
      setSaveError(null);
      
      // Validate content before saving
      const validation = validateMarkdownContent(content);
      if (!validation.isValid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }

      // Prepare content for saving (clean and normalize)
      const preparedContent = prepareContentForSave(content);

      // Save the file
      const result = await saveGeneratedContent({
        folderPath,
        fileName,
        content: preparedContent,
        projectPath: activeProject?.path
      });

      if (result.success) {
        console.log('File saved successfully:', result.filePath);
        setIsSaved(true);
        setShowSaveDialog(false);
      } else {
        throw new Error(result.error || 'Unknown save error');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save file');
      throw error; // Re-throw to let SaveFileDialog handle it
    }
  };

  // Reset saved state when content changes
  useEffect(() => {
    setIsSaved(false);
    setSaveError(null);
  }, [content]);

  return (
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
          {/* Save Status/Error Display */}
          {saveError && (
            <div className="text-red-400 text-sm max-w-xs truncate" title={saveError}>
              ⚠️ {saveError}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={() => !isSaved && setShowSaveDialog(true)}
            disabled={!content.trim() || isSaved}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
              isSaved
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
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                previewMode === 'preview'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => onPreviewModeChange('edit')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                previewMode === 'edit'
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
          <div className="h-full min-h-[70vh]">
            <textarea
              value={content}
              onChange={(e) => onContentChange?.(e.target.value)}
              className="w-full h-full min-h-[70vh] bg-slate-900/50 text-slate-300 font-mono text-sm resize-none border border-slate-700/30 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent backdrop-blur-sm custom-scrollbar"
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