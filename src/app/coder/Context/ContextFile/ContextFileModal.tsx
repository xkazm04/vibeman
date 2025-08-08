import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Context } from '../../../../stores/contextStore';
import { ContextFileGenerator } from '../../../../services/contextFileGenerator';
import SaveContextFileDialog from '../../../../components/SaveContextFileDialog';
import { useActiveProjectStore } from '../../../../stores/activeProjectStore';
import { generatePlaceholderContent } from './ContextPlaceholder';
import ContextModalHeader from './ContextModalHeader';
import ContextModalContent from './ContextModalContent';

interface ContextFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: Context;
}

export default function ContextFileModal({ isOpen, onClose, context }: ContextFileModalProps) {
  const { activeProject } = useActiveProjectStore();
  const [isEditing, setIsEditing] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('preview');
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [backgroundProcessing, setBackgroundProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if context file exists and load content
  useEffect(() => {
    if (isOpen && context.hasContextFile) {
      loadContextFile();
    }
  }, [isOpen, context.hasContextFile]);

  const loadContextFile = async () => {
    setLoading(true);
    try {
      // Mock API call to load context file content
      // In real implementation, this would load from the file system
      const response = await fetch(`/api/context-files/${context.id}`);

      if (response.ok) {
        const content = await response.text();
        setMarkdownContent(content);
      } else {
        // Generate placeholder content for demo
        setMarkdownContent(generatePlaceholderContent(context));
      }
    } catch (error) {
      console.error('Failed to load context file:', error);
      setMarkdownContent(generatePlaceholderContent(context));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContextFile = () => {
    setMarkdownContent(generatePlaceholderContent(context));
    setIsEditing(true);
    setPreviewMode('edit');
  };

  const handleGenerateWithLLM = async () => {
    if (context.filePaths.length === 0) {
      setGenerationError('No files in context to analyze');
      return;
    }

    setGenerating(true);
    setGenerationError(null);
    setGenerationStatus('Initializing...');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const generatedContent = await ContextFileGenerator.generateContextFile({
        context,
        onProgress: (status) => setGenerationStatus(status),
        signal: abortControllerRef.current.signal
      });

      setMarkdownContent(generatedContent);
      setIsEditing(true);
      setPreviewMode('preview');
      setGenerationStatus('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setGenerationError(errorMessage);
      console.error('Context file generation failed:', error);
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setGenerating(false);
      setGenerationStatus('');
      setGenerationError('Generation cancelled by user');
    }
  };

  const handleBackgroundGeneration = async () => {
    if (context.filePaths.length === 0) {
      setGenerationError('No files in context to analyze');
      return;
    }

    if (!activeProject) {
      setGenerationError('No active project selected');
      return;
    }

    setBackgroundProcessing(true);
    setGenerationError(null);

    try {
      const response = await fetch('/api/kiro/generate-context-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId: context.id,
          contextName: context.name,
          filePaths: context.filePaths,
          projectPath: activeProject.path,
          projectId: activeProject.id
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start background generation');
      }

      // Show success message and close modal
      setGenerationError(null);
      onClose();

      // Optionally show a toast or notification that background processing started
      console.log('Background context file generation started');
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Failed to start background generation');
    } finally {
      setBackgroundProcessing(false);
    }
  };

  const handleSave = () => {
    setShowSaveDialog(true);
  };

  const handleSaveToFile = async (folderPath: string, fileName: string) => {
    if (!activeProject) {
      throw new Error('No active project selected');
    }

    // The folderPath is relative to the project root, so we need to construct the full path
    const fullProjectPath = `${activeProject.path}/${folderPath}/${fileName}`;

    try {
      const response = await fetch('/api/kiro/save-context-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: fullProjectPath,
          content: markdownContent,
          contextName: context.name
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save context file');
      }

      // Update context to mark as having a context file
      // This would typically update the database
      console.log('Context file saved successfully to:', fullProjectPath);
      setIsEditing(false);
      setPreviewMode('preview');
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Failed to save context file:', error);
      throw error; // Re-throw to let SaveContextFileDialog handle the error display
    }
  };

  const handleClose = () => {
    // Cancel any ongoing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset all state
    setIsEditing(false);
    setPreviewMode('preview');
    setMarkdownContent('');
    setGenerating(false);
    setGenerationStatus('');
    setGenerationError(null);
    abortControllerRef.current = null;

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <ContextModalHeader
            context={context}
            hasContextFile={context.hasContextFile || false}
            isEditing={isEditing}
            previewMode={previewMode}
            saving={saving}
            onPreviewModeChange={setPreviewMode}
            onSave={handleSave}
            onClose={handleClose}
          />

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <ContextModalContent
              context={context}
              loading={loading}
              generating={generating}
              generationStatus={generationStatus}
              generationError={generationError}
              backgroundProcessing={backgroundProcessing}
              hasContextFile={context.hasContextFile || false}
              isEditing={isEditing}
              previewMode={previewMode}
              markdownContent={markdownContent}
              activeProject={activeProject}
              onGenerateWithLLM={handleGenerateWithLLM}
              onBackgroundGeneration={handleBackgroundGeneration}
              onCreateContextFile={handleCreateContextFile}
              onCancelGeneration={handleCancelGeneration}
              onMarkdownContentChange={setMarkdownContent}
            />
          </div>

          {/* Footer */}
          {(context.hasContextFile || isEditing) && (
            <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/30">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center space-x-4">
                  <span>Language: Markdown</span>
                  <span>•</span>
                  <span>Lines: {markdownContent.split('\n').length}</span>
                  <span>•</span>
                  <span>Characters: {markdownContent.length}</span>
                </div>
                {previewMode === 'edit' && (
                  <div className="text-gray-500">
                    Press Ctrl+S to save
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Save Context File Dialog */}
      <SaveContextFileDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveToFile}
        contextName={context.name}
      />
    </AnimatePresence>
  );
}