'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertCircle } from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '@/stores/contextStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import { normalizePath } from '@/utils/pathUtils';
import ContextGenForm from './ContextGenForm';
import ContextGenFiles from './ContextGenFiles';

interface ContextEditModalProps {
  context?: Context; // undefined for new context
  availableGroups: ContextGroup[];
  selectedFilePaths: string[]; // Currently selected files in the tree
  onSave?: (context: Context) => void;
  onCancel?: () => void;
}

export default function ContextEditModal({
  context,
  availableGroups,
  selectedFilePaths,
  onSave,
  onCancel,
}: ContextEditModalProps) {
  const { addContext, updateContext, loading } = useContextStore();
  const {
    activeProject,
    fileStructure,
    loadProjectFileStructure,
    isLoading: fileStructureLoading,
  } = useActiveProjectStore();
  const { hideModal } = useGlobalModal();

  // Form state
  const [contextName, setContextName] = useState(context?.name || '');
  const [description, setDescription] = useState(context?.description || '');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    context?.groupId || availableGroups[0]?.id || ''
  );
  const [contextFilePaths, setContextFilePaths] = useState<string[]>(
    context?.filePaths || selectedFilePaths || []
  );
  const [error, setError] = useState('');

  // File selection state
  const [searchQuery, setSearchQuery] = useState('');

  const isEditing = !!context;

  // Load file structure if not available
  useEffect(() => {
    if (activeProject && !fileStructure && !fileStructureLoading) {
      loadProjectFileStructure(activeProject.id);
    }
  }, [activeProject, fileStructure, fileStructureLoading, loadProjectFileStructure]);

  // Force reload file structure when modal opens
  useEffect(() => {
    if (activeProject) {
      loadProjectFileStructure(activeProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once when modal opens

  // Reset form when context changes
  useEffect(() => {
    if (context) {
      setContextName(context.name);
      setDescription(context.description || '');
      setSelectedGroupId(context.groupId || availableGroups[0]?.id || '');
      // Normalize existing context file paths
      setContextFilePaths(context.filePaths.map(normalizePath));
    } else {
      // New context - use selected files (normalized)
      setContextFilePaths(selectedFilePaths.map(normalizePath));
    }
    setError('');
  }, [context, selectedFilePaths, availableGroups]);

  const handleSave = async () => {
    if (!contextName.trim()) {
      setError('Context name is required');
      return;
    }

    if (contextFilePaths.length === 0) {
      setError('At least one file is required');
      return;
    }

    if (!activeProject) {
      setError('No active project selected');
      return;
    }

    try {
      if (isEditing && context) {
        await updateContext(context.id, {
          name: contextName.trim(),
          description: description.trim(),
          filePaths: contextFilePaths,
          groupId: selectedGroupId,
        });
        // Create updated context object for callback
        const updatedContext: Context = {
          ...context,
          name: contextName.trim(),
          description: description.trim(),
          filePaths: contextFilePaths,
          groupId: selectedGroupId,
          updatedAt: new Date(),
        };
        onSave?.(updatedContext);
      } else {
        await addContext({
          projectId: activeProject.id,
          groupId: selectedGroupId || null,
          name: contextName.trim(),
          description: description.trim(),
          filePaths: contextFilePaths,
        });
      }

      hideModal();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save context');
    }
  };

  const handleCancel = () => {
    onCancel?.();
    hideModal();
  };

  const handleFilePathToggle = (path: string) => {
    // Normalize the path to ensure consistency
    const normalizedPath = normalizePath(path);

    setContextFilePaths((prev) => {
      // Check if path already exists (normalized comparison)
      const existingIndex = prev.findIndex((p) => normalizePath(p) === normalizedPath);

      if (existingIndex >= 0) {
        // Remove existing path
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        // Add new path (normalized)
        return [...prev, normalizedPath];
      }
    });
  };

  const handleRemoveFile = (pathToRemove: string) => {
    const normalizedPathToRemove = normalizePath(pathToRemove);
    setContextFilePaths((prev) =>
      prev.filter((path) => normalizePath(path) !== normalizedPathToRemove)
    );
  };


  const handleRefreshFileStructure = () => {
    if (activeProject) {
      loadProjectFileStructure(activeProject.id);
    }
  };

  // Show message if no active project
  if (!activeProject) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No Active Project</h3>
          <p className="text-gray-500">Please select a project to create contexts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Section: Form and Action Buttons */}
      <div className="flex items-start justify-between gap-6 mb-6">
        {/* Context Form Section - Left Side */}
        <div className="flex-1">
          <ContextGenForm
            contextName={contextName}
            description={description}
            selectedGroupId={selectedGroupId}
            availableGroups={availableGroups}
            selectedFilePaths={contextFilePaths}
            projectPath={activeProject.path}
            onNameChange={setContextName}
            onDescriptionChange={setDescription}
            onGroupChange={setSelectedGroupId}
            onError={setError}
          />
        </div>

        {/* Action Buttons - Right Side */}
        <div className="flex flex-col gap-3 pt-7">
          <button
            onClick={handleSave}
            disabled={loading || !contextName.trim() || contextFilePaths.length === 0}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-xl hover:from-cyan-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-cyan-500/30 whitespace-nowrap shadow-lg"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Context'}</span>
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-3 text-sm text-gray-400 hover:text-gray-300 transition-colors border border-gray-700/30 rounded-xl hover:bg-gray-800/20"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* File Management Section - Full Width, Scrollable */}
      <div className="flex-1 overflow-hidden">
        <ContextGenFiles
          fileStructure={fileStructure}
          fileStructureLoading={fileStructureLoading}
          selectedPaths={contextFilePaths}
          searchQuery={searchQuery}
          onPathToggle={handleFilePathToggle}
          onRemoveFile={handleRemoveFile}
          onClearAll={() => setContextFilePaths([])}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefreshFileStructure}
          projectName={activeProject.name}
          projectPath={activeProject.path}
        />
      </div>
    </div>
  );
}
