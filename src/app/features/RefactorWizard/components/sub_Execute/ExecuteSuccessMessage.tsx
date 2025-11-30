'use client';

import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ExecuteSuccessMessageProps {
  createdFiles: string[];
  isDirectMode: boolean;
}

/**
 * ExecuteSuccessMessage - Displays success message with file list and next steps.
 * 
 * Shows after requirement files have been successfully created.
 * Provides guidance on how to use the generated files.
 */
export function ExecuteSuccessMessage({ createdFiles, isDirectMode }: ExecuteSuccessMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30 rounded-lg p-4"
      data-testid="creation-success-message"
    >
      <div className="flex items-start gap-3">
        <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-green-300 font-medium mb-2">
            Requirement Files Created Successfully!
          </h4>
          <p className="text-gray-300 text-sm mb-3">
            {createdFiles.length} file{createdFiles.length !== 1 ? 's have' : ' has'} been generated in{' '}
            <code className="px-1.5 py-0.5 bg-black/30 rounded text-xs font-mono">
              .claude/commands/
            </code>
          </p>
          <div className="space-y-1 mb-3 max-h-32 overflow-y-auto pr-2">
            {createdFiles.map((file, index) => (
              <div
                key={index}
                className="text-xs text-gray-400 font-mono flex items-center gap-2"
              >
                <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                {file}
              </div>
            ))}
          </div>
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 mt-3">
            <p className="text-cyan-300 text-sm font-medium mb-2">Next Steps:</p>
            <ul className="text-gray-400 text-sm space-y-1">
              {isDirectMode ? (
                <>
                  <li>• Execute batch files in order (01, 02, etc.)</li>
                  <li>• Each file contains up to 20 related issues</li>
                  <li>• Use Claude Code to implement each batch</li>
                </>
              ) : (
                <>
                  <li>• Execute packages in order (starting with #1)</li>
                  <li>• Each package includes full context from CLAUDE.md</li>
                  <li>• Dependency information ensures safe execution</li>
                  <li>• Use Claude Code to implement each package systematically</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
