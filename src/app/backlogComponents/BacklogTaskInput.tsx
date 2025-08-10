import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Check, X, FileText, FolderTree, Loader2 } from 'lucide-react';
import { useContextStore } from '../../stores/contextStore';
import { useStore } from '../../stores/nodeStore';
import { useActiveProjectStore } from '../../stores/activeProjectStore';

interface BacklogTaskInputProps {
  onTaskGenerated?: (taskId: string) => void;
}

export default function BacklogTaskInput({ onTaskGenerated }: BacklogTaskInputProps) {
  const [taskRequest, setTaskRequest] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null);
  const [mode, setMode] = useState<'context' | 'individual'>('individual');
  
  const { contexts, selectedContextIds } = useContextStore();
  const { selectedNodes, getSelectedFilePaths } = useStore();
  const { activeProject, fileStructure } = useActiveProjectStore();

  // Get selected contexts
  const selectedContexts = contexts.filter(ctx => selectedContextIds.has(ctx.id));
  
  // Get selected file paths
  const selectedFilePaths = getSelectedFilePaths(fileStructure, activeProject?.id || null);

  // Check if we can send the request
  const canSend = taskRequest.trim().length > 0 && 
    !isProcessing && 
    ((mode === 'context' && selectedContexts.length > 0) || 
     (mode === 'individual' && selectedFilePaths.length > 0));

  const handleSubmit = async () => {
    if (!canSend || !activeProject) return;

    setIsProcessing(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/backlog/generate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectName: activeProject.name,
          projectPath: activeProject.path,
          taskRequest: taskRequest.trim(),
          mode,
          selectedContexts: mode === 'context' ? selectedContexts : [],
          selectedFilePaths: mode === 'individual' ? selectedFilePaths : []
        })
      });

      const result = await response.json();

      if (result.success) {
        setLastResult('success');
        setTaskRequest(''); // Clear input on success
        onTaskGenerated?.(result.taskId);
      } else {
        setLastResult('error');
        console.error('Failed to generate task:', result.error);
      }
    } catch (error) {
      setLastResult('error');
      console.error('Error generating task:', error);
    } finally {
      setIsProcessing(false);
      
      // Clear result after 3 seconds
      setTimeout(() => setLastResult(null), 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getStatusInfo = () => {
    if (mode === 'context') {
      if (selectedContexts.length === 0) {
        return { text: 'Select contexts', color: 'text-yellow-400' };
      }
      return { 
        text: `${selectedContexts.length} context${selectedContexts.length === 1 ? '' : 's'}`, 
        color: 'text-green-400' 
      };
    } else {
      if (selectedFilePaths.length === 0) {
        return { text: 'Select files', color: 'text-yellow-400' };
      }
      return { 
        text: `${selectedFilePaths.length} file${selectedFilePaths.length === 1 ? '' : 's'}`, 
        color: 'text-green-400' 
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="flex items-center space-x-3 px-4 py-2 bg-gray-800/50 border-b border-gray-700/30">
      {/* Mode Toggle */}
      <div className="flex items-center bg-gray-700/30 rounded-lg p-1">
        <button
          onClick={() => setMode('individual')}
          className={`p-2 rounded-md transition-all duration-200 ${
            mode === 'individual'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          title="Individual files mode"
        >
          <FileText className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMode('context')}
          className={`p-2 rounded-md transition-all duration-200 ${
            mode === 'context'
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          title="Context files mode"
        >
          <FolderTree className="w-4 h-4" />
        </button>
      </div>

      {/* Input Field */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={taskRequest}
          onChange={(e) => setTaskRequest(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Enter task request (${mode === 'context' ? 'using selected contexts' : 'using selected files'})...`}
          className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/70 transition-all duration-200"
          disabled={isProcessing}
        />
        
        {/* Status indicator */}
        <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${statusInfo.color}`}>
          {statusInfo.text}
        </div>
      </div>

      {/* Result Icon */}
      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="p-2"
          >
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          </motion.div>
        ) : lastResult === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="p-2"
          >
            <Check className="w-5 h-5 text-green-400" />
          </motion.div>
        ) : lastResult === 'error' ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="p-2"
          >
            <X className="w-5 h-5 text-red-400" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Send Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSend}
        className={`p-2 rounded-lg transition-all duration-200 ${
          canSend
            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300'
            : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
        }`}
        title="Generate backlog task"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}