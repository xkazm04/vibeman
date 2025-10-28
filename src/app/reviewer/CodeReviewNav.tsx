import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Edit3, XIcon, X, Check } from 'lucide-react';
import {
  ReviewFile,
  ReviewSession,
  acceptFile,
  rejectFile,
  declineSession,
  calculateTotalFiles,
  calculateGlobalFileIndex,
  isFirstFile,
  isLastFile,
  removeFileFromSessions,
  getContentToApply,
  calculateProgress
} from './lib';

interface CodeReviewNavProps {
  sessions: ReviewSession[];
  currentSessionIndex: number;
  currentFileIndex: number;
  currentFile: ReviewFile | undefined;
  onPrevious: () => void;
  onNext: () => void;
  onToggleEdit: () => void;
  onSessionsUpdate: (sessions: ReviewSession[]) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  setCurrentSessionIndex: (index: number) => void;
  setCurrentFileIndex: (index: number) => void;
}

export default function CodeReviewNav({
  sessions,
  currentSessionIndex,
  currentFileIndex,
  currentFile,
  onPrevious,
  onNext,
  onToggleEdit,
  onSessionsUpdate,
  onComplete,
  onError,
  setCurrentSessionIndex,
  setCurrentFileIndex
}: CodeReviewNavProps) {
  const [processing, setProcessing] = useState(false);

  // Handle file acceptance
  const handleAcceptFile = async () => {
    if (!currentFile) return;

    setProcessing(true);
    try {
      const contentToApply = getContentToApply(currentFile);

      await acceptFile({
        fileId: currentFile.id,
        content: contentToApply
      });

      // Remove accepted file from current session
      const result = removeFileFromSessions(sessions, currentSessionIndex, currentFileIndex);

      if (result.allSessionsEmpty) {
        onComplete();
        return;
      }

      setCurrentSessionIndex(result.newSessionIndex);
      setCurrentFileIndex(result.newFileIndex);
      onSessionsUpdate(result.updatedSessions);
    } catch (err) {
      onError('Error accepting file');
      console.error('Failed to accept file:', err);
    } finally {
      setProcessing(false);
    }
  };

  // Handle file rejection
  const handleRejectFile = async () => {
    if (!currentFile) return;

    setProcessing(true);
    try {
      await rejectFile({ fileId: currentFile.id });

      // Remove rejected file from current session
      const result = removeFileFromSessions(sessions, currentSessionIndex, currentFileIndex);

      if (result.allSessionsEmpty) {
        onComplete();
        return;
      }

      setCurrentSessionIndex(result.newSessionIndex);
      setCurrentFileIndex(result.newFileIndex);
      onSessionsUpdate(result.updatedSessions);
    } catch (err) {
      onError('Error rejecting file');
      console.error('Failed to reject file:', err);
    } finally {
      setProcessing(false);
    }
  };

  // Handle decline all (reject entire session)
  const handleDeclineAll = async () => {
    if (!currentFile) return;

    setProcessing(true);
    try {
      await declineSession({ sessionId: currentFile.session_id });
      onComplete();
    } catch (err) {
      onError('Error declining session');
      console.error('Failed to decline session:', err);
    } finally {
      setProcessing(false);
    }
  };
  const currentSession = sessions[currentSessionIndex];
  const totalSessions = sessions.length;
  const totalFiles = calculateTotalFiles(sessions);
  const currentFileGlobalIndex = calculateGlobalFileIndex(sessions, currentSessionIndex, currentFileIndex);

  const isFirst = isFirstFile(currentSessionIndex, currentFileIndex);
  const isLast = isLastFile(sessions, currentSessionIndex, currentFileIndex);

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700/30 bg-slate-800/20">
      {/* Navigation */}
      <div className="flex items-center space-x-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPrevious}
          disabled={isFirst}
          className="p-2 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30 rounded-lg text-gray-400 hover:text-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </motion.button>

        <div className="text-sm text-gray-400 text-center">
          <div className="font-medium">
            {currentFileGlobalIndex + 1} / {totalFiles}
          </div>
          <div className="text-sm text-gray-500">
            Session {currentSessionIndex + 1}/{totalSessions} • File {currentFileIndex + 1}/{currentSession?.files.length || 0}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          disabled={isLast}
          className="p-2 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30 rounded-lg text-gray-400 hover:text-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleEdit}
          className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-400 rounded-lg transition-colors font-medium flex items-center space-x-2"
        >
          <Edit3 className="w-4 h-4" />
          <span>{currentFile?.isEditing ? 'View Diff' : 'Edit'}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleDeclineAll}
          disabled={processing}
          className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/30 text-gray-400 rounded-lg transition-colors font-medium flex items-center space-x-2"
        >
          <XIcon className="w-4 h-4" />
          <span>Decline All</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRejectFile}
          disabled={processing}
          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400 rounded-lg transition-colors font-medium flex items-center space-x-2"
        >
          <X className="w-4 h-4" />
          <span>Reject</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAcceptFile}
          disabled={processing}
          className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-400 rounded-lg transition-colors font-medium flex items-center space-x-2"
        >
          <Check className="w-4 h-4" />
          <span>Accept</span>
        </motion.button>
      </div>

      {/* Progress Indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/30">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${calculateProgress(currentFileGlobalIndex, totalFiles)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}