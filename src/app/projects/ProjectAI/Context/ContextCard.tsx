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
        return { icon: <Settings className="w-4 h-4" />, color: 'text-red-400' };
      case 'html':
        return { icon: <Code className="w-4 h-4" />, color: 'text-orange-400' };
      case 'json':
        return { icon: <Database className="w-4 h-4" />, color: 'text-green-400' };
      case 'md':
        return { icon: <FileText className="w-4 h-4" />, color: 'text-blue-400' };
      case 'py':
        return { icon: <Code className="w-4 h-4" />, color: 'text-green-500' };
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
        return { icon: <Image className="w-4 h-4" />, color: 'text-slate-400' };
      default:
        return { icon: <FileText className="w-4 h-4" />, color: 'text-gray-400' };
    }
  };

  return (
    <motion.div
      layout
      onClick={() => onContextClick(context.id)}
      className={`relative bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-gray-900/80 border rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl transition-all duration-300 ${
        context.selected
          ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/20 bg-gradient-to-br from-cyan-900/20 via-gray-800/80 to-slate-900/20'
          : 'border-gray-700/30 hover:border-gray-600/50 hover:shadow-lg'
      } ${transferMode ? 'cursor-pointer hover:bg-gray-800/70' : ''}`}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/*  Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5 rounded-2xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent rounded-2xl" />
      
      {/* Animated Grid Pattern */}
      <motion.div
        className="absolute inset-0 opacity-5 rounded-2xl"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '10px 10px'
        }}
        animate={{
          backgroundPosition: ['0px 0px', '10px 10px'],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      {/*  Context Header */}
      <div className="relative p-5 border-b border-gray-700/30 bg-gradient-to-r from-gray-800/30 via-transparent to-gray-800/30 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelection(context.id);
              }}
              className={`flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 backdrop-blur-sm ${
                context.selected
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 border-cyan-400 shadow-lg shadow-cyan-500/30'
                  : 'border-gray-500 hover:border-cyan-400 hover:bg-cyan-500/10'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {context.selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.button>

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
                <motion.h3 
                  className="font-semibold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent text-lg truncate font-mono" 
                  title={context.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {context.title}
                </motion.h3>
                {context.files.length > 0 && (
                  <motion.div 
                    className="flex-shrink-0 px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 text-xs rounded-full font-medium border border-cyan-500/30 backdrop-blur-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  >
                    {context.files.length} nodes
                  </motion.div>
                )}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit();
                  }}
                  className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-cyan-500/30"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Edit3 className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePreview(context.id);
              }}
              className={`p-2 rounded-lg transition-all duration-300 backdrop-blur-sm border ${
                previewContext === context.id 
                  ? 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30' 
                  : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/30'
              }`}
              title="Preview content"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {previewContext === context.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </motion.button>
            <motion.button
              className="p-2 text-gray-400 hover:text-slate-400 hover:bg-slate-500/10 rounded-lg transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-slate-500/30"
              title=" file matrix"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Folder className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/*  Context Stats */}
        <motion.div 
          className="flex items-center justify-between text-sm text-gray-400 font-mono"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="flex items-center space-x-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <FileText className="w-4 h-4 text-cyan-400" />
            </motion.div>
            <span className="text-cyan-400">{context.files.length}  links</span>
          </span>
          <motion.span 
            className="text-slate-400"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {(context.content.length / 1024).toFixed(1)}KB data
          </motion.span>
        </motion.div>
      </div>

      {/*  File Matrix */}
      <div className="h-80 overflow-hidden flex flex-col relative">
        {/* Floating Particles */}
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/40 rounded-full z-10"
            style={{
              left: `${20 + i * 30}%`,
              top: `${20 + i * 20}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
          {context.files.length > 0 ? (
            <div className="space-y-2">
              {context.files.map((file, index) => {
                const fileKey = `${context.id}:${file.path}`;
                const isSelected = selectedFiles.has(fileKey);
                const fileTypeInfo = getFileTypeInfo(file.type || file.path.split('.').pop() || '');

                return (
                  <motion.div
                    key={`${file.path}-${index}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileClick(file.path, context.id);
                    }}
                    className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-300 backdrop-blur-sm ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                        : 'bg-gray-700/30 hover:bg-gradient-to-r hover:from-gray-700/40 hover:to-gray-600/40 border border-transparent hover:border-gray-600/50'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                  >
                    <motion.div 
                      className={`flex-shrink-0 ${fileTypeInfo.color} p-2 rounded-lg bg-gray-800/50 backdrop-blur-sm`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {fileTypeInfo.icon}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-200 truncate font-mono" title={file.path}>
                        {file.path.split('/').pop()}
                      </div>
                      <div className="text-sm text-gray-400 truncate font-mono">
                        {file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : 'root'}
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div 
                        className="flex-shrink-0"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500 }}
                      >
                        <div className="w-5 h-5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div 
              className="flex flex-col items-center justify-center h-full text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Folder className="w-12 h-12 mb-3 opacity-50 text-cyan-400" />
              </motion.div>
              <p className="text-center font-mono text-cyan-400/70"> matrix empty</p>
              <p className="text-sm text-center mt-1 font-mono">Awaiting context analysis initialization</p>
            </motion.div>
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