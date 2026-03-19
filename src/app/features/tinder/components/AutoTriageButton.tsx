'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, Check } from 'lucide-react';

interface AutoTriageButtonProps {
  selectedProjectId: string | null;
  disabled?: boolean;
}

export default function AutoTriageButton({
  selectedProjectId,
  disabled = false,
}: AutoTriageButtonProps) {
  const [maxEffort, setMaxEffort] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    requirementName: string;
    ideaCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = disabled || !selectedProjectId || loading;

  const handleGenerate = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/triage/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, maxEffort }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Generation failed');
        return;
      }

      setResult({
        requirementName: data.data.requirementName,
        ideaCount: data.data.ideaCount,
      });

      // Clear success after 4 seconds
      setTimeout(() => setResult(null), 4000);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, maxEffort]);

  return (
    <div className="flex items-center gap-2">
      {/* Effort threshold input */}
      <div className="flex items-center gap-1">
        <label
          htmlFor="auto-triage-effort"
          className="text-2xs text-gray-500 uppercase tracking-wider"
        >
          Effort
        </label>
        <input
          id="auto-triage-effort"
          type="number"
          min={1}
          max={9}
          value={maxEffort}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v >= 1 && v <= 9) setMaxEffort(v);
          }}
          disabled={isDisabled}
          className={`
            w-10 px-1.5 py-1 rounded-md text-xs text-center font-medium
            bg-gray-800/60 border border-gray-700/50
            focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30
            ${isDisabled ? 'opacity-50 cursor-not-allowed text-gray-500' : 'text-gray-300'}
          `}
        />
      </div>

      {/* Generate button */}
      <motion.button
        onClick={handleGenerate}
        disabled={isDisabled}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          transition-all duration-300 ease-out border
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-amber-400
          ${isDisabled
            ? 'opacity-50 cursor-not-allowed text-gray-500 border-gray-700/40'
            : 'text-amber-300 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 shadow-sm'
          }
        `}
        whileHover={isDisabled ? {} : { scale: 1.02 }}
        whileTap={isDisabled ? {} : { scale: 0.98 }}
        title="Generate auto-triage command for Claude Code"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : result ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Wand2 className="w-3.5 h-3.5" />
        )}
        <span>Auto-Triage</span>
      </motion.button>

      {/* Result / error feedback */}
      <AnimatePresence>
        {result && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="text-2xs text-emerald-400/80"
          >
            {result.ideaCount} ideas -- {result.requirementName}
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
