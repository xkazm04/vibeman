import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit3 } from 'lucide-react';
import { DbGeneratedFile } from '../../lib/codeGenerationDatabase';
import CodeReviewNav from './CodeReviewNav';
import CodeReviewEditor from './CodeReviewEditor';
import { UniversalModal } from '@/components/UniversalModal';

interface CodeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  projectId: string;
}

interface ReviewFile extends DbGeneratedFile {
  isEditing?: boolean;
  editedContent?: string;
}

interface ReviewSession {
  sessionId: string;
  taskTitle?: string;
  files: ReviewFile[];
}

export default function CodeReviewModal({ isOpen, onClose, onComplete, projectId }: CodeReviewModalProps) {
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending files grouped by sessions
  const fetchPendingFiles = async () => {
    if (!projectId || !isOpen) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reviewer/pending-sessions?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        setCurrentSessionIndex(0);
        setCurrentFileIndex(0);
      } else {
        setError('Failed to fetch pending files');
      }
    } catch (err) {
      setError('Error loading files');
      console.error('Failed to fetch pending files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPendingFiles();
    }
  }, [isOpen, projectId]);

  const currentSession = sessions[currentSessionIndex];
  const currentFile = currentSession?.files[currentFileIndex];
  const totalFiles = sessions.reduce((sum, session) => sum + session.files.length, 0);
  const currentFileGlobalIndex = sessions.slice(0, currentSessionIndex).reduce((sum, session) => sum + session.files.length, 0) + currentFileIndex;

  // Handle sessions update from child components
  const handleSessionsUpdate = (updatedSessions: ReviewSession[]) => {
    setSessions(updatedSessions);
  };

  // Handle error from child components
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };



  // Toggle edit mode
  const handleToggleEdit = () => {
    if (!currentFile) return;

    const updatedSessions = [...sessions];
    updatedSessions[currentSessionIndex].files[currentFileIndex] = {
      ...currentFile,
      isEditing: !currentFile.isEditing,
      editedContent: currentFile.isEditing ? undefined : currentFile.generated_content
    };
    setSessions(updatedSessions);
  };

  // Handle content change in editor
  const handleContentChange = (content: string) => {
    if (!currentFile) return;

    const updatedSessions = [...sessions];
    updatedSessions[currentSessionIndex].files[currentFileIndex] = {
      ...currentFile,
      editedContent: content
    };
    setSessions(updatedSessions);
  };

  // Navigation
  const goToPrevious = () => {
    if (currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
    } else if (currentSessionIndex > 0) {
      setCurrentSessionIndex(currentSessionIndex - 1);
      setCurrentFileIndex(sessions[currentSessionIndex - 1].files.length - 1);
    }
  };

  const goToNext = () => {
    if (currentFileIndex < currentSession.files.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
    } else if (currentSessionIndex < sessions.length - 1) {
      setCurrentSessionIndex(currentSessionIndex + 1);
      setCurrentFileIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-slate-900 rounded-lg p-8 border border-slate-700">
          <div className="text-gray-400">Loading files for review...</div>
        </div>
      </div>
    );
  }

  if (totalFiles === 0) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-slate-900 rounded-lg p-8 border border-slate-700">
          <div className="text-gray-400">No pending files found for review.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-sm">
      <div className="h-full flex flex-col bg-slate-900 border-l border-slate-700">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-cyan-800/60 to-blue-900/60 rounded-lg border border-slate-600/30">
                {currentFile?.action === 'create' ? (
                  <Plus className="w-5 h-5 text-cyan-300" />
                ) : (
                  <Edit3 className="w-5 h-5 text-cyan-300" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Code Review - {currentFile?.filepath || 'Loading...'}
                </h2>
                <p className="text-sm text-slate-400">
                  {currentSession?.taskTitle || 'Task'} • File {currentFileGlobalIndex + 1} of {totalFiles} • {currentFile?.action === 'create' ? 'New File' : 'Update File'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-300"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex-shrink-0">
          <CodeReviewNav
            sessions={sessions}
            currentSessionIndex={currentSessionIndex}
            currentFileIndex={currentFileIndex}
            currentFile={currentFile}
            onPrevious={goToPrevious}
            onNext={goToNext}
            onToggleEdit={handleToggleEdit}
            onSessionsUpdate={handleSessionsUpdate}
            onComplete={onComplete}
            onError={handleError}
            setCurrentSessionIndex={setCurrentSessionIndex}
            setCurrentFileIndex={setCurrentFileIndex}
          />
        </div>

        {/* Editor - Fixed height for proper visibility */}
        <div className="p-4">
          <CodeReviewEditor
            currentFile={currentFile}
            onContentChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  );
}

