'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Trash2, Shield, Clock, AlertTriangle } from 'lucide-react';
import type { StaleBranch } from '@/app/db/models/security-intelligence.types';

interface StaleBranchesPanelProps {
  branches: StaleBranch[];
  onAutoClose?: (id: string) => Promise<void>;
  onPreserve?: (id: string) => Promise<void>;
}

/**
 * StaleBranchesPanel - Display and manage stale branches
 */
export default function StaleBranchesPanel({
  branches,
  onAutoClose,
  onPreserve,
}: StaleBranchesPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAutoClose = async (id: string) => {
    if (!onAutoClose) return;
    setLoading(id);
    setError(null);
    try {
      await onAutoClose(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close branch');
    } finally {
      setLoading(null);
    }
  };

  const handlePreserve = async (id: string) => {
    if (!onPreserve) return;
    setLoading(id);
    setError(null);
    try {
      await onPreserve(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preserve branch');
    } finally {
      setLoading(null);
    }
  };

  if (branches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500" data-testid="stale-branches-empty">
        <GitBranch className="w-12 h-12 mb-3 text-green-400" />
        <p className="text-lg">No stale branches</p>
        <p className="text-sm">All branches are active and up-to-date</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="stale-branches-panel">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {branches.map((branch) => (
        <motion.div
          key={branch.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-white/10 rounded-lg p-4 bg-white/5 hover:bg-white/[0.07] transition-colors"
          data-testid={`stale-branch-${branch.id}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <GitBranch className="w-5 h-5 text-cyan-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-white">{branch.branchName}</h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {branch.daysStale} days stale
                  </span>
                  {branch.lastCommitAuthor && (
                    <span>by {branch.lastCommitAuthor}</span>
                  )}
                </div>

                {branch.hasVulnerabilities && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-orange-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{branch.vulnerabilityCount} vulnerabilities</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {branch.autoCloseEligible && !branch.manuallyPreserved && (
                <>
                  <button
                    onClick={() => handlePreserve(branch.id)}
                    disabled={loading === branch.id}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors disabled:opacity-50"
                    title="Preserve branch (prevent auto-close)"
                    data-testid={`preserve-branch-btn-${branch.id}`}
                  >
                    <Shield className="w-3 h-3" />
                    Preserve
                  </button>
                  <button
                    onClick={() => handleAutoClose(branch.id)}
                    disabled={loading === branch.id}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
                    title="Auto-close branch"
                    data-testid={`auto-close-branch-btn-${branch.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                    {loading === branch.id ? 'Closing...' : 'Close'}
                  </button>
                </>
              )}

              {branch.manuallyPreserved && (
                <span className="px-2 py-1 text-xs rounded-lg bg-green-500/20 text-green-400">
                  Preserved
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
