import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import { useActiveProjectStore } from '../../../../stores/activeProjectStore';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import { GlowCard } from '../../../../components/GlowCard';
import FileTreeSelector from './FileTreeSelector';
import SelectedFilesList from './SelectedFilesList';
import { normalizePath } from '../../../../utils/pathUtils';

interface EnhancedContextEditModalProps {
  context?: Context; // undefined for new context
  availableGroups: ContextGroup[];
  selectedFilePaths: string[]; // Currently selected files in the tree
  onSave?: (context: Context) => void;
  onCancel?: () => void;
}



export const EnhancedContextEditModal: React.FC<EnhancedContextEditModalProps> = ({
  context,
  availableGroups,
  selectedFilePaths,
  onSave,
  onCancel
}) => {
  const { addContext, updateContext, loading } = useContextStore();
  const { activeProject, fileStructure, loadProjectFileStructure, isLoading: fileStructureLoading } = useActiveProjectStore();
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
  const [backgroundProcessing, setBackgroundProcessing] = useState(false);

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
    
    setContextFilePaths(prev => {
      // Check if path already exists (normalized comparison)
      const existingIndex = prev.findIndex(p => normalizePath(p) === normalizedPath);
      
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
    setContextFilePaths(prev => prev.filter(path => normalizePath(path) !== normalizedPathToRemove));
  };

  const handleBackgroundGeneration = async () => {
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

    setBackgroundProcessing(true);
    setError('');

    try {
      // Generate a simple prompt for context generation
      const prompt = `Generate comprehensive documentation for the following code context:

Context Name: ${contextName.trim()}
${description ? `Description: ${description.trim()}` : ''}

Files included:
${contextFilePaths.map(path => `- ${path}`).join('\n')}

Please provide:
1. Overview of the context and its purpose
2. Key components and their relationships
3. Important patterns and conventions used
4. Dependencies and interactions
5. Usage examples where applicable

Focus on being comprehensive yet concise, highlighting the most important aspects for developers working with this code.`;

      const response = await fetch('/api/kiro/generate-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextName: contextName.trim(),
          description: description.trim(),
          filePaths: contextFilePaths,
          groupId: selectedGroupId,
          projectId: activeProject.id,
          projectPath: activeProject.path,
          generateFile: true,
          prompt: prompt,
          model: 'llama3.1:8b' // Default model
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate context');
      }

      // Context was created successfully
      hideModal();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate context');
    } finally {
      setBackgroundProcessing(false);
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
    <div className="space-y-6">
      {/* Context Details Section */}
      <div className="space-y-4">
        {/* Context Name and Group in same row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Context Name *
            </label>
            <input
              type="text"
              value={contextName}
              onChange={(e) => {
                setContextName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Authentication Components"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Group *
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            >
              {availableGroups.map((group) => (
                <option key={group.id} value={group.id} className="bg-gray-800 text-white">
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this context..."
            rows={3}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
            maxLength={200}
          />
        </div>
      </div>

      {/* File Management Section - Split Layout */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-300">
          Files ({contextFilePaths.length})
        </label>

        <div className="grid grid-cols-2 gap-6 h-96">
          {/* Left Side - File Tree */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-400">Project Files</h4>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Select files to include</span>
                {activeProject && (
                  <button
                    onClick={() => loadProjectFileStructure(activeProject.id)}
                    disabled={fileStructureLoading}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                  >
                    {fileStructureLoading ? 'Loading...' : 'Refresh'}
                  </button>
                )}
              </div>
            </div>
            <GlowCard className="p-0 h-full">
              {fileStructureLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-400">Loading project files...</p>
                    {activeProject && (
                      <p className="text-xs text-gray-500 mt-1">Project: {activeProject.name}</p>
                    )}
                  </div>
                </div>
              ) : !fileStructure ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 mb-2">No project files loaded</p>
                    {activeProject && (
                      <button
                        onClick={() => loadProjectFileStructure(activeProject.id)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Load Project Files
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <FileTreeSelector
                  fileStructure={fileStructure}
                  selectedPaths={contextFilePaths}
                  onPathToggle={handleFilePathToggle}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              )}
            </GlowCard>
          </div>

          {/* Right Side - Selected Files List */}
          <SelectedFilesList
            selectedPaths={contextFilePaths}
            onRemoveFile={handleRemoveFile}
            onClearAll={() => setContextFilePaths([])}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
        <button
          onClick={handleBackgroundGeneration}
          disabled={backgroundProcessing || loading || contextFilePaths.length === 0}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          title="Generate context file in background using AI"
        >
          <Zap className="w-4 h-4" />
          <span>{backgroundProcessing ? 'Processing...' : 'Generate in Background'}</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !contextName.trim() || contextFilePaths.length === 0}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-xl hover:from-cyan-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-cyan-500/30"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Context'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedContextEditModal;