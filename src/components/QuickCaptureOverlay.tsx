'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Target, Calendar, Tag, Loader2, Check, AlertCircle } from 'lucide-react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useQueryClient } from '@tanstack/react-query';
import { goalKeys } from '@/lib/queries/goalQueries';

interface QuickCaptureResult {
  success: boolean;
  goal?: { id: string; title: string; status: string };
  parsed?: {
    title: string;
    priority: string | null;
    targetDate: string | null;
    status: string;
    keywords: string[];
  };
  matchedContext?: { id: string; name: string } | null;
  error?: string;
}

type CapturePhase = 'idle' | 'submitting' | 'success' | 'error';

export default function QuickCaptureOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [result, setResult] = useState<QuickCaptureResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeProject = useClientProjectStore((s) => s.activeProject);
  const queryClient = useQueryClient();

  // Global keyboard shortcut: Cmd+G / Ctrl+G
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        // Don't intercept if user is in an input/textarea already (except our own)
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          if (target !== inputRef.current) return;
        }
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let animation start
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      // Reset state on close
      setInput('');
      setPhase('idle');
      setResult(null);
    }
  }, [isOpen]);

  const close = useCallback(() => setIsOpen(false), []);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || !activeProject?.id || phase === 'submitting') return;

    setPhase('submitting');
    try {
      const response = await fetch('/api/goals/quick-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim(), projectId: activeProject.id }),
      });

      const data: QuickCaptureResult = await response.json();

      if (!response.ok || !data.success) {
        setPhase('error');
        setResult(data);
        return;
      }

      setResult(data);
      setPhase('success');

      // Invalidate goals query so list refreshes
      queryClient.invalidateQueries({ queryKey: goalKeys.byProject(activeProject.id) });

      // Auto-close after showing success
      setTimeout(() => setIsOpen(false), 1200);
    } catch {
      setPhase('error');
      setResult({ success: false, error: 'Network error' });
    }
  }, [input, activeProject?.id, phase, queryClient]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [close, handleSubmit]
  );

  // Don't render if no project
  if (!activeProject) return null;

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={close}
          />

          {/* Command palette */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            className="fixed top-[20vh] left-1/2 -translate-x-1/2 w-full max-w-[600px] z-[9999]"
          >
            <div className="mx-4 bg-gradient-to-br from-slate-900/98 via-slate-900/99 to-slate-800/98 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Header bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/40 bg-slate-800/30">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium text-slate-400 tracking-wide">
                  Quick Goal Capture
                </span>
                <span className="ml-auto text-[10px] text-slate-500 font-mono">
                  {activeProject.name}
                </span>
              </div>

              {/* Input area */}
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='e.g. "Ship auth middleware by Friday P1"'
                  disabled={phase === 'submitting' || phase === 'success'}
                  className="w-full px-4 py-4 bg-transparent text-white text-base placeholder-slate-500
                           focus:outline-none disabled:opacity-60"
                  autoComplete="off"
                  spellCheck={false}
                />

                {/* Submit indicator */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {phase === 'idle' && input.trim() && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      Enter ↵
                    </span>
                  )}
                  {phase === 'submitting' && (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  )}
                  {phase === 'success' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <Check className="w-5 h-5 text-emerald-400" />
                    </motion.div>
                  )}
                  {phase === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>

              {/* Result feedback */}
              <AnimatePresence>
                {phase === 'success' && result?.parsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        <Target className="w-3 h-3" />
                        <span>{result.parsed.title}</span>
                      </div>

                      {result.parsed.priority && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <span className="font-semibold">{result.parsed.priority}</span>
                        </div>
                      )}

                      {result.parsed.targetDate && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          <Calendar className="w-3 h-3" />
                          <span>{result.parsed.targetDate}</span>
                        </div>
                      )}

                      {result.matchedContext && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <Tag className="w-3 h-3" />
                          <span>{result.matchedContext.name}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {phase === 'error' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 text-xs text-red-400">
                      {result?.error || 'Failed to create goal. Press Enter to retry.'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer hints */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-700/30 bg-slate-800/20">
                <span className="text-[10px] text-slate-500">
                  <kbd className="px-1 py-0.5 bg-slate-700/50 rounded text-[9px] font-mono">Enter</kbd> create
                </span>
                <span className="text-[10px] text-slate-500">
                  <kbd className="px-1 py-0.5 bg-slate-700/50 rounded text-[9px] font-mono">Esc</kbd> close
                </span>
                <span className="text-[10px] text-slate-500 ml-auto">
                  Try: title + date + P1/P2/P3
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Portal to body to escape any stacking contexts
  if (typeof window === 'undefined') return null;
  return createPortal(overlay, document.body);
}
