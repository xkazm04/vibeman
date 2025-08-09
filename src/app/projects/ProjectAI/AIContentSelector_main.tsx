import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, Play, Pause, FileCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { codebaseScanCards, ideaGenerationCards, AIContentCard } from './aiContentConfig';

interface AIContentSelectorProps {
  onSelectMode: (mode: 'docs' | 'tasks' | 'goals' | 'context' | 'code', backgroundTask?: boolean) => void;
  activeProject: any;
}

export default function AIContentSelector({ onSelectMode, activeProject }: AIContentSelectorProps) {
  const [backgroundTask, setBackgroundTask] = React.useState(false);
  const [aiDocsExist, setAiDocsExist] = React.useState(false);
  const [checkingDocs, setCheckingDocs] = React.useState(true);

  // Check if AI docs exist
  React.useEffect(() => {
    const checkAIDocs = async () => {
      if (!activeProject?.path) {
        setCheckingDocs(false);
        return;
      }

      try {
        const response = await fetch('/api/kiro/read-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: `${activeProject.path}/context/high.md`
          })
        });

        setAiDocsExist(response.ok);
      } catch (error) {
        setAiDocsExist(false);
      } finally {
        setCheckingDocs(false);
      }
    };

    checkAIDocs();
  }, [activeProject?.path]);

  const renderCard = (card: AIContentCard, index: number, disabled: boolean = false) => {
    const Icon = card.icon;
    return (
      <motion.button
        key={card.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        whileHover={disabled ? {} : { scale: 1.02, y: -2 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        onClick={() => !disabled && onSelectMode(card.id as 'docs' | 'tasks' | 'goals' | 'context' | 'code', backgroundTask)}
        disabled={disabled}
        className={`group relative p-6 bg-gradient-to-br ${card.gradient} ${disabled ? '' : card.hoverGradient} border ${card.borderColor} rounded-xl transition-all duration-300 text-left overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
      >
        {/* Disabled Overlay */}
        {disabled && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-400 font-medium">AI Docs Required</p>
            </div>
          </div>
        )}

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, currentColor 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <div className="mb-4">
            <div className={`inline-flex p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 ${disabled ? '' : 'group-hover:border-gray-600/50'} transition-colors`}>
              <Icon className={`w-6 h-6 ${card.iconColor}`} />
            </div>
          </div>

          {/* Title */}
          <h3 className={`text-lg font-semibold text-white mb-2 font-mono ${disabled ? '' : 'group-hover:text-gray-100'} transition-colors`}>
            {card.title}
          </h3>

          {/* Description */}
          <p className={`text-sm text-gray-400 leading-relaxed ${disabled ? '' : 'group-hover:text-gray-300'} transition-colors`}>
            {card.description}
          </p>

          {/* Action Indicator */}
          <div className={`mt-4 flex items-center space-x-2 text-xs text-gray-500 ${disabled ? '' : 'group-hover:text-gray-400'} transition-colors`}>
            <Zap className="w-3 h-3" />
            <span>Powered by Ollama AI</span>
          </div>
        </div>

        {/* Hover Effect */}
        {!disabled && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            initial={false}
          />
        )}
      </motion.button>
    );
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Status Indicators */}
      <div className="w-64 bg-gray-900/50 border-r border-gray-700/30 p-6 flex flex-col">
        {/* Status Indicators */}
        <div className="space-y-4 flex-1">
          {/* AI Docs Status */}
          <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">AI Documentation</span>
              {checkingDocs ? (
                <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
              ) : aiDocsExist ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
            </div>
            <p className="text-xs text-gray-400">
              {checkingDocs ? 'Checking...' : aiDocsExist ? 'Available at context/high.md' : 'Not found - Generate AI Docs first'}
            </p>
          </div>

          {/* Ollama Status */}
          <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Ollama Service</span>
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-xs text-gray-400">Running on localhost:11434</p>
          </div>

          {/* Project Info */}
          {activeProject && (
            <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">Active Project</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-xs text-gray-400 font-mono">{activeProject.name}</p>
            </div>
          )}
        </div>

        {/* Enhanced Background Task Toggle */}
        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <motion.label
            className="flex items-center cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative">
              <input
                type="checkbox"
                checked={backgroundTask}
                onChange={(e) => setBackgroundTask(e.target.checked)}
                className="sr-only"
              />
              <motion.div
                className={`w-12 h-6 rounded-full border-2 transition-colors duration-200 ${backgroundTask
                  ? 'bg-purple-500/20 border-purple-500/50'
                  : 'bg-gray-700/50 border-gray-600/50'
                  }`}
                animate={{
                  backgroundColor: backgroundTask ? 'rgba(168, 85, 247, 0.2)' : 'rgba(55, 65, 81, 0.5)'
                }}
              >
                <motion.div
                  className={`w-4 h-4 rounded-full shadow-lg flex items-center justify-center ${backgroundTask ? 'bg-purple-500' : 'bg-gray-500'
                    }`}
                  animate={{
                    x: backgroundTask ? 24 : 2,
                    backgroundColor: backgroundTask ? '#a855f7' : '#6b7280'
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{ y: 2 }}
                >
                  {backgroundTask ? (
                    <Play className="w-2 h-2 text-white" />
                  ) : (
                    <Pause className="w-2 h-2 text-white" />
                  )}
                </motion.div>
              </motion.div>
            </div>
            <div className="ml-3">
              <span className="text-sm font-medium text-white">Background Mode</span>
              <p className="text-xs text-gray-400">Auto-save results</p>
            </div>
          </motion.label>
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 font-mono">
            AI Project Assistant
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Choose how you'd like AI to help analyze and improve your project.
            Each option provides different insights and actionable recommendations.
          </p>
        </div>

        {/* Codebase Scan Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <FileCheck className="w-5 h-5 text-blue-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Codebase Scan</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Analyze your project structure, code quality, and generate comprehensive documentation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {codebaseScanCards.map((card, index) => renderCard(card, index))}
          </div>
        </div>

        {/* Idea Generation Section */}
        <div>
          <div className="flex items-center mb-4">
            <Brain className="w-5 h-5 text-purple-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Idea Generation</h3>
            {!aiDocsExist && (
              <div className="ml-2 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400">
                Requires AI Docs
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Generate strategic goals and implementation tasks based on your project analysis.
            {!aiDocsExist && (
              <span className="text-red-400 ml-1">
                Generate AI Docs first to unlock these features.
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideaGenerationCards.map((card, index) => renderCard(card, index, !aiDocsExist))}
          </div>
        </div>
      </div>
    </div>
  );
}