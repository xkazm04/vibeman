import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3,
  X,
  Eye,
  EyeOff,
  Check,
  Plus,
  Folder,
  FileText,
  Code,
  Image,
  Settings,
  Database
} from 'lucide-react';
import { ContextItem, ContextFile } from './types';

interface ContextCardProps {
  context: ContextItem;
  selectedFiles: Set<string>;
  transferMode: boolean;
  previewContext: string | null;
  onContextClick: (contextId: string) => void;
  onToggleSelection: (contextId: string) => void;
  onStartEdit: (contextId: string, title: string) => void;
  onTogglePreview: (contextId: string) => void;
  onFileClick: (filePath: string, contextId: string) => void;
}

export default function ContextCard({
  context,
  selectedFiles,
  transferMode,
  previewContext,
  onContextClick,
  onToggleSelection,
  onStartEdit,
  onTogglePreview,
  onFileClick
}: ContextCardProps) {
  const [editingTitle, setEditingTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleStartEdit = () => {
    setEditingTitle(context.title);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onStartEdit(context.id, editingTitle);
    setIsEditing(false);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTitle('');
  };

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

  return (
    <motion.div
      layout
      onClick={() => onContextClick(context.id)}
      className={`bg-gray-800/50 border rounded-xl overflow-hidden transition-all duration-200 ${
        context.selected
          ? 'border-green-500/50 shadow-lg shadow-green-500/10'
          : 'border-gray-700/30 hover:border-gray-600/50'
      } ${transferMode ? 'cursor-pointer hover:bg-gray-800/70' : ''}`}
    >
      {/* Context Header */}
      <div className="p-5 border-b border-gray-700/30">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelection(context.id);
              }}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                context.selected
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-500 hover:border-gray-400'
              }`}
            >
              {context.selected && <Check className="w-3 h-3 text-white" />}
            </button>

            {isEditing ? (
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveEdit}
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
                    handleStartEdit();
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
                onTogglePreview(context.id);
              }}
              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Preview content"
            >
              {previewContext === context.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
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

      {/* File List */}
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
                      onFileClick(file.path, context.id);
                    }}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      isSelected
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
  );
}