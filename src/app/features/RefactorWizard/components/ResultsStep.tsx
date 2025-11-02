'use client';

import { motion } from 'framer-motion';
import { useRefactorStore } from '@/stores/refactorStore';
import { CheckCircle, XCircle, FileCode, Download, RotateCcw } from 'lucide-react';

export default function ResultsStep() {
  const { scripts, activeScriptId, closeWizard, resetWizard } = useRefactorStore();

  const activeScript = scripts.find(s => s.id === activeScriptId);

  if (!activeScript) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No results available</p>
      </div>
    );
  }

  const isSuccess = activeScript.status === 'completed';
  const isFailed = activeScript.status === 'failed';

  const handleStartNew = () => {
    resetWizard();
  };

  const handleClose = () => {
    closeWizard();
    setTimeout(() => resetWizard(), 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Status Header */}
      <div className="text-center">
        {isSuccess ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="w-12 h-12 text-green-400" />
            </motion.div>
            <h3 className="text-2xl font-light text-white mb-2">Refactoring Complete!</h3>
            <p className="text-gray-400 text-sm">
              Successfully applied {activeScript.actions.length} refactoring actions
            </p>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center"
            >
              <XCircle className="w-12 h-12 text-red-400" />
            </motion.div>
            <h3 className="text-2xl font-light text-white mb-2">Refactoring Failed</h3>
            <p className="text-gray-400 text-sm">
              {activeScript.error || 'An error occurred during execution'}
            </p>
          </>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6">
        <h4 className="text-white font-medium mb-4">Execution Summary</h4>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Actions</p>
            <p className="text-white text-3xl font-light">{activeScript.actions.length}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Files Modified</p>
            <p className="text-white text-3xl font-light">
              {new Set(activeScript.actions.map(a => a.file)).size}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Success Rate</p>
            <p className={`text-3xl font-light ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
              {activeScript.progress}%
            </p>
          </div>
        </div>

        {/* Files Modified */}
        <div>
          <p className="text-gray-400 text-sm mb-3">Modified Files</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Array.from(new Set(activeScript.actions.map(a => a.file))).map((file, index) => (
              <div
                key={index}
                className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-center space-x-3"
              >
                <FileCode className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="text-white text-sm flex-1 truncate">{file}</span>
                {isSuccess && (
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {isSuccess && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <h4 className="text-blue-300 font-medium mb-2">Next Steps</h4>
          <ul className="space-y-2 text-sm text-blue-200/80">
            <li>• Review the changes in your code editor</li>
            <li>• Run tests to ensure everything works correctly</li>
            <li>• Commit the changes with a descriptive message</li>
            <li>• Consider running another analysis for additional improvements</li>
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
        <button
          onClick={handleStartNew}
          className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all flex items-center justify-center space-x-2"
          data-testid="start-new-refactor"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Start New Refactoring</span>
        </button>

        <button
          onClick={handleClose}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30"
          data-testid="close-refactor-wizard"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}
