import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Edit3, XIcon, X, Check } from 'lucide-react';

interface ReviewFile {
  id: string;
  session_id: string;
  filepath: string;
  action: 'create' | 'update';
  generated_content: string;
  original_content?: string | null;
  isEditing?: boolean;
  editedContent?: string;
}

interface ReviewSession {
  sessionId: string;
  taskTitle?: string;
  files: ReviewFile[];
}

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
      const contentToApply = currentFile.isEditing ? currentFile.editedContent : currentFile.generated_content;

      const response = await fetch('/api/reviewer/accept-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: currentFile.id,
          content: contentToApply
        })
      });

      if (response.ok) {
        // Remove accepted file from current session
        const updatedSessions = [...sessions];
        updatedSessions[currentSessionIndex].files = updatedSessions[currentSessionIndex].files.filter((_, index) => index !== currentFileIndex);

        // If session is empty, remove it
        if (updatedSessions[currentSessionIndex].files.length === 0) {
          updatedSessions.splice(currentSessionIndex, 1);
          if (updatedSessions.length === 0) {
            onComplete();
            return;
          }
          if (currentSessionIndex >= updatedSessions.length) {
            setCurrentSessionIndex(updatedSessions.length - 1);
          }
          setCurrentFileIndex(0);
        } else {
          // Adjust file index within session
          if (currentFileIndex >= updatedSessions[currentSessionIndex].files.length) {
            setCurrentFileIndex(updatedSessions[currentSessionIndex].files.length - 1);
          }
        }

        onSessionsUpdate(updatedSessions);
      } else {
        onError('Failed to accept file');
      }
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
      const response = await fetch('/api/reviewer/reject-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: currentFile.id
        })
      });

      if (response.ok) {
        // Remove rejected file from current session
        const updatedSessions = [...sessions];
        updatedSessions[currentSessionIndex].files = updatedSessions[currentSessionIndex].files.filter((_, index) => index !== currentFileIndex);

        // If session is empty, remove it
        if (updatedSessions[currentSessionIndex].files.length === 0) {
          updatedSessions.splice(currentSessionIndex, 1);
          if (updatedSessions.length === 0) {
            onComplete();
            return;
          }
          if (currentSessionIndex >= updatedSessions.length) {
            setCurrentSessionIndex(updatedSessions.length - 1);
          }
          setCurrentFileIndex(0);
        } else {
          // Adjust file index within session
          if (currentFileIndex >= updatedSessions[currentSessionIndex].files.length) {
            setCurrentFileIndex(updatedSessions[currentSessionIndex].files.length - 1);
          }
        }

        onSessionsUpdate(updatedSessions);
      } else {
        onError('Failed to reject file');
      }
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
      const response = await fetch('/api/reviewer/decline-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentFile.session_id
        })
      });

      if (response.ok) {
        onComplete();
      } else {
        onError('Failed to decline session');
      }
    } catch (err) {
      onError('Error declining session');
      console.error('Failed to decline session:', err);
    } finally {
      setProcessing(false);
    }
  };
  const currentSession = sessions[currentSessionIndex];
  const totalSessions = sessions.length;
  const totalFiles = sessions.reduce((sum, session) => sum + session.files.length, 0);
  const currentFileGlobalIndex = sessions.slice(0, currentSessionIndex).reduce((sum, session) => sum + session.files.length, 0) + currentFileIndex;

  const isFirstFile = currentSessionIndex === 0 && currentFileIndex === 0;
  const isLastFile = currentSessionIndex === sessions.length - 1 && currentFileIndex === (currentSession?.files.length || 1) - 1;

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700/30 bg-slate-800/20">
      {/* Navigation */}
      <div className="flex items-center space-x-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPrevious}
          disabled={isFirstFile}
          className="p-2 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30 rounded-lg text-gray-400 hover:text-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </motion.button>

        <div className="text-sm text-gray-400 text-center">
          <div className="font-medium">
            {currentFileGlobalIndex + 1} / {totalFiles}
          </div>
          <div className="text-xs text-gray-500">
            Session {currentSessionIndex + 1}/{totalSessions} • File {currentFileIndex + 1}/{currentSession?.files.length || 0}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          disabled={isLastFile}
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
          animate={{ width: `${((currentFileGlobalIndex + 1) / totalFiles) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}