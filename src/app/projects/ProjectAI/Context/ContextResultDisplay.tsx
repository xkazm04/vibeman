import React, { useState, useEffect } from 'react';
import { Folder } from 'lucide-react';
import { ContextItem, ContextResultDisplayProps } from './types';
import { extractFilesFromContent, extractTitleFromContent, updateContentWithFiles } from './utils';
import ContextHeader from './ContextHeader';
import ContextCard from './ContextCard';
import LoadingState from './ContextLoadingState';
import ErrorState from './ContextErrorState';
import TransferModeBar from './ContextTransferModeBar';

export default function ContextResultDisplay({
  contexts,
  loading,
  error,
  onBack,
  activeProject
}: ContextResultDisplayProps) {
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
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
          expanded: true
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transferMode, selectedFiles.size]);

  // Handle title editing
  const handleStartEdit = (id: string, newTitle: string) => {
    setContextItems(prev => prev.map(item =>
      item.id === id ? { ...item, title: newTitle } : item
    ));
  };

  // Handle context selection
  const toggleContextSelection = (id: string) => {
    setContextItems(prev => prev.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  // Handle file selection for transfer
  const handleFileClick = (filePath: string, contextId: string) => {
    if (transferMode) {
      moveSelectedFilesToContext(contextId);
    } else {
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
    const filesToMove: Array<{ file: any; sourceId: string }> = [];

    selectedFiles.forEach(fileKey => {
      const [sourceId, filePath] = fileKey.split(':');
      const sourceContext = contextItems.find(ctx => ctx.id === sourceId);
      const file = sourceContext?.files.find(f => f.path === filePath);

      if (file && sourceId !== targetContextId) {
        filesToMove.push({ file, sourceId });
      }
    });

    if (filesToMove.length === 0) return;

    setContextItems(prev => prev.map(item => {
      const filesToRemove = filesToMove
        .filter(f => f.sourceId === item.id)
        .map(f => f.file.path);

      if (filesToRemove.length > 0) {
        return {
          ...item,
          files: item.files.filter(f => !filesToRemove.includes(f.path))
        };
      }

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

    setSelectedFiles(new Set());
    setTransferMode(false);
  };

  // Toggle transfer mode
  const toggleTransferMode = () => {
    if (selectedFiles.size === 0) return;
    setTransferMode(!transferMode);
  };

  // Handle select all
  const handleSelectAll = () => {
    const allSelected = contextItems.every(item => item.selected);
    setContextItems(prev => prev.map(item => ({ ...item, selected: !allSelected })));
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
      // Prepare contexts for batch saving
      const contextsToSave = selectedContexts.map(context => ({
        filename: context.filename,
        content: updateContentWithFiles(context.content, context.files),
        title: context.title,
        filePaths: context.files.map(f => f.path),
        description: extractDescriptionFromContent(context.content)
      }));

      const response = await fetch('/api/disk/save-contexts-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contexts: contextsToSave,
          projectPath: activeProject?.path,
          projectId: activeProject?.id || 'default-project'
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save contexts');
      }

      console.log(`Successfully saved ${result.successCount} context files`);
      
      if (result.failureCount > 0) {
        console.warn(`${result.failureCount} contexts failed to save:`, result.results.filter((r: { success: boolean }) => !r.success));
        alert(`Saved ${result.successCount} contexts successfully, but ${result.failureCount} failed. Check console for details.`);
      }
      
      onBack();
    } catch (error) {
      console.error('Failed to save contexts:', error);
      alert(`Failed to save contexts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Helper function to extract description from content
  const extractDescriptionFromContent = (content: string): string | undefined => {
    const descriptionMatch = content.match(/##\s*(?:Core Functionality|Overview|Description)\s*\n(.*?)(?=\n##|\n#|$)/s);
    return descriptionMatch ? descriptionMatch[1].trim().split('\n')[0] : undefined;
  };

  const selectedCount = contextItems.filter(item => item.selected).length;
  const totalFiles = contextItems.reduce((total, ctx) => total + ctx.files.length, 0);

  if (loading) {
    return <LoadingState onBack={onBack} />;
  }

  if (error) {
    return <ErrorState error={error} onBack={onBack} />;
  }

  return (
    <div className="flex flex-col h-full">
      <ContextHeader
        contextCount={contextItems.length}
        totalFiles={totalFiles}
        selectedCount={selectedCount}
        selectedFiles={selectedFiles}
        transferMode={transferMode}
        saving={saving}
        onBack={onBack}
        onSelectAll={handleSelectAll}
        onToggleTransferMode={toggleTransferMode}
        onSave={handleSaveContexts}
      />

      {transferMode && <TransferModeBar selectedFilesCount={selectedFiles.size} />}

      {/* Context Grid */}
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
              <ContextCard
                key={context.id}
                context={context}
                selectedFiles={selectedFiles}
                transferMode={transferMode}
                previewContext={previewContext}
                onContextClick={handleContextClick}
                onToggleSelection={toggleContextSelection}
                onStartEdit={handleStartEdit}
                onTogglePreview={(contextId) => 
                  setPreviewContext(previewContext === contextId ? null : contextId)
                }
                onFileClick={handleFileClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}