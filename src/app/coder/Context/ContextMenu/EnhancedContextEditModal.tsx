import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  AlertCircle, 
  Zap, 
  FileText, 
  FolderTree, 
  Plus, 
  X, 
  Check,
  Search,
  Filter
} from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import { useActiveProjectStore } from '../../../../stores/activeProjectStore';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import { TreeNode as TreeNodeType } from '../../../../types';
import { useStore } from '../../../../stores/nodeStore';
import TreeView from '../../CodeTree/TreeView';
import { GlowCard } from '../../../../components/GlowCard';

interface EnhancedContextEditModalProps {
  context?: Context; // undefined for new context
  availableGroups: ContextGroup[];
  selectedFilePaths: string[]; // Currently selected files in the tree
  onSave?: (context: Context) => void;
  onCancel?: () => void;
}

interface FileTreeSelectorProps {
  fileStructure: TreeNodeType | null;
  selectedPaths: string[];
  onPathToggle: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const FileTreeSelector: React.FC<FileTreeSelectorProps> = ({
  fileStructure,
  selectedPaths,
  onPathToggle,
  searchQuery,
  onSearchChange
}) => {
  const { toggleNode, selectedNodes, clearSelection } = useStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Filter tree based on search query
  const filteredStructure = useMemo(() => {
    if (!fileStructure || !searchQuery.trim()) return fileStructure;
    
    const filterNode = (node: TreeNodeType): TreeNodeType | null => {
      const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           node.path.toLowerCase().includes(searchQuery.toLowerCase());
      
      const filteredChildren = node.children?.map(filterNode).filter(Boolean) as TreeNodeType[] || [];
      
      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      
      return null;
    };
    
    return filterNode(fileStructure);
  }, [fileStructure, searchQuery]);

  const handleNodeToggle = (nodePath: string) => {
    onPathToggle(nodePath);
    toggleNode(nodePath);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-700/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>
        
        {selectedPaths.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {selectedPaths.length} files selected
            </span>
            <button
              onClick={() => {
                selectedPaths.forEach(path => onPathToggle(path));
                clearSelection();
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto">
        {filteredStructure ? (
          <TreeView
            activeProject={null}
            filteredStructure={filteredStructure}
            isLoading={false}
            error={null}
            onToggleNode={handleNodeToggle}
            onRefresh={() => {}}
            onClearError={() => {}}
            onClearSearch={() => onSearchChange('')}
            showCheckboxes={true}
            selectedPaths={selectedPaths}
          />
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files found</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const EnhancedContextEditModal: React.FC<EnhancedContextEditModalProps> = ({
  context,
  availableGroups,
  selectedFilePaths,
  onSave,
  onCancel
}) => {
  const { addContext, updateContext, loading } = useContextStore();
  const { activeProject, fileStructure } = useActiveProjectStore();
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

  // Reset form when context changes
  useEffect(() => {
    if (context) {
      setContextName(context.name);
      setDescription(context.description || '');
      setSelectedGroupId(context.groupId || availableGroups[0]?.id || '');
      setContextFilePaths([...context.filePaths]);
    } else {
      // New context - use selected files
      setContextFilePaths([...selectedFilePaths]);
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
        const updatedContext = await updateContext(context.id, {
          name: contextName.trim(),
          description: description.trim(),
          filePaths: contextFilePaths,
          groupId: selectedGroupId,
        });
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
    setContextFilePaths(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const handleRemoveFile = (pathToRemove: string) => {
    setContextFilePaths(prev => prev.filter(path => path !== pathToRemove));
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
      
      // Show success message
      console.log('Context created with generated file:', result.contextFilePath);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate context');
    } finally {
      setBackgroundProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Context Details Section */}
      <div className="space-y-4">
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
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
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
              <span className="text-xs text-gray-500">Select files to include</span>
            </div>
            <GlowCard className="p-0 h-full">
              <FileTreeSelector
                fileStructure={fileStructure}
                selectedPaths={contextFilePaths}
                onPathToggle={handleFilePathToggle}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </GlowCard>
          </div>

          {/* Right Side - Selected Files List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-400">Selected Files</h4>
              {contextFilePaths.length > 0 && (
                <button
                  onClick={() => setContextFilePaths([])}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            
            <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl h-full overflow-hidden">
              {contextFilePaths.length > 0 ? (
                <div className="h-full overflow-y-auto p-3 space-y-2">
                  {contextFilePaths.map((filePath, index) => (
                    <motion.div
                      key={filePath}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-2 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors group"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300 truncate font-mono">
                          {filePath}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(filePath)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FolderTree className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No files selected</p>
                  <p className="text-xs mt-1 text-center px-4">
                    Select files from the project tree on the left
                  </p>
                </div>
              )}
            </div>
          </div>
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
          className="flex items-center space-x-2 px-4 py-2.5 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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