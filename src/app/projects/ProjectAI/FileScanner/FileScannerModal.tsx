import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Wrench, X, FileText, TestTube, CheckCircle } from 'lucide-react';

interface FileScannerModalProps {
  activeProject: any;
  onClose: () => void;
}

interface ScanOption {
  id: 'full-scan' | 'fix-errors' | 'test-scan';
  title: string;
  description: string;
  bulletPoints: string[];
  icon: any;
  gradient: string;
  borderColor: string;
  hoverGradient: string;
  iconColor: string;
}

interface ScanStats {
  filesProcessed: number;
  docsUpdated: number;
  codesCleaned: number;
  errors: number;
}

const scanOptions: ScanOption[] = [
  {
    id: 'full-scan',
    title: 'Perform Full Scan',
    description: 'Comprehensive analysis of your entire project structure and codebase.',
    bulletPoints: [
      'Analyzes all code files and dependencies',
      'Generates detailed project metrics and insights',
      'Creates comprehensive documentation and reports'
    ],
    icon: Search,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    hoverGradient: 'hover:from-blue-500/30 hover:to-cyan-500/30',
    iconColor: 'text-blue-400'
  },
  {
    id: 'fix-errors',
    title: 'Fix Build Errors',
    description: 'Intelligent detection and resolution of build and compilation errors.',
    bulletPoints: [
      'Scans for TypeScript, ESLint, and build errors',
      'Provides automated fixes and suggestions',
      'Improves code quality and project stability'
    ],
    icon: Wrench,
    gradient: 'from-orange-500/20 to-red-500/20',
    borderColor: 'border-orange-500/30',
    hoverGradient: 'hover:from-orange-500/30 hover:to-red-500/30',
    iconColor: 'text-orange-400'
  },
  {
    id: 'test-scan',
    title: 'Test LLM Scan',
    description: 'Test the LLM scanning logic with 3 example files to validate functionality.',
    bulletPoints: [
      'Scans 3 pre-selected test files with LLM',
      'Removes unused code and adds documentation',
      'Perfect for testing before full project scan'
    ],
    icon: TestTube,
    gradient: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    hoverGradient: 'hover:from-purple-500/30 hover:to-pink-500/30',
    iconColor: 'text-purple-400'
  }
];

export default function FileScannerModal({ activeProject, onClose }: FileScannerModalProps) {
  const [selectedOption, setSelectedOption] = useState<'full-scan' | 'fix-errors' | 'test-scan' | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState<'calculating' | 'scanning' | 'complete'>('calculating');
  const [progress, setProgress] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [scanStats, setScanStats] = useState<ScanStats>({
    filesProcessed: 0,
    docsUpdated: 0,
    codesCleaned: 0,
    errors: 0
  });

  const handleStartScan = async (optionId: 'full-scan' | 'fix-errors' | 'test-scan') => {
    setSelectedOption(optionId);
    setIsScanning(true);
    setScanPhase('calculating');
    setProgress(0);
    setScanStats({ filesProcessed: 0, docsUpdated: 0, codesCleaned: 0, errors: 0 });

    try {
      if (optionId === 'test-scan') {
        await performTestScan();
      } else {
        // Phase 1: Calculating files
        await simulateCalculation();
        
        // Phase 2: Scanning files
        setScanPhase('scanning');
        await simulateScanning();
      }
      
      // Complete
      setScanPhase('complete');
    } catch (error) {
      console.error('Scan error:', error);
      setScanPhase('complete');
    }
  };

  const simulateCalculation = async () => {
    // Simulate calculating file count
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    setFileCount(Math.floor(Math.random() * 200) + 50); // Random file count between 50-250
  };

  const simulateScanning = async () => {
    const files = [
      'src/components/Button.tsx',
      'src/pages/Dashboard.tsx',
      'src/utils/helpers.ts',
      'src/hooks/useAuth.ts',
      'src/api/endpoints.ts',
      'package.json',
      'tsconfig.json',
      'src/styles/globals.css'
    ];

    for (let i = 0; i < fileCount; i++) {
      const currentFileIndex = i % files.length;
      setCurrentFile(files[currentFileIndex]);
      setProgress((i / fileCount) * 100);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s per file as requested
    }
    setProgress(100);
  };

  const performTestScan = async () => {
    try {
      console.log('Starting test scan from client...');
      
      // Get test files first
      const filesResponse = await fetch('/api/file-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-scan' })
      });

      if (!filesResponse.ok) {
        throw new Error('Failed to get test files');
      }

      const testFiles = await filesResponse.json();
      setFileCount(testFiles.length);
      setScanPhase('scanning');

      console.log(`Client: Found ${testFiles.length} test files to process`);

      // Process each test file sequentially
      for (let i = 0; i < testFiles.length; i++) {
        const file = testFiles[i];
        const fileIndex = i + 1;
        
        console.log(`Client: Starting file ${fileIndex}/${testFiles.length}: ${file.path}`);
        setCurrentFile(file.path);
        
        try {
          // Scan file with LLM - sequential processing
          const scanResponse = await fetch('/api/file-scanner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'scan-file',
              filePath: file.path,
              fileContent: file.content,
              fileIndex,
              totalFiles: testFiles.length
            })
          });

          if (scanResponse.ok) {
            const result = await scanResponse.json();
            
            console.log(`Client: Completed file ${fileIndex}/${testFiles.length}: ${file.path} - Changes: ${result.hasChanges}`);
            
            setScanStats(prev => ({
              filesProcessed: prev.filesProcessed + 1,
              docsUpdated: prev.docsUpdated + (result.changesSummary?.documentationAdded ? 1 : 0),
              codesCleaned: prev.codesCleaned + (result.changesSummary?.unusedItemsRemoved > 0 ? 1 : 0),
              errors: prev.errors
            }));
          } else {
            console.log(`Client: Error processing file ${fileIndex}/${testFiles.length}: ${file.path}`);
            setScanStats(prev => ({ ...prev, errors: prev.errors + 1 }));
          }
        } catch (error) {
          console.error(`Client: Exception processing file ${fileIndex}/${testFiles.length}:`, file.path, error);
          setScanStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        }

        // Update progress
        setProgress((fileIndex / testFiles.length) * 100);

        // Wait 1 second per file as requested (except for the last file)
        if (i < testFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('Client: All files processed, generating log...');

      // Generate comprehensive log file after all processing is complete
      try {
        const logResponse = await fetch('/api/file-scanner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'test-scan-with-llm' })
        });

        if (logResponse.ok) {
          const logResult = await logResponse.json();
          console.log('Client: Test scan log generated at:', logResult.logPath);
        }
      } catch (logError) {
        console.error('Client: Error generating log:', logError);
      }

    } catch (error) {
      console.error('Client: Test scan error:', error);
      setScanStats(prev => ({ ...prev, errors: prev.errors + 1 }));
    }
  };

  const handleAbort = () => {
    setIsScanning(false);
    setSelectedOption(null);
    setScanPhase('calculating');
    setProgress(0);
    setScanStats({ filesProcessed: 0, docsUpdated: 0, codesCleaned: 0, errors: 0 });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl border border-gray-700/50 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, currentColor 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }}></div>
          </div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                File Scanner
              </h2>
              <p className="text-gray-400">
                Advanced project analysis for {activeProject?.name || 'your project'}
              </p>
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

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {!isScanning ? (
              <motion.div
                key="options"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Scan Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {scanOptions.map((option, index) => {
                    const Icon = option.icon;
                    return (
                      <motion.button
                        key={option.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleStartScan(option.id)}
                        className={`group relative p-6 bg-gradient-to-br ${option.gradient} ${option.hoverGradient} border ${option.borderColor} rounded-xl transition-all duration-300 text-left overflow-hidden hover:shadow-xl hover:shadow-orange-500/10`}
                      >
                        {/* Background Icon */}
                        <motion.div 
                          className="absolute inset-0 flex items-center justify-center opacity-5 overflow-hidden"
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Icon className="w-32 h-32 text-white" />
                        </motion.div>

                        {/* Content */}
                        <div className="relative z-10">
                          <h3 className="text-xl font-bold text-white mb-3 group-hover:text-gray-100 transition-colors">
                            {option.title}
                          </h3>
                          <p className="text-sm text-gray-300 mb-4 group-hover:text-gray-200 transition-colors">
                            {option.description}
                          </p>
                          <ul className="space-y-2">
                            {option.bulletPoints.map((point, i) => (
                              <li key={i} className="text-xs text-gray-400 flex items-start group-hover:text-gray-300 transition-colors">
                                <div className="w-1 h-1 bg-current rounded-full mt-2 mr-2 flex-shrink-0" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Hover Effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          initial={false}
                        />
                      </motion.button>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700/50">
                  <motion.button
                    onClick={onClose}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            ) : (
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
                    {scanPhase === 'complete' && 'Scan Complete!'}
                  </h3>

                  {scanPhase === 'scanning' && (
                    <p className="text-gray-400 mb-4">
                      Processing: <span className="text-orange-400 font-mono">{currentFile}</span>
                    </p>
                  )}

                  {fileCount > 0 && scanPhase !== 'calculating' && (
                    <p className="text-gray-400 mb-6">
                      {scanPhase === 'complete' ? 'Processed' : 'Processing'} {fileCount} files
                    </p>
                  )}

                  {/* Scan Statistics */}
                  {selectedOption === 'test-scan' && scanPhase === 'scanning' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                        <div className="text-lg font-bold text-blue-400">{scanStats.filesProcessed}</div>
                        <div className="text-xs text-gray-400">Files Processed</div>
                      </div>
                      <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                        <div className="text-lg font-bold text-green-400">{scanStats.docsUpdated}</div>
                        <div className="text-xs text-gray-400">Docs Updated</div>
                      </div>
                      <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                        <div className="text-lg font-bold text-purple-400">{scanStats.codesCleaned}</div>
                        <div className="text-xs text-gray-400">Codes Cleaned</div>
                      </div>
                      <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                        <div className="text-lg font-bold text-red-400">{scanStats.errors}</div>
                        <div className="text-xs text-gray-400">Errors</div>
                      </div>
                    </div>
                  )}

                  {/* Final Statistics */}
                  {selectedOption === 'test-scan' && scanPhase === 'complete' && (
                    <div className="mb-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                        Scan Results
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">{scanStats.filesProcessed}</div>
                          <div className="text-sm text-gray-400">Files Processed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">{scanStats.docsUpdated}</div>
                          <div className="text-sm text-gray-400">Docs Updated</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">{scanStats.codesCleaned}</div>
                          <div className="text-sm text-gray-400">Codes Cleaned</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-400">{scanStats.errors}</div>
                          <div className="text-sm text-gray-400">Errors</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>
                      {scanPhase === 'calculating' ? 'Calculating...' : 
                       scanPhase === 'scanning' ? 'Scanning...' : 'Complete'}
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

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4 pt-4">
                  {scanPhase !== 'complete' ? (
                    <motion.button
                      onClick={handleAbort}
                      className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Abort Scan
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={onClose}
                      className="px-6 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      View Results
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}