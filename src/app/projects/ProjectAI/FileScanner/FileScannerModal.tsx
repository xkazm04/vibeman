import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import ScanResultsModal from './ScanResultsModal';
import BuildErrorResults from './BuildErrorResults';
import FileScannerOptions from './FileScannerOptions';
import FileScannerStatus, { ScanStats } from './FileScannerStatus';
import { FileResult, FileScanner, BuildErrorScanner, BuildError, BuildScanStats } from '@/lib/scanner';

interface FileScannerModalProps {
  activeProject: any;
  onClose: () => void;
}

export default function FileScannerModal({ activeProject, onClose }: FileScannerModalProps) {
  const [selectedOption, setSelectedOption] = useState<'full-scan' | 'fix-errors' | 'test-scan' | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState<'calculating' | 'scanning' | 'complete' | 'build-analysis' | 'fixing-errors'>('calculating');
  const [progress, setProgress] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [scanStats, setScanStats] = useState<ScanStats>({
    filesProcessed: 0,
    docsUpdated: 0,
    codesCleaned: 0,
    errors: 0
  });
  const [writeFiles, setWriteFiles] = useState(true);
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [currentScanner, setCurrentScanner] = useState<FileScanner | null>(null);

  // Build error scanning state
  const [buildErrors, setBuildErrors] = useState<BuildError[]>([]);
  const [buildWarnings, setBuildWarnings] = useState<BuildError[]>([]);
  const [buildStats, setBuildStats] = useState<BuildScanStats>({
    totalErrors: 0,
    totalWarnings: 0,
    typescriptErrors: 0,
    eslintErrors: 0,
    webpackErrors: 0,
    nextjsErrors: 0,
    unknownErrors: 0,
    unparsedErrors: 0
  });
  const [buildCommand, setBuildCommand] = useState('');
  const [executionTime, setExecutionTime] = useState(0);
  const [showBuildResults, setShowBuildResults] = useState(false);
  const [currentBuildScanner, setCurrentBuildScanner] = useState<BuildErrorScanner | null>(null);
  
  // Error fixing state
  const [fixStats, setFixStats] = useState<{
    filesProcessed: number;
    errorsFixed: number;
    errorsSkipped: number;
    filesWithChanges: number;
  } | undefined>(undefined);
  const [fixedErrors, setFixedErrors] = useState<Array<{
    file: string;
    line: number;
    column: number;
    originalError: string;
    fixApplied: string;
    confidence: 'high' | 'medium' | 'low';
  }>>([]);
  const [skippedErrors, setSkippedErrors] = useState<Array<{
    file: string;
    line: number;
    column: number;
    originalError: string;
    reason: string;
  }>>([]);

  const handleStartScan = async (optionId: 'full-scan' | 'fix-errors' | 'test-scan') => {
    setSelectedOption(optionId);
    setIsScanning(true);
    setScanPhase('calculating');
    setProgress(0);
    setScanStats({ filesProcessed: 0, docsUpdated: 0, codesCleaned: 0, errors: 0 });
    setFileResults([]);
    setFileCount(0);

    try {
      if (optionId === 'test-scan' || optionId === 'full-scan') {
        const scanner = new FileScanner(
          {
            onProgress: setProgress,
            onCurrentFile: setCurrentFile,
            onFileResult: (result: FileResult) => {
              setFileResults(prev => [...prev, result]);
            },
            onStatsUpdate: setScanStats,
            onFileCount: setFileCount,
            onPhaseChange: setScanPhase
          },
          {
            writeFiles,
            scanType: optionId === 'test-scan' ? 'test-scan' : 'full-scan'
          }
        );

        setCurrentScanner(scanner);

        if (optionId === 'test-scan') {
          await scanner.performTestScan();
        } else {
          await scanner.performFullScan();
        }
      } else if (optionId === 'fix-errors') {
        // Build error analysis (Step 1)
        setBuildErrors([]);
        setBuildWarnings([]);
        setBuildCommand('');
        setExecutionTime(0);
        setFixStats(undefined);
        setFixedErrors([]);
        setSkippedErrors([]);
        
        setScanPhase('build-analysis');

        const buildScanner = new BuildErrorScanner({
          onProgress: setProgress,
          onCurrentFile: setCurrentFile,
          onFileResult: () => { }, // Not used for build scanning
          onStatsUpdate: () => { }, // Not used for build scanning
          onFileCount: setFileCount,
          onPhaseChange: setScanPhase,
          onBuildStart: setBuildCommand,
          onBuildComplete: (result) => {
            setBuildErrors(result.errors);
            setBuildWarnings(result.warnings);
            setExecutionTime(result.executionTime);
          },
          onBuildStatsUpdate: setBuildStats
        });

        setCurrentBuildScanner(buildScanner);
        await buildScanner.performBuildScan(undefined, activeProject?.path);
      } else {
        // Fallback for other scan types
        await simulateCalculation();
        setScanPhase('scanning');
        await simulateScanning();
        setScanPhase('complete');
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScanPhase('complete');
    } finally {
      setCurrentScanner(null);
      setCurrentBuildScanner(null);
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

  const handleStartFixing = async () => {
    if (!buildErrors.length) return;
    
    setScanPhase('fixing-errors');
    setFixStats({
      filesProcessed: 0,
      errorsFixed: 0,
      errorsSkipped: 0,
      filesWithChanges: 0
    });
    
    try {
      // Group errors by file
      const errorsByFile = buildErrors.reduce((acc, error) => {
        if (!acc[error.file]) {
          acc[error.file] = [];
        }
        acc[error.file].push(error);
        return acc;
      }, {} as Record<string, BuildError[]>);
      
      const allFixedErrors: typeof fixedErrors = [];
      const allSkippedErrors: typeof skippedErrors = [];
      let totalFilesWithChanges = 0;
      
      // Process each file with errors
      for (const [filePath, fileErrors] of Object.entries(errorsByFile)) {
        setCurrentFile(filePath);
        
        try {
          // Call the file-scanner API to fix errors in this file
          const response = await fetch('/api/file-scanner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'fix-build-errors',
              filePath,
              buildErrors: fileErrors,
              writeFiles
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            
            if (result.hasChanges) {
              totalFilesWithChanges++;
            }
            
            allFixedErrors.push(...(result.fixedErrors || []));
            allSkippedErrors.push(...(result.skippedErrors || []));
          }
        } catch (error) {
          console.error(`Error fixing file ${filePath}:`, error);
          // Add all errors for this file to skipped
          allSkippedErrors.push(...fileErrors.map(err => ({
            file: err.file,
            line: err.line || 0,
            column: err.column || 0,
            originalError: err.message,
            reason: 'Failed to process file due to API error'
          })));
        }
        
        // Update progress
        setFixStats(prev => prev ? {
          ...prev,
          filesProcessed: prev.filesProcessed + 1,
          errorsFixed: allFixedErrors.length,
          errorsSkipped: allSkippedErrors.length,
          filesWithChanges: totalFilesWithChanges
        } : undefined);
      }
      
      setFixedErrors(allFixedErrors);
      setSkippedErrors(allSkippedErrors);
      setScanPhase('complete');
      
    } catch (error) {
      console.error('Error during fixing process:', error);
      setScanPhase('complete');
    }
  };

  const handleAbort = () => {
    if (currentScanner) {
      currentScanner.abort();
    }
    if (currentBuildScanner) {
      currentBuildScanner.abort();
    }
    setIsScanning(false);
    setSelectedOption(null);
    setScanPhase('calculating');
    setProgress(0);
    setScanStats({ filesProcessed: 0, docsUpdated: 0, codesCleaned: 0, errors: 0 });
    setFileResults([]);
    setBuildErrors([]);
    setBuildWarnings([]);
    setFixStats(undefined);
    setFixedErrors([]);
    setSkippedErrors([]);
    setCurrentScanner(null);
    setCurrentBuildScanner(null);
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
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
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
              <FileScannerOptions
                writeFiles={writeFiles}
                onWriteFilesChange={setWriteFiles}
                onStartScan={handleStartScan}
                onClose={onClose}
              />
            ) : (
              <FileScannerStatus
                selectedOption={selectedOption}
                scanPhase={scanPhase}
                progress={progress}
                fileCount={fileCount}
                currentFile={currentFile}
                scanStats={scanStats}
                writeFiles={writeFiles}
                onAbort={handleAbort}
                onViewResults={() => {
                  if (selectedOption === 'fix-errors') {
                    setShowBuildResults(true);
                  } else {
                    setShowResults(true);
                  }
                }}
                onStartFixing={selectedOption === 'fix-errors' ? handleStartFixing : undefined}
                buildStats={selectedOption === 'fix-errors' ? buildStats : undefined}
                buildCommand={buildCommand}
                executionTime={executionTime}
                fixStats={fixStats}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Scan Results Modal */}
      <ScanResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        results={fileResults}
        scanStats={scanStats}
      />

      {/* Build Error Results Modal */}
      <BuildErrorResults
        isOpen={showBuildResults}
        onClose={() => setShowBuildResults(false)}
        errors={buildErrors}
        warnings={buildWarnings}
        stats={buildStats}
        buildCommand={buildCommand}
        executionTime={executionTime}
        fixedErrors={fixedErrors}
        skippedErrors={skippedErrors}
        fixStats={fixStats}
      />
    </motion.div>
  );
}