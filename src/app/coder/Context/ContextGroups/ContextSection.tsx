import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import ContextCard from '../ContextCard';

interface ContextSectionProps {
  group?: ContextGroup;
  contexts: Context[];
  projectId: string;
  className?: string;
  isEmpty?: boolean;
  onCreateGroup?: () => void;
  availableGroups: ContextGroup[];
  selectedFilePaths: string[];
}

export default function ContextSection({
  group,
  contexts,
  projectId,
  className = '',
  isEmpty = false,
  onCreateGroup,
  availableGroups,
  selectedFilePaths
}: ContextSectionProps) {
  const { moveContext } = useContextStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (group) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!group) return;

    const contextId = e.dataTransfer.getData('text/plain');
    if (contextId) {
      try {
        await moveContext(contextId, group.id);
      } catch (error) {
        console.error('Failed to move context:', error);
      }
    }
  };

  // Empty slot - show create group button
  if (isEmpty) {
    return (
      <div className={`${className} flex flex-col items-center justify-center`}>
        <button
          onClick={onCreateGroup}
          className="flex flex-col items-center justify-center w-full h-full p-4 hover:bg-gray-700/20 transition-colors group"
        >
          <div className="w-8 h-8 mb-2 bg-gray-700/30 group-hover:bg-gray-600/40 rounded-full flex items-center justify-center transition-colors">
            <Plus className="w-4 h-4 text-gray-500 group-hover:text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Add Group</p>
        </button>
      </div>
    );
  }

  // Group exists
  return (
    <div
      className={`${className} flex flex-col ${isDragOver ? 'bg-purple-500/10' : ''
        } transition-colors`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Group Header */}
      <div
        className="px-3 py-2 border-b border-gray-600/10"
        style={{ backgroundColor: `${group?.color}15` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: group?.color }}
            />
            <h4 className="text-xs font-medium text-gray-300 font-mono truncate">
              {group?.name || 'Unnamed Group'}
            </h4>
          </div>
          <span className="text-xs text-gray-500">{contexts.length}</span>
        </div>
      </div>

      {/* Context Cards */}
      <div className="flex-1 p-2 min-h-0">
        {contexts.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div
                className="w-6 h-6 mx-auto mb-1 rounded-full flex items-center justify-center opacity-50"
                style={{ backgroundColor: `${group?.color}20` }}
              >
                <Plus className="w-3 h-3" style={{ color: group?.color }} />
              </div>
              <p className="text-xs text-gray-500">Drop contexts here</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1 h-full">
            {contexts.map((context) => (
              <ContextCard
                key={context.id}
                context={context}
                groupColor={group?.color}
                availableGroups={availableGroups}
                selectedFilePaths={selectedFilePaths}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}