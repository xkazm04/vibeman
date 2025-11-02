'use client';

import { motion } from 'framer-motion';
import { useRefactorStore } from '@/stores/refactorStore';
import { Play, CheckCircle, XCircle, FileCode, ArrowRight } from 'lucide-react';

export default function ExecuteStep() {
  const { scripts, activeScriptId, executeScript, setCurrentStep } = useRefactorStore();

  const activeScript = scripts.find(s => s.id === activeScriptId);

  if (!activeScript) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No script available</p>
      </div>
    );
  }

  const handleExecute = async () => {
    if (activeScript && activeScript.status === 'pending') {
      await executeScript(activeScript.id);
    }
  };

  const isRunning = activeScript.status === 'running';
  const isCompleted = activeScript.status === 'completed';
  const isFailed = activeScript.status === 'failed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-light text-white mb-2">Execute Refactoring</h3>
        <p className="text-gray-400 text-sm">
          {activeScript.title}
        </p>
      </div>

      {/* Script Details */}
      <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-sm mb-2">Description</p>
            <p className="text-white">{activeScript.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Total Actions</p>
              <p className="text-white text-2xl font-light">{activeScript.actions.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Files Affected</p>
              <p className="text-white text-2xl font-light">
                {new Set(activeScript.actions.map(a => a.file)).size}
              </p>
            </div>
          </div>

          {/* Progress */}
          {(isRunning || isCompleted) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Progress</span>
                <span className="text-cyan-400 font-medium">{activeScript.progress}%</span>
              </div>
              <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${activeScript.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {isFailed && activeScript.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium">Execution Failed</p>
                  <p className="text-red-200/80 text-sm mt-1">{activeScript.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions Preview */}
      <div className="space-y-3">
        <h4 className="text-white font-medium">Actions to Execute</h4>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {activeScript.actions.slice(0, 10).map((action, index) => (
            <div
              key={action.id}
              className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-start space-x-3"
            >
              <FileCode className="w-4 h-4 text-cyan-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{action.description}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {action.type} • {action.file}
                </p>
              </div>
            </div>
          ))}

          {activeScript.actions.length > 10 && (
            <p className="text-gray-400 text-sm text-center">
              + {activeScript.actions.length - 10} more actions
            </p>
          )}
        </div>
      </div>

      {/* Execute Button */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <button
          onClick={() => setCurrentStep('review')}
          disabled={isRunning}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all disabled:opacity-50"
        >
          Back
        </button>

        {isCompleted ? (
          <button
            onClick={() => setCurrentStep('results')}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/30 flex items-center space-x-2"
            data-testid="view-results"
          >
            <CheckCircle className="w-5 h-5" />
            <span>View Results</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleExecute}
            disabled={isRunning}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none flex items-center space-x-2"
            data-testid="execute-refactor-script"
          >
            {isRunning ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Play className="w-5 h-5" />
                </motion.div>
                <span>Executing...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Execute Refactoring</span>
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
