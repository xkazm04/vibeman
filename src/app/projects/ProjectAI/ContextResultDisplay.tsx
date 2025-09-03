import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  Plus,
  Check,
  Move,
  Folder,
  Code,
  Image,
  Settings,
  Database,
  Zap
} from 'lucide-react';

interface ContextFile {
  path: string;
  size?: number;
  type?: string;
  selected?: boolean;
}

interface ContextItem {
  id: string;
  filename: string;
  title: string;
  content: string;
  files: ContextFile[];
  selected: boolean;
  expanded: boolean;
}

interface ContextResultDisplayProps {
  contexts: Array<{ filename: string; content: string }>;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  activeProject: any;
}

export default function ContextResultDisplay({
  contexts,
  loading,
  error,
  onBack,
  activeProject
}: ContextResultDisplayProps) {
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [transferMode, setTransferMode] = useState(false);
  const [previewContext, setPreviewContext] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Initialize context items from props
  useEffect(() => {
    if (contexts.length > 0 && contextItems.length === 0) {
      const items: ContextItem[] = contexts.map((context, index) => {
        const files = extractFilesFromContent(context.content);
        const title = extractTitleFromContent(context.content) ||
          context.filename.replace('_context.md', '').replace(/_/g, ' ');

        return {
          id: `context-${index}`,
          filename: context.filename,
          title,
          content: context.content,
          files,
          selected: true,
          expanded: true // Default to expanded for better visibility
        };
      });
      setContextItems(items);
    }
  }, [contexts, contextItems.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (transferMode || selectedFiles.size > 0)) {
        setTransferMode(false);
        setSelectedFiles(new Set());
      }
      if (e.key === 'Enter' && transferMode && selectedFiles.size > 0) {
        // Could implement quick transfer to first context
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transferMode, selectedFiles.size]);

  // Extract files from context content
  const extractFilesFromContent = (content: string): ContextFile[] => {
    const files: ContextFile[] = [];
    const locationMapMatch = content.match(/##\s*(?:Architecture\s*)?(?:###\s*)?Location Map\s*\n(.*?)(?=\n##|\n#|$)/s);

    if (locationMapMatch) {
      const locationContent = locationMapMatch[1];
      const pathMatches = locationContent.matchAll(/([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)/g);

      for (const match of pathMatches) {
        const path = match[1];
        if (path && !files.some(f => f.path === path)) {
          files.push({
            path,
            type: path.split('.').pop() || 'file'
          });
        }
      }
    }

    return files;
  };

  // Extract title from content
  const extractTitleFromContent = (content: string): string | null => {
    const titleMatch = content.match(/^#\s*(?:Feature Context:\s*)?(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : null;
  };

  // Handle title editing
  const handleStartEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleSaveTitle = (id: string) => {
    setContextItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, title: editingTitle }
        : item
    ));
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  // Handle context selection
  const toggleContextSelection = (id: string) => {
    setContextItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, selected: !item.selected }
        : item
    ));
  };

  // Handle context expansion
  const toggleContextExpansion = (id: string) => {
    setContextItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, expanded: !item.expanded }
        : item
    ));
  };

  // Handle file selection for transfer
  const handleFileClick = (filePath: string, contextId: string) => {
    if (transferMode) {
      // In transfer mode, move selected files to this context
      moveSelectedFilesToContext(contextId);
    } else {
      // Toggle file selection
      const fileKey = `${contextId}:${filePath}`;
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        if (newSet.has(fileKey)) {
          newSet.delete(fileKey);
        } else {
          newSet.add(fileKey);
        }
        return newSet;
      });
    }
  };

  // Handle context click for file transfer
  const handleContextClick = (targetContextId: string) => {
    if (transferMode && selectedFiles.size > 0) {
      moveSelectedFilesToContext(targetContextId);
    }
  };

  // Move selected files to target context
  const moveSelectedFilesToContext = (targetContextId: string) => {
    const filesToMove: Array<{ file: ContextFile; sourceId: string }> = [];

    // Collect files to move
    selectedFiles.forEach(fileKey => {
      const [sourceId, filePath] = fileKey.split(':');
      const sourceContext = contextItems.find(ctx => ctx.id === sourceId);
      const file = sourceContext?.files.find(f => f.path === filePath);

      if (file && sourceId !== targetContextId) {
        filesToMove.push({ file, sourceId });
      }
    });

    if (filesToMove.length === 0) return;

    // Update context items
    setContextItems(prev => prev.map(item => {
      // Remove files from source contexts
      const filesToRemove = filesToMove
        .filter(f => f.sourceId === item.id)
        .map(f => f.file.path);

      if (filesToRemove.length > 0) {
        return {
          ...item,
          files: item.files.filter(f => !filesToRemove.includes(f.path))
        };
      }

      // Add files to target context
      if (item.id === targetContextId) {
        const newFiles = filesToMove
          .map(f => f.file)
          .filter(file => !item.files.some(existing => existing.path === file.path));

        return {
          ...item,
          files: [...item.files, ...newFiles]
        };
      }

      return item;
    }));

    // Clear selection and exit transfer mode
    setSelectedFiles(new Set());
    setTransferMode(false);
  };

  // Toggle transfer mode
  const toggleTransferMode = () => {
    if (selectedFiles.size === 0) return;
    setTransferMode(!transferMode);
  };

  // Handle save contexts
  const handleSaveContexts = async () => {
    const selectedContexts = contextItems.filter(item => item.selected);

    if (selectedContexts.length === 0) {
      alert('Please select at least one context to save.');
      return;
    }

    setSaving(true);

    try {
      // Save each selected context
      const savePromises = selectedContexts.map(async (context) => {
        // Update content with new file paths if they were moved
        const updatedContent = updateContentWithFiles(context.content, context.files);

        const response = await fetch('/api/kiro/save-context-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: `${activeProject?.path}/context/${context.filename}`,
            content: updatedContent,
            contextName: context.title
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(`Failed to save ${context.filename}: ${result.error}`);
        }

        return result;
      });

      await Promise.all(savePromises);

      console.log(`Successfully saved ${selectedContexts.length} context files`);

      // Show success and go back
      onBack();
    } catch (error) {
      console.error('Failed to save contexts:', error);
      alert(`Failed to save contexts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Update context content with current file list
  const updateContentWithFiles = (content: string, files: ContextFile[]): string => {
    // Find and replace the Location Map section
    const locationMapRegex = /(##\s*(?:Architecture\s*)?(?:###\s*)?Location Map\s*\n)(.*?)(?=\n##|\n#|$)/s;

    if (files.length === 0) {
      return content.replace(locationMapRegex, '$1\nNo files associated with this context.\n');
    }

    const fileList = files.map(file => `- ${file.path}`).join('\n');
    const newLocationMap = `$1\n${fileList}\n`;

    if (locationMapRegex.test(content)) {
      return content.replace(locationMapRegex, newLocationMap);
    } else {
      // Add Location Map section if it doesn't exist
      return content + `\n\n## Location Map\n\n${fileList}\n`;
    }
  };

  const selectedCount = contextItems.filter(item => item.selected).length;

  // Helper function to get file type icon and color
  const getFileTypeInfo = (type: string): { icon: React.ReactNode; color: string } => {
    switch (type.toLowerCase()) {
      case 'tsx':
      case 'jsx':
        return { icon: <Code className="w-4 h-4" />, color: 'text-blue-400' };
      case 'ts':
      case 'js':
        return { icon: <Code className="w-4 h-4" />, color: 'text-yellow-400' };
      case 'css':
      case 'scss':
        return { icon: <Settings className="w-4 h-4" />, color: 'text-pink-400' };
      case 'html':
        return { icon: <Code className="w-4 h-4" />, color: 'text-orange-400' };
      case 'json':
        return { icon: <Database className="w-4 h-4" />, color: 'text-green-400' };
      case 'md':
        return { icon: <FileText className="w-4 h-4" />, color: 'text-purple-400' };
      case 'py':
        return { icon: <Code className="w-4 h-4" />, color: 'text-green-500' };
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
        return { icon: <Image className="w-4 h-4" />, color: 'text-indigo-400' };
      default:
        return { icon: <FileText className="w-4 h-4" />, color: 'text-gray-400' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white">Context Scanner</h2>
              <p className="text-sm text-gray-400">Analyzing codebase and generating feature contexts...</p>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-white mb-2">Scanning Codebase</h3>
            <p className="text-gray-400 max-w-md">
              Analyzing your project structure and grouping files into logical feature contexts...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white">Context Scanner</h2>
              <p className="text-sm text-gray-400">Failed to generate context files</p>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Generation Failed</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700/30">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-white">Context Scanner</h2>
            <p className="text-gray-400">
              Review and organize {contextItems.length} contexts with {contextItems.reduce((total, ctx) => total + ctx.files.length, 0)} files
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center space-x-4">
          {selectedFiles.size > 0 && (
            <div className="flex items-center space-x-3 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <span className="text-blue-400 font-medium">
                {selectedFiles.size} files selected
              </span>
              <button
                onClick={toggleTransferMode}
                className={`flex items-center space-x-2 px-3 py-1 rounded transition-colors ${transferMode
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  }`}
              >
                <Move className="w-4 h-4" />
                <span>{transferMode ? 'Cancel Move' : 'Move Files'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const allSelected = selectedCount === contextItems.length;
                setContextItems(prev => prev.map(item => ({ ...item, selected: !allSelected })));
              }}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {selectedCount === contextItems.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-gray-400">
              {selectedCount} of {contextItems.length} selected
            </span>

            <button
              onClick={handleSaveContexts}
              disabled={selectedCount === 0 || saving}
              className="flex items-center space-x-2 px-6 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Selected</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {transferMode && (
        <div className="px-6 py-3 bg-orange-500/10 border-b border-orange-500/30">
          <div className="flex items-center space-x-2 text-orange-400">
            <Zap className="w-4 h-4" />
            <span className="font-medium">Transfer Mode Active</span>
            <span className="text-orange-300">- Click on any context to move selected files there</span>
          </div>
        </div>
      )}

      {/* Context Grid - Larger Layout */}
      <div className="flex-1 overflow-auto p-6">
        {contextItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Folder className="w-16 h-16 mx-auto text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Contexts Generated</h3>
              <p className="text-gray-400">Context files will appear here once generated</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
            {contextItems.map((context) => (
              <motion.div
                key={context.id}
                layout
                onClick={() => handleContextClick(context.id)}
                className={`bg-gray-800/50 border rounded-xl overflow-hidden transition-all duration-200 ${context.selected
                    ? 'border-green-500/50 shadow-lg shadow-green-500/10'
                    : 'border-gray-700/30 hover:border-gray-600/50'
                  } ${transferMode ? 'cursor-pointer hover:bg-gray-800/70' : ''
                  }`}
              >
                {/* Context Header */}
                <div className="p-5 border-b border-gray-700/30">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleContextSelection(context.id);
                        }}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${context.selected
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-500 hover:border-gray-400'
                          }`}
                      >
                        {context.selected && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {editingId === context.id ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveTitle(context.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveTitle(context.id)}
                            className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-lg truncate" title={context.title}>
                            {context.title}
                          </h3>
                          {context.files.length > 0 && (
                            <div className="flex-shrink-0 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
                              {context.files.length}
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(context.id, context.title);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewContext(previewContext === context.id ? null : context.id);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
                        title="Preview content"
                      >
                        {previewContext === context.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleContextExpansion(context.id);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
                        title="Toggle file list"
                      >
                        <Folder className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Context Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>{context.files.length} files</span>
                    </span>
                    <span>{(context.content.length / 1024).toFixed(1)}KB</span>
                  </div>
                </div>

                {/* File List - Always Expanded with Better Height */}
                <div className="h-80 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    {context.files.length > 0 ? (
                      <div className="space-y-2">
                        {context.files.map((file, index) => {
                          const fileKey = `${context.id}:${file.path}`;
                          const isSelected = selectedFiles.has(fileKey);
                          const fileTypeInfo = getFileTypeInfo(file.type || file.path.split('.').pop() || '');

                          return (
                            <div
                              key={`${file.path}-${index}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFileClick(file.path, context.id);
                              }}
                              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${isSelected
                                  ? 'bg-blue-500/20 border border-blue-500/50 shadow-sm'
                                  : 'bg-gray-700/30 hover:bg-gray-700/50 border border-transparent'
                                }`}
                            >
                              <div className={`flex-shrink-0 ${fileTypeInfo.color}`}>
                                {fileTypeInfo.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-200 truncate" title={file.path}>
                                  {file.path.split('/').pop()}
                                </div>
                                <div className="text-sm text-gray-400 truncate">
                                  {file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : 'root'}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="flex-shrink-0">
                                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Folder className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-center">No files detected</p>
                        <p className="text-sm text-center mt-1">Files will appear here when context is analyzed</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Preview */}
                <AnimatePresence>
                  {previewContext === context.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-700/30"
                    >
                      <div className="p-4 max-h-64 overflow-y-auto custom-scrollbar bg-gray-900/50">
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                          {context.content.slice(0, 1500)}
                          {context.content.length > 1500 && '\n... (truncated)'}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Transfer Target Indicator */}
                {transferMode && selectedFiles.size > 0 && (
                  <div className="p-4 border-t-2 border-dashed border-blue-500/50 bg-blue-500/10 text-center">
                    <div className="flex items-center justify-center space-x-2 text-blue-400">
                      <Plus className="w-5 h-5" />
                      <span className="font-medium">
                        Click to move {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''} here
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}