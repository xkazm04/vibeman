'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCheck, Loader2, Check } from 'lucide-react';
import { useServerProjectStore } from '@/stores/serverProjectStore';

interface AcceptAllButtonProps {
  selectedProjectId: string | null;
  disabled?: boolean;
  remainingCount: number;
  onComplete?: () => void;
}

export default function AcceptAllButton({
  selectedProjectId,
  disabled = false,
  remainingCount,
  onComplete,
}: AcceptAllButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ accepted: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { projects } = useServerProjectStore();

  const isDisabled = disabled || loading || remainingCount === 0;

  const handleAcceptAll = useCallback(async () => {
    if (isDisabled) return;

    const confirmed = window.confirm(
      `Accept all ${remainingCount} remaining ideas? This will create requirement files for each one.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const projectPathMap: Record<string, string> = {};
      for (const project of projects) {
        if (project.path) {
          projectPathMap[project.id] = project.path;
        }
      }

      const res = await fetch('/api/tinder/accept-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          projectPathMap,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to accept all');
        return;
      }

      setResult({ accepted: data.accepted, failed: data.failed });
      setTimeout(() => setResult(null), 4000);

      onComplete?.();
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [isDisabled, remainingCount, projects, selectedProjectId, onComplete]);

  return (
    <div className="flex items-center gap-2">
      <motion.button
        onClick={handleAcceptAll}
        disabled={isDisabled}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          transition-all duration-300 ease-out border
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-green-400
          ${isDisabled
            ? 'opacity-50 cursor-not-allowed text-gray-500 border-gray-700/40'
            : 'text-green-300 bg-green-500/10 border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50 shadow-sm'
          }
        `}
        whileHover={isDisabled ? {} : { scale: 1.02 }}
        whileTap={isDisabled ? {} : { scale: 0.98 }}
        title={
          remainingCount === 0
            ? 'No ideas to accept'
            : `Accept all ${remainingCount} remaining ideas`
        }
        data-testid="accept-all-btn"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : result ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <CheckCheck className="w-3.5 h-3.5" />
        )}
        <span>{loading ? 'Accepting...' : 'Accept All'}</span>
      </motion.button>

      <AnimatePresence>
        {result && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="text-2xs text-emerald-400/80"
          >
            {result.accepted} accepted{result.failed > 0 ? `, ${result.failed} failed` : ''}
          </motion.span>
        )}
        {error && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="text-2xs text-red-400/80"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
