import React from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, CheckCircle } from 'lucide-react';

export interface ScanStats {
  filesProcessed: number;
  docsUpdated: number;
  codesCleaned: number;
  errors: number;
}

interface FileScannerStatusProps {
  selectedOption: 'full-scan' | 'fix-errors' | 'test-scan' | null;
  scanPhase: 'calculating' | 'scanning' | 'complete' | 'build-analysis' | 'fixing-errors';
  progress: number;
  fileCount: number;
  currentFile: string;
  scanStats: ScanStats;
  writeFiles: boolean;
  onAbort: () => void;
  onViewResults: () => void;
  onStartFixing?: () => void;
  buildStats?: {
    totalErrors: number;
    totalWarnings: number;
    typescriptErrors: number;
    eslintErrors: number;
    webpackErrors: number;
    nextjsErrors: number;
    unknownErrors: number;
    unparsedErrors: number;
  };
  buildCommand?: string;
  executionTime?: number;
  fixStats?: {
    filesProcessed: number;
    errorsFixed: number;
    errorsSkipped: number;
    filesWithChanges: number;
  };
}

export default function FileScannerStatus({
  selectedOption,
  scanPhase,
  progress,
  fileCount,
  currentFile,
  scanStats,
  writeFiles,
  onAbort,
  onViewResults,
  onStartFixing,
  buildStats,
  buildCommand,
  executionTime,
  fixStats
}: FileScannerStatusProps) {
  return (
    <motion.div
      key="scanning"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Scan Progress */}
      <div className="text-center">
        <motion.div
          className="w-24 h-24 mx-auto mb-6 relative"
          animate={{ rotate: scanPhase === 'complete' ? 0 : 360 }}
          transition={{ duration: 2, repeat: scanPhase === 'complete' ? 0 : Infinity, ease: "linear" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full" />
          <div className="absolute inset-2 bg-gray-900 rounded-full flex items-center justify-center">
            {scanPhase === 'complete' ? (
              <FileText className="w-8 h-8 text-green-400" />
            ) : (
              <Search className="w-8 h-8 text-orange-400" />
            )}
          </div>
        </motion.div>

        <h3 className="text-xl font-bold text-white mb-2">
          {scanPhase === 'calculating' && 'Calculating Files...'}
          {scanPhase === 'scanning' && 'Scanning Project...'}
          {scanPhase === 'build-analysis' && 'Analyzing Build Errors...'}
          {scanPhase === 'fixing-errors' && 'Fixing Build Errors...'}
          {scanPhase === 'complete' && (selectedOption === 'fix-errors' ? 'Build Analysis Complete!' : 'Scan Complete!')}
        </h3>

        {scanPhase === 'calculating' && (
          <p className="text-gray-400 mb-4">
            Analyzing project structure and counting files...
          </p>
        )}

        {scanPhase === 'scanning' && (
          <p className="text-gray-400 mb-4">
            Processing: <span className="text-orange-400 font-mono">{currentFile}</span>
          </p>
        )}

        {scanPhase === 'build-analysis' && (
          <p className="text-gray-400 mb-4">
            Running build command and analyzing errors...
          </p>
        )}

        {scanPhase === 'fixing-errors' && (
          <p className="text-gray-400 mb-4">
            Fixing errors in: <span className="text-orange-400 font-mono">{currentFile}</span>
          </p>
        )}

        {fileCount > 0 && (
          <p className="text-gray-400 mb-6">
            {scanPhase === 'calculating' && `Found ${fileCount} files to process`}
            {scanPhase === 'scanning' && `Processing ${fileCount} files`}
            {scanPhase === 'complete' && `Processed ${fileCount} files`}
          </p>
        )}

        {/* File Scan Statistics - During Scanning */}
        {(selectedOption === 'test-scan' || selectedOption === 'full-scan') && scanPhase === 'scanning' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-blue-400">{scanStats.filesProcessed}</div>
              <div className="text-xs text-gray-400">Processed</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-green-400">{scanStats.docsUpdated}</div>
              <div className="text-xs text-gray-400">Docs Added</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-purple-400">{scanStats.codesCleaned}</div>
              <div className="text-xs text-gray-400">Code Cleaned</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-red-400">{scanStats.errors}</div>
              <div className="text-xs text-gray-400">Errors</div>
            </div>
          </div>
        )}

        {/* Build Error Statistics - During Build Analysis */}
        {selectedOption === 'fix-errors' && buildStats && scanPhase === 'build-analysis' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-red-400">{buildStats.totalErrors}</div>
              <div className="text-xs text-gray-400">Errors</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-yellow-400">{buildStats.totalWarnings}</div>
              <div className="text-xs text-gray-400">Warnings</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-blue-400">{buildStats.typescriptErrors}</div>
              <div className="text-xs text-gray-400">TypeScript</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-purple-400">{buildStats.eslintErrors}</div>
              <div className="text-xs text-gray-400">ESLint</div>
            </div>
          </div>
        )}

        {/* Error Fixing Statistics - During Fixing */}
        {selectedOption === 'fix-errors' && fixStats && scanPhase === 'fixing-errors' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-blue-400">{fixStats.filesProcessed}</div>
              <div className="text-xs text-gray-400">Files Processed</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-green-400">{fixStats.errorsFixed}</div>
              <div className="text-xs text-gray-400">Errors Fixed</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-yellow-400">{fixStats.errorsSkipped}</div>
              <div className="text-xs text-gray-400">Errors Skipped</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="text-lg font-bold text-purple-400">{fixStats.filesWithChanges}</div>
              <div className="text-xs text-gray-400">Files Changed</div>
            </div>
          </div>
        )}

        {/* Final File Scan Statistics - Complete */}
        {(selectedOption === 'test-scan' || selectedOption === 'full-scan') && scanPhase === 'complete' && (
          <div className="mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-800/60 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <h4 className="text-xl font-bold text-white mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
              Scan Complete
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-blue-400 mb-1">{scanStats.filesProcessed}</div>
                <div className="text-sm text-gray-400">Files Processed</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-green-400 mb-1">{scanStats.docsUpdated}</div>
                <div className="text-sm text-gray-400">Docs Added</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-purple-400 mb-1">{scanStats.codesCleaned}</div>
                <div className="text-sm text-gray-400">Code Cleaned</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-red-400 mb-1">{scanStats.errors}</div>
                <div className="text-sm text-gray-400">Errors</div>
              </div>
            </div>

            {/* Status Message */}
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                {writeFiles
                  ? `Scan completed with automatic file updates ${scanStats.filesProcessed > scanStats.errors ? '✓' : ''}`
                  : 'Scan completed in preview mode - no files were modified'
                }
              </p>
            </div>
          </div>
        )}

        {/* Final Build Error Statistics - Analysis Complete */}
        {selectedOption === 'fix-errors' && buildStats && scanPhase === 'complete' && !fixStats && (
          <div className="mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-800/60 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <h4 className="text-xl font-bold text-white mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
              Build Analysis Complete
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-red-400 mb-1">{buildStats.totalErrors}</div>
                <div className="text-sm text-gray-400">Build Errors</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-yellow-400 mb-1">{buildStats.totalWarnings}</div>
                <div className="text-sm text-gray-400">Warnings</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-blue-400 mb-1">{buildStats.typescriptErrors}</div>
                <div className="text-sm text-gray-400">TypeScript</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-purple-400 mb-1">{buildStats.eslintErrors}</div>
                <div className="text-sm text-gray-400">ESLint</div>
              </div>
            </div>

            {/* Build Command and Execution Time */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400 flex items-center mb-2">
                <FileText className="w-4 h-4 mr-2" />
                Build Command: <span className="font-mono ml-2">{buildCommand}</span>
              </p>
              {executionTime && (
                <p className="text-sm text-gray-400">
                  Execution Time: {(executionTime / 1000).toFixed(1)}s
                </p>
              )}
            </div>
          </div>
        )}

        {/* Final Error Fixing Statistics - Fixing Complete */}
        {selectedOption === 'fix-errors' && fixStats && scanPhase === 'complete' && (
          <div className="mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-800/60 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <h4 className="text-xl font-bold text-white mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
              Error Fixing Complete
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-blue-400 mb-1">{fixStats.filesProcessed}</div>
                <div className="text-sm text-gray-400">Files Processed</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-green-400 mb-1">{fixStats.errorsFixed}</div>
                <div className="text-sm text-gray-400">Errors Fixed</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-yellow-400 mb-1">{fixStats.errorsSkipped}</div>
                <div className="text-sm text-gray-400">Errors Skipped</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="text-3xl font-bold text-purple-400 mb-1">{fixStats.filesWithChanges}</div>
                <div className="text-sm text-gray-400">Files Changed</div>
              </div>
            </div>

            {/* Fix Summary */}
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                {fixStats.errorsFixed > 0 
                  ? `Successfully fixed ${fixStats.errorsFixed} errors in ${fixStats.filesWithChanges} files`
                  : 'No errors could be automatically fixed'
                }
                {fixStats.errorsSkipped > 0 && ` • ${fixStats.errorsSkipped} errors skipped for safety`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar - Only for file scanning, not build error analysis */}
      {selectedOption !== 'fix-errors' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>
              {scanPhase === 'calculating' ? 'Calculating Files...' :
                scanPhase === 'scanning' ? 'Scanning Files...' : 'Complete'}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Build Error Progress Indicator - No progress bar, just status */}
      {selectedOption === 'fix-errors' && scanPhase === 'fixing-errors' && (
        <div className="space-y-2">
          <div className="flex justify-center text-sm text-gray-400">
            <span>Fixing errors with AI assistance...</span>
          </div>
          <div className="flex justify-center">
            <motion.div
              className="w-6 h-6 border-2 border-orange-400/30 border-t-orange-400 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 pt-4">
        {scanPhase !== 'complete' ? (
          <motion.button
            onClick={onAbort}
            className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Abort {selectedOption === 'fix-errors' ? 'Analysis' : 'Scan'}
          </motion.button>
        ) : (
          <div className="flex space-x-4">
            {/* Fix Errors Button - Only show after build analysis is complete and no fixing has been done yet */}
            {selectedOption === 'fix-errors' && buildStats && !fixStats && buildStats.totalErrors > 0 && onStartFixing && (
              <motion.button
                onClick={onStartFixing}
                className="px-8 py-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:from-orange-500/30 hover:to-red-500/30 transition-all duration-300 font-semibold"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Fix {buildStats.totalErrors} Errors with AI
              </motion.button>
            )}
            
            {/* View Results Button */}
            <motion.button
              onClick={onViewResults}
              className="px-8 py-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-400 border border-green-500/30 rounded-lg hover:from-green-500/30 hover:to-blue-500/30 transition-all duration-300 font-semibold"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              View Detailed Results
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}