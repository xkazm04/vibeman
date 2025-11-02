import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Context } from '../../../../stores/contextStore';
import SaveContextFileDialog from '../../../../components/SaveContextFileDialog';
import { useActiveProjectStore } from '../../../../stores/activeProjectStore';
import { generatePlaceholderContent } from './ContextPlaceholder';
import ContextModalHeader from './ContextModalHeader';
import ContextModalContent from './ContextModalContent';
import ContextFileFooter from './ContextFileFooter';
import { 
  loadContextFile as loadContextFileApi, 
  saveContextFile as saveContextFileApi
} from '../lib';

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
      const content = await loadContextFileApi(context.id);
      setMarkdownContent(content);
    } catch (error) {
      console.error('Failed to load context file:', error);
      setMarkdownContent(generatePlaceholderContent(context));
    } finally {
      setLoading(false);
    }
  };



  const handleSave = () => {
    setShowSaveDialog(true);
  };

  const handleSaveToFile = async (folderPath: string, fileName: string) => {
    if (!activeProject) {
      throw new Error('No active project selected');
    }

    try {
      await saveContextFileApi(folderPath, fileName, markdownContent, activeProject.path);
      
      // Update context to mark as having a context file
      console.log('Context file saved successfully');
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
              hasContextFile={context.hasContextFile || false}
              isEditing={isEditing}
              previewMode={previewMode}
              markdownContent={markdownContent}
              activeProject={activeProject}
              onMarkdownContentChange={setMarkdownContent}
            />
          </div>

          {/* Footer */}
          {(context.hasContextFile || isEditing) && (
            <ContextFileFooter
              markdownContent={markdownContent}
              previewMode={previewMode}
            />
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