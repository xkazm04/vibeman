import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, BookOpen, Play, Pause } from 'lucide-react';
import LLMSelector from '../LLMSelector';
import { SupportedProvider } from '../../../../lib/llm';
import ClaudeCodeInit from './ClaudeCodeInit';

interface AILeftPanelProps {
  aiDocsExist: boolean;
  checkingDocs: boolean;
  activeProject: any;
  selectedProvider: SupportedProvider;
  backgroundTask: boolean;
  onProviderSelect: (provider: SupportedProvider) => void;
  onBackgroundTaskChange: (enabled: boolean) => void;
  onShowAIDocs: () => void;
}

export default function AILeftPanel({
  aiDocsExist,
  checkingDocs,
  activeProject,
  selectedProvider,
  backgroundTask,
  onProviderSelect,
  onBackgroundTaskChange,
  onShowAIDocs
}: AILeftPanelProps) {
  return (
    <motion.div 
      className="w-72 bg-gradient-to-b from-gray-900/60 to-gray-900/80 backdrop-blur-xl border-r border-gray-700/40 p-6 flex flex-col shadow-2xl"
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated Header */}
      <motion.div 
        className="mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h3 className="text-lg font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
          System Status
        </h3>
        <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-blue-500 rounded-full"></div>
      </motion.div>

      {/* Status Indicators */}
      <div className="space-y-4 flex-1">
        {/* AI Docs Status with Enhanced Interactivity */}
        <motion.div
          className={`p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/40 transition-all duration-300 ${
            aiDocsExist && !checkingDocs
              ? 'cursor-pointer hover:bg-gradient-to-br hover:from-gray-800/60 hover:to-gray-800/80 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10'
              : ''
          }`}
          onClick={aiDocsExist && !checkingDocs ? onShowAIDocs : undefined}
          whileHover={aiDocsExist && !checkingDocs ? { scale: 1.02, y: -2 } : {}}
          whileTap={aiDocsExist && !checkingDocs ? { scale: 0.98 } : {}}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">AI Documentation</span>
            <div className="flex items-center space-x-2">
              {checkingDocs ? (
                <motion.div 
                  className="w-4 h-4 border-2 border-gray-400/30 border-t-blue-400 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : aiDocsExist ? (
                <motion.div className="flex items-center space-x-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, type: "spring" }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </motion.div>
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <BookOpen className="w-4 h-4 text-blue-400" />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </motion.div>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {checkingDocs
              ? 'Scanning project structure...'
              : aiDocsExist
                ? 'Available at context/high.md - Click to explore'
                : 'Not found - Generate AI Docs first'
            }
          </p>
        </motion.div>

        {/* Ollama Status with Pulse Animation */}
        <motion.div 
          className="p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Ollama Service</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </motion.div>
          </div>
          <p className="text-xs text-gray-400">
            <span className="text-green-400 font-mono">●</span> Running on localhost:11434
          </p>
        </motion.div>

        {/* Project Info with Gradient Border */}
        {activeProject && (
          <motion.div 
            className="p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/40 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            {/* Animated Border */}
            <motion.div
              className="absolute inset-0 rounded-xl opacity-30"
              style={{
                background: 'linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Active Project</span>
                <motion.div 
                  className="w-2 h-2 bg-green-400 rounded-full"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <p className="text-xs text-gray-400 font-mono bg-gray-900/30 px-2 py-1 rounded">
                {activeProject.name}
              </p>
            </div>
          </motion.div>
        )}

        {/* Claude Code Initialization */}
        {activeProject && (
          <ClaudeCodeInit
            projectPath={activeProject.path}
            projectName={activeProject.name}
            projectId={activeProject.id}
          />
        )}
      </div>

      {/* LLM Provider Selection with Enhanced Styling */}
      <motion.div 
        className="mt-8 p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/40"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <div className="mb-4">
          <span className="text-sm font-semibold text-white bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
            AI Provider
          </span>
          <p className="text-xs text-gray-400 mt-1">Choose your preferred AI model</p>
        </div>
        <LLMSelector
          selectedProvider={selectedProvider}
          onProviderSelect={onProviderSelect}
        />
      </motion.div>

      {/* Enhanced Background Task Toggle */}
      <motion.div 
        className="mt-4 p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/40"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        <motion.label
          className="flex items-center cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="relative">
            <input
              type="checkbox"
              checked={backgroundTask}
              onChange={(e) => onBackgroundTaskChange(e.target.checked)}
              className="sr-only"
            />
            <motion.div
              className={`w-14 h-7 rounded-full border-2 transition-colors duration-300 ${
                backgroundTask
                  ? 'bg-blue-500/30 border-blue-500/60 shadow-lg shadow-blue-500/20'
                  : 'bg-gray-700/50 border-gray-600/50'
              }`}
              animate={{
                backgroundColor: backgroundTask ? 'rgba(168, 85, 247, 0.3)' : 'rgba(55, 65, 81, 0.5)'
              }}
            >
              <motion.div
                className={`w-5 h-5 rounded-full shadow-lg flex items-center justify-center ${
                  backgroundTask ? 'bg-blue-500' : 'bg-gray-500'
                }`}
                animate={{
                  x: backgroundTask ? 28 : 2,
                  backgroundColor: backgroundTask ? '#a855f7' : '#6b7280'
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{ y: 2 }}
              >
                <motion.div
                  animate={{ rotate: backgroundTask ? 360 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {backgroundTask ? (
                    <Play className="w-2.5 h-2.5 text-white" />
                  ) : (
                    <Pause className="w-2.5 h-2.5 text-white" />
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
          <div className="ml-4">
            <span className="text-sm font-semibold text-white">Background Mode</span>
            <p className="text-xs text-gray-400">Auto-save results to project</p>
          </div>
        </motion.label>
      </motion.div>
    </motion.div>
  );
}