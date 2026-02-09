'use client';

import { useState, useMemo } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { useDesignAnalysis } from '@/app/features/Personas/hooks/useDesignAnalysis';
import type { DesignAnalysisResult } from '@/app/features/Personas/lib/designTypes';
import { DesignTerminal } from './DesignTerminal';
import { DesignResultPreview } from './DesignResultPreview';
import { Sparkles, Send, X, Check, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DesignTab() {
  const selectedPersona = usePersonaStore((s) => s.selectedPersona);
  const toolDefinitions = usePersonaStore((s) => s.toolDefinitions);
  const credentials = usePersonaStore((s) => s.credentials);

  const {
    phase,
    outputLines,
    result,
    error,
    startAnalysis,
    cancelAnalysis,
    applyResult,
    reset,
  } = useDesignAnalysis();

  const [instruction, setInstruction] = useState('');
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [selectedTriggerIndices, setSelectedTriggerIndices] = useState<Set<number>>(new Set());

  // Initialize selections when result arrives
  const resultId = result
    ? `${result.summary}-${result.suggested_tools.length}`
    : null;

  useMemo(() => {
    if (result) {
      setSelectedTools(new Set(result.suggested_tools));
      setSelectedTriggerIndices(
        new Set(result.suggested_triggers.map((_, i) => i))
      );
    }
  }, [resultId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasExistingConfig = selectedPersona
    ? !!(selectedPersona.structured_prompt || selectedPersona.system_prompt)
    : false;

  const currentToolNames = useMemo(
    () => (selectedPersona?.tools || []).map((t) => t.name),
    [selectedPersona]
  );

  const handleStartAnalysis = () => {
    if (!selectedPersona || !instruction.trim()) return;
    startAnalysis(selectedPersona.id, instruction.trim());
  };

  const handleApply = async () => {
    if (!selectedPersona || !result) return;
    await applyResult(
      selectedPersona.id,
      Array.from(selectedTools),
      Array.from(selectedTriggerIndices)
    );
  };

  const handleRefine = () => {
    reset();
    // instruction stays preserved - no clearing
  };

  const handleDiscard = () => {
    reset();
    setInstruction('');
  };

  const handleReset = () => {
    reset();
    setInstruction('');
  };

  const handleToolToggle = (toolName: string) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) next.delete(toolName);
      else next.add(toolName);
      return next;
    });
  };

  const handleTriggerToggle = (index: number) => {
    setSelectedTriggerIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (!selectedPersona) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground/40">
        No persona selected
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {/* ── Phase: idle ─────────────────────────────────────────── */}
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Describe what this agent should do..."
              className="w-full min-h-[120px] bg-background/50 border border-border/50 rounded-2xl p-4 text-sm text-foreground font-sans resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder-muted-foreground/30"
              spellCheck
            />

            {hasExistingConfig && (
              <p className="text-xs text-muted-foreground/50 px-1">
                This persona has an existing configuration. Your instruction will be used to modify it.
              </p>
            )}

            {error && (
              <p className="text-xs text-red-400 px-1">{error}</p>
            )}

            <button
              onClick={handleStartAnalysis}
              disabled={!instruction.trim()}
              className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-medium text-sm transition-all w-full ${
                !instruction.trim()
                  ? 'bg-secondary/60 text-muted-foreground/40 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Analyze &amp; Build
            </button>
          </motion.div>
        )}

        {/* ── Phase: analyzing ────────────────────────────────────── */}
        {phase === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            {/* Read-only instruction summary */}
            <div className="bg-secondary/30 rounded-xl px-4 py-3 text-sm text-foreground/70">
              {instruction}
            </div>

            <DesignTerminal lines={outputLines} isRunning={true} />

            <button
              onClick={cancelAnalysis}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </motion.div>
        )}

        {/* ── Phase: preview ──────────────────────────────────────── */}
        {phase === 'preview' && result && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <DesignResultPreview
              result={result}
              allToolDefs={toolDefinitions}
              currentToolNames={currentToolNames}
              credentials={credentials}
              selectedTools={selectedTools}
              selectedTriggerIndices={selectedTriggerIndices}
              onToolToggle={handleToolToggle}
              onTriggerToggle={handleTriggerToggle}
            />

            {error && (
              <p className="text-xs text-red-400 px-1">{error}</p>
            )}

            {/* Action buttons row */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleApply}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-primary to-accent text-white hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Check className="w-4 h-4" />
                Apply Changes
              </button>
              <button
                onClick={handleRefine}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-secondary/50 text-foreground/70 hover:bg-secondary/70 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refine
              </button>
              <button
                onClick={handleDiscard}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-muted-foreground hover:text-foreground/60 transition-colors"
              >
                Discard
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Phase: applying ─────────────────────────────────────── */}
        {phase === 'applying' && (
          <motion.div
            key="applying"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center justify-center py-12 gap-3"
          >
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground/60">Applying changes...</span>
          </motion.div>
        )}

        {/* ── Phase: applied ──────────────────────────────────────── */}
        {phase === 'applied' && (
          <motion.div
            key="applied"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center justify-center py-12 gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm text-emerald-400 font-medium">
              Design applied successfully!
            </span>
            <button
              onClick={handleReset}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-secondary/50 text-foreground/70 hover:bg-secondary/70 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Design Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
