'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitPullRequest, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  GitBranch,
  Download,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Project, GitStatus } from '@/types';

interface PullButtonProps {
  project: Project;
  isRunning: boolean;
  onPullComplete?: () => void;
}

export default function PullButton({ project, isRunning, onPullComplete }: PullButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [pullResult, setPullResult] = useState<{ success: boolean; message: string } | null>(null);

  // Only show if project has git config
  if (!project.git) return null;

  const fetchGitStatus = async () => {
    if (!project.git) return;
    
    try {
      const res = await fetch('/api/git/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: project.id,
          path: project.path,
          branch: project.git.branch 
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setGitStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch git status:', error);
    }
  };

  useEffect(() => {
    if (showStatus) {
      fetchGitStatus();
      const interval = setInterval(fetchGitStatus, 30000); // Check every 30s
      return () => clearInterval(interval);
    }
  }, [showStatus, project.id]);

  const handlePull = async () => {
    if (!project.git) return;
    
    setLoading(true);
    setPullResult(null);
    
    try {
      const res = await fetch('/api/git/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: project.id,
          path: project.path,
          branch: project.git.branch 
        })
      });
      
      const data = await res.json();
      setPullResult(data);
      
      if (data.success) {
        await fetchGitStatus();
        if (onPullComplete) onPullComplete();
      }
    } catch (error) {
      setPullResult({
        success: false,
        message: 'Failed to pull changes'
      });
    } finally {
      setLoading(false);
    }
  };

  const hasUpdates = gitStatus && gitStatus.behind > 0;
  const hasLocalChanges = gitStatus && gitStatus.hasChanges;
  const isAhead = gitStatus && gitStatus.ahead > 0;

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowStatus(!showStatus)}
        className={`p-1 text-gray-400 hover:text-gray-100 transition-colors relative ${
          hasUpdates ? 'text-yellow-400' : ''
        }`}
        title={`Git: ${project.git.branch}`}
      >
        <GitBranch size={14} />
        {hasUpdates && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
          />
        )}
      </motion.button>

      <AnimatePresence>
        {showStatus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute top-6 right-0 bg-gray-900 border border-gray-700 rounded-lg p-3 min-w-[250px] z-50 shadow-xl"
            style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)' }}
          >
            <div className="space-y-2">
              {/* Repository Info */}
              <div className="text-sm">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <GitBranch size={12} />
                  <span>{project.git.repository.split('/').pop()?.replace('.git', '')}</span>
                </div>
                <div className="font-mono text-gray-300">
                  {gitStatus?.currentBranch || project.git.branch}
                </div>
              </div>

              {/* Status Info */}
              {gitStatus && (
                <div className="space-y-1 py-2 border-t border-gray-700">
                  {hasLocalChanges && (
                    <div className="flex items-center gap-2 text-yellow-400 text-sm">
                      <AlertCircle size={12} />
                      <span>Uncommitted changes</span>
                    </div>
                  )}
                  
                  {gitStatus.behind > 0 && (
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <ArrowDown size={12} />
                      <span>{gitStatus.behind} commit{gitStatus.behind !== 1 ? 's' : ''} behind</span>
                    </div>
                  )}
                  
                  {gitStatus.ahead > 0 && (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <ArrowUp size={12} />
                      <span>{gitStatus.ahead} commit{gitStatus.ahead !== 1 ? 's' : ''} ahead</span>
                    </div>
                  )}
                  
                  {!hasLocalChanges && gitStatus.behind === 0 && gitStatus.ahead === 0 && (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={12} />
                      <span>Up to date</span>
                    </div>
                  )}
                </div>
              )}

              {/* Pull Result */}
              {pullResult && (
                <div className={`text-sm p-2 rounded ${
                  pullResult.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                }`}>
                  {pullResult.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-700">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchGitStatus}
                  disabled={loading}
                  className="flex-1 px-2 py-1 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 flex items-center justify-center gap-1"
                >
                  <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePull}
                  disabled={loading || hasLocalChanges || isRunning}
                  className="flex-1 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  title={
                    hasLocalChanges 
                      ? 'Cannot pull with uncommitted changes' 
                      : isRunning 
                      ? 'Stop the server before pulling'
                      : 'Pull latest changes'
                  }
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 border border-current border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      <Download size={10} />
                      Pull
                    </>
                  )}
                </motion.button>
              </div>

              {gitStatus?.lastFetch && (
                <div className="text-sm text-gray-500 text-center">
                  Last checked: {new Date(gitStatus.lastFetch).toLocaleTimeString()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}