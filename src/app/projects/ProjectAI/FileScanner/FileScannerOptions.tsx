import React from 'react';
import { motion } from 'framer-motion';
import { Search, Wrench, TestTube, FileText } from 'lucide-react';

export interface ScanOption {
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

export const scanOptions: ScanOption[] = [
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
    gradient: 'from-blue-500/20 to-red-500/20',
    borderColor: 'border-blue-500/30',
    hoverGradient: 'hover:from-blue-500/30 hover:to-red-500/30',
    iconColor: 'text-blue-400'
  }
];

interface FileScannerOptionsProps {
  writeFiles: boolean;
  onWriteFilesChange: (writeFiles: boolean) => void;
  onStartScan: (optionId: 'full-scan' | 'fix-errors' | 'test-scan') => void;
  onClose: () => void;
}

export default function FileScannerOptions({
  writeFiles,
  onWriteFilesChange,
  onStartScan,
  onClose
}: FileScannerOptionsProps) {
  return (
    <motion.div
      key="options"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* File Writing Toggle */}
      <div className="mb-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <motion.label
          className="flex items-center cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="relative">
            <input
              type="checkbox"
              checked={writeFiles}
              onChange={(e) => onWriteFilesChange(e.target.checked)}
              className="sr-only"
            />
            <motion.div
              className={`w-12 h-6 rounded-full border-2 transition-colors duration-200 ${
                writeFiles
                  ? 'bg-green-500/20 border-green-500/50'
                  : 'bg-gray-700/50 border-gray-600/50'
              }`}
              animate={{
                backgroundColor: writeFiles ? 'rgba(34, 197, 94, 0.2)' : 'rgba(55, 65, 81, 0.5)'
              }}
            >
              <motion.div
                className={`w-4 h-4 rounded-full shadow-lg flex items-center justify-center ${
                  writeFiles ? 'bg-green-500' : 'bg-gray-500'
                }`}
                animate={{
                  x: writeFiles ? 24 : 2,
                  backgroundColor: writeFiles ? '#22c55e' : '#6b7280'
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{ y: 2 }}
              >
                <FileText className="w-2 h-2 text-white" />
              </motion.div>
            </motion.div>
          </div>
          <div className="ml-3">
            <span className="text-sm font-medium text-white">Write Files to Disk</span>
            <p className="text-sm text-gray-400">
              {writeFiles ? 'Files will be automatically updated' : 'Scan only, no file changes'}
            </p>
          </div>
        </motion.label>
      </div>

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
              onClick={() => onStartScan(option.id)}
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
                    <li key={i} className="text-sm text-gray-400 flex items-start group-hover:text-gray-300 transition-colors">
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
  );
}