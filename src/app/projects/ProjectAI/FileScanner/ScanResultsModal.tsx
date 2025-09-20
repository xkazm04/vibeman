import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, CheckCircle, Wrench, AlertCircle, ChevronDown } from 'lucide-react';

interface FileResult {
  fileName: string;
  hasChanges: boolean;
  description: string;
  docsAdded: boolean;
  codesCleaned: boolean;
  error?: string;
}

interface ScanResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: FileResult[];
  scanStats: {
    filesProcessed: number;
    docsUpdated: number;
    codesCleaned: number;
    errors: number;
  };
}

export default function ScanResultsModal({ isOpen, onClose, results, scanStats }: ScanResultsModalProps) {
  const [displayedResults, setDisplayedResults] = useState<FileResult[]>([]);
  const [loadedCount, setLoadedCount] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load initial results
  useEffect(() => {
    if (isOpen && results.length > 0) {
      setDisplayedResults(results.slice(0, 20));
      setLoadedCount(20);
    }
  }, [isOpen, results]);

  // Infinite scroll handler
  const handleScroll = () => {
    if (!scrollRef.current || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadMoreResults();
    }
  };

  const loadMoreResults = () => {
    if (isLoading || loadedCount >= results.length) return;

    setIsLoading(true);
    
    // Simulate loading delay for smooth UX
    setTimeout(() => {
      const nextBatch = results.slice(loadedCount, loadedCount + 20);
      setDisplayedResults(prev => [...prev, ...nextBatch]);
      setLoadedCount(prev => prev + 20);
      setIsLoading(false);
    }, 300);
  };

  const getFileIcon = (result: FileResult) => {
    if (result.error) return <AlertCircle className="w-5 h-5 text-red-400" />;
    if (result.hasChanges) return <CheckCircle className="w-5 h-5 text-green-400" />;
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  const getFileExtension = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const colors = {
      'ts': 'text-blue-400 bg-blue-500/20',
      'tsx': 'text-blue-400 bg-blue-500/20',
      'js': 'text-yellow-400 bg-yellow-500/20',
      'jsx': 'text-yellow-400 bg-yellow-500/20',
      'py': 'text-green-400 bg-green-500/20',
      'default': 'text-gray-400 bg-gray-500/20'
    };
    return colors[ext as keyof typeof colors] || colors.default;
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl border border-gray-700/50 shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Scan Results
              </h2>
              <div className="flex items-center space-x-6 text-sm">
                <span className="text-blue-400">{scanStats.filesProcessed} files processed</span>
                <span className="text-green-400">{scanStats.docsUpdated} docs added</span>
                <span className="text-purple-400">{scanStats.codesCleaned} code cleaned</span>
                {scanStats.errors > 0 && (
                  <span className="text-red-400">{scanStats.errors} errors</span>
                )}
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" />
            </motion.button>
          </div>
        </div>

        {/* Results List */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-3"
          onScroll={handleScroll}
        >
          <AnimatePresence>
            {displayedResults.map((result, index) => (
              <motion.div
                key={`${result.fileName}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
                className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-lg ${
                  result.error 
                    ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' 
                    : result.hasChanges
                    ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                    : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50'
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getFileIcon(result)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-white font-semibold truncate">{result.fileName}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-mono ${getFileExtension(result.fileName)}`}>
                        {result.fileName.split('.').pop()?.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className={`text-sm mb-3 ${
                      result.error ? 'text-red-300' : 'text-gray-300'
                    }`}>
                      {result.description}
                    </p>

                    {/* Indicators */}
                    <div className="flex items-center space-x-4">
                      {result.docsAdded && (
                        <div className="flex items-center space-x-1 text-xs text-green-400">
                          <FileText className="w-3 h-3" />
                          <span>Docs Added</span>
                        </div>
                      )}
                      {result.codesCleaned && (
                        <div className="flex items-center space-x-1 text-xs text-purple-400">
                          <Wrench className="w-3 h-3" />
                          <span>Code Cleaned</span>
                        </div>
                      )}
                      {result.error && (
                        <div className="flex items-center space-x-1 text-xs text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>Error</span>
                        </div>
                      )}
                      {!result.hasChanges && !result.error && (
                        <div className="text-xs text-gray-500">No changes needed</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-8"
            >
              <div className="flex items-center space-x-3 text-gray-400">
                <motion.div
                  className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="text-sm">Loading more results...</span>
              </div>
            </motion.div>
          )}

          {/* Load More Button */}
          {!isLoading && loadedCount < results.length && (
            <motion.button
              onClick={loadMoreResults}
              className="w-full p-4 text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 flex items-center justify-center space-x-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ChevronDown className="w-4 h-4" />
              <span>Load More ({results.length - loadedCount} remaining)</span>
            </motion.button>
          )}

          {/* End Message */}
          {loadedCount >= results.length && results.length > 20 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              All {results.length} results loaded
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700/50 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {Math.min(loadedCount, results.length)} of {results.length} files
            </div>
            <motion.button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-700/70 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Close
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}