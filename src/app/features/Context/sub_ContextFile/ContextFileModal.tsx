/**
 * Context File Modal Component
 *
 * Modal for viewing and editing context file content.
 * Uses centralized context metadata cache for real-time sync.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Context } from '../../../../stores/contextStore';
import SaveContextFileDialog from '../../../../components/SaveContextFileDialog';
import { useActiveProjectStore } from '../../../../stores/activeProjectStore';
import { generatePlaceholderContent } from './ContextPlaceholder';
import ContextModalHeader from './ContextModalHeader';
import ContextModalContent from './ContextModalContent';
import ContextFileFooter from './ContextFileFooter';
import { saveContextFile as saveContextFileApi } from '../lib';
import {
  useContextFileContent,
  useInvalidateContextFileCache
} from '@/lib/queries/contextFileQueries';
import { useContextWithCache } from '@/hooks/useContextMetadata';

interface ContextFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: Context;
}

export default function ContextFileModal({ isOpen, onClose, context: propContext }: ContextFileModalProps) {
  const { activeProject } = useActiveProjectStore();

  // Get cached context with real-time updates
  const { context: cachedContext } = useContextWithCache(propContext.id);

  // Use cached context if available, fallback to prop
  const context = cachedContext ?? propContext;
  const [isEditing, setIsEditing] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('preview');
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { invalidateFile } = useInvalidateContextFileCache();

  // Use TanStack Query for cached context file loading
  const {
    data: cachedContent,
    isLoading: loading,
    error: loadError,
  } = useContextFileContent(context.id, {
    enabled: isOpen && context.hasContextFile,
  });

  // Update local state when cached content changes
  useEffect(() => {
    if (cachedContent) {
      setMarkdownContent(cachedContent);
    } else if (loadError && context.hasContextFile) {
      // Fallback to placeholder on error
      setMarkdownContent(generatePlaceholderContent(context));
    }
  }, [cachedContent, loadError, context]);

  const handleSave = () => {
    setShowSaveDialog(true);
  };

  const handleSaveToFile = async (folderPath: string, fileName: string) => {
    if (!activeProject) {
      throw new Error('No active project selected');
    }

    try {
      await saveContextFileApi(folderPath, fileName, markdownContent, activeProject.path);
      // Invalidate cache to ensure fresh content on next load
      invalidateFile(context.id);
      setIsEditing(false);
      setPreviewMode('preview');
      setShowSaveDialog(false);
    } catch (error) {
      throw error;
    }
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

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
        data-testid="context-file-modal-backdrop"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          data-testid="context-file-modal"
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
              generationError={generationError}
              hasContextFile={context.hasContextFile || false}
              isEditing={isEditing}
              previewMode={previewMode}
              markdownContent={markdownContent}
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