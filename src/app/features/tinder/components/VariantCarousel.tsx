'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Sparkles, ChevronLeft, ChevronRight,
  Zap, Target, Rocket, Star, Terminal, ArrowRight,
} from 'lucide-react';
import type { IdeaVariant } from '../lib/variantApi';
import { getPreferredScope, recordScopeChoice } from '../lib/variantApi';
import {
  effortScale,
  impactScale,
  riskScale,
  EffortIcon,
  ImpactIcon,
  RiskIcon,
} from '@/app/features/Ideas/lib/ideaConfig';
import { CompactTerminal } from '@/components/cli/CompactTerminal';
import type { QueuedTask } from '@/components/cli/types';
import {
  createQueuedStatus,
  createRunningStatus,
  createCompletedStatus,
  createFailedStatus,
} from '@/app/features/TaskRunner/lib/types';

interface VariantCarouselProps {
  ideaId: string;
  ideaCategory: string;
  ideaTitle: string;
  ideaDescription: string | null;
  ideaEffort: number | null;
  ideaImpact: number | null;
  ideaRisk: number | null;
  projectPath: string;
  /** Called when user selects a variant to accept */
  onSelectVariant: (variant: IdeaVariant) => void;
  /** Called to close/dismiss the carousel */
  onClose: () => void;
}

const SCOPE_CONFIG = {
  mvp: {
    icon: Zap,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgGradient: 'from-emerald-500/10 to-emerald-600/5',
    label: 'MVP',
    description: '~30% scope',
  },
  standard: {
    icon: Target,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgGradient: 'from-blue-500/10 to-blue-600/5',
    label: 'Standard',
    description: 'Original scope',
  },
  ambitious: {
    icon: Rocket,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgGradient: 'from-purple-500/10 to-purple-600/5',
    label: 'Ambitious',
    description: 'Extended scope',
  },
} as const;

/** Build the direct-prompt Claude Code will execute to generate variants */
function buildVariantPrompt(
  ideaId: string,
  ideaTitle: string,
  ideaDescription: string | null,
  ideaCategory: string,
  effort: number | null,
  impact: number | null,
  risk: number | null,
  userEnrichment: string,
  apiBase: string,
): string {
  return `Generate exactly 3 detailed scope variants (MVP, Standard, Ambitious) for this software idea.

## Idea Details
Title: ${ideaTitle}
Category: ${ideaCategory}
Description: ${ideaDescription || 'No description provided'}
Current Scores: Effort=${effort ?? 'N/A'}, Impact=${impact ?? 'N/A'}, Risk=${risk ?? 'N/A'}
${userEnrichment.trim() ? `\n## Additional Context from Developer\n${userEnrichment.trim()}\n` : ''}
## Variant Requirements

For each variant provide:
- **scope**: exactly one of "mvp", "standard", "ambitious"
- **label**: 2-4 word tagline (e.g. "Quick Win", "Full Feature", "Platform Play")
- **title**: specific, action-oriented title for this scope
- **description**: 4-6 sentences — exactly what gets built, key implementation decisions, what is NOT included
- **effort**: integer 1-10 (1=hours, 10=months)
- **impact**: integer 1-10 (1=negligible, 10=transformational)
- **risk**: integer 1-10 (1=very safe, 10=critical)
- **reasoning**: 2-3 sentences explaining why this scope boundary makes sense

## Scope Guidelines
- **MVP**: Ship the smallest possible version that proves value. One concrete use case covered. Hardcode what you would later parameterize. Aim for effort 2-3 below standard.
- **Standard**: The idea as specified. Complete, production-ready, no major shortcuts.
- **Ambitious**: Full potential of the idea realized. Additional integrations, configurability, broader applicability. Effort 2-4 above standard.

## Step 1: Generate JSON

Think through each variant carefully, then produce a JSON array:

\`\`\`json
[
  {"scope":"mvp","label":"...","title":"...","description":"...","effort":N,"impact":N,"risk":N,"reasoning":"..."},
  {"scope":"standard","label":"...","title":"...","description":"...","effort":N,"impact":N,"risk":N,"reasoning":"..."},
  {"scope":"ambitious","label":"...","title":"...","description":"...","effort":N,"impact":N,"risk":N,"reasoning":"..."}
]
\`\`\`

## Step 2: Save to Vibeman

After generating, POST the variants to Vibeman so the UI can display them:

\`\`\`bash
curl -s -X POST ${apiBase}/api/ideas/variants \\
  -H "Content-Type: application/json" \\
  -d "$(node -e "
const variants = JSON.parse(process.argv[1]);
console.log(JSON.stringify({ideaId:'${ideaId}',pregenerated:variants}));
" '<PASTE_YOUR_JSON_ARRAY_HERE>')"
\`\`\`

Replace <PASTE_YOUR_JSON_ARRAY_HERE> with the exact JSON array you generated in Step 1.

The curl command will respond with \`{"success":true,...}\` — that confirms the variants are saved and ready for triage.`;
}

type Step = 'enrichment' | 'generating' | 'selecting';

export default function VariantCarousel({
  ideaId,
  ideaCategory,
  ideaTitle,
  ideaDescription,
  ideaEffort,
  ideaImpact,
  ideaRisk,
  projectPath,
  onSelectVariant,
  onClose,
}: VariantCarouselProps) {
  const [step, setStep] = useState<Step>('enrichment');
  const [enrichment, setEnrichment] = useState('');
  const [variants, setVariants] = useState<IdeaVariant[]>([]);
  const [activeIndex, setActiveIndex] = useState(1);
  const [preferredScope, setPreferredScope] = useState<IdeaVariant['scope'] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // CLI task state
  const [terminalTask, setTerminalTask] = useState<QueuedTask | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [storedTaskId, setStoredTaskId] = useState<string | null>(null);

  const goLeft = useCallback(() => setActiveIndex(prev => Math.max(0, prev - 1)), []);
  const goRight = useCallback(() => setActiveIndex(prev => Math.min(variants.length - 1, prev + 1)), [variants.length]);

  const handleSelect = useCallback((variant: IdeaVariant) => {
    recordScopeChoice(ideaCategory, variant.scope);
    onSelectVariant(variant);
  }, [ideaCategory, onSelectVariant]);

  // Keyboard nav (only active during selecting step)
  useEffect(() => {
    if (step !== 'selecting') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goLeft(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goRight(); }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'Enter' && variants[activeIndex]) {
        e.preventDefault();
        handleSelect(variants[activeIndex]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [step, goLeft, goRight, onClose, handleSelect, variants, activeIndex]);

  // Launch CLI task
  const handleGenerate = useCallback(() => {
    const apiBase = window.location.origin;
    const prompt = buildVariantPrompt(
      ideaId, ideaTitle, ideaDescription, ideaCategory,
      ideaEffort, ideaImpact, ideaRisk, enrichment, apiBase,
    );
    const task: QueuedTask = {
      id: `variant-${ideaId}-${Date.now()}`,
      projectId: 'tinder-variants',
      projectPath,
      projectName: 'Variant Generation',
      requirementName: `Variants for: ${ideaTitle.slice(0, 40)}`,
      status: createQueuedStatus(),
      addedAt: Date.now(),
      directPrompt: prompt,
    };
    setTerminalTask(task);
    setAutoStart(true);
    setStep('generating');
    setFetchError(null);
  }, [ideaId, ideaTitle, ideaDescription, ideaCategory, ideaEffort, ideaImpact, ideaRisk, enrichment, projectPath]);

  // Poll for variants after CLI completes
  const fetchVariants = useCallback(async () => {
    try {
      const res = await fetch(`/api/ideas/variants?ideaId=${encodeURIComponent(ideaId)}`);
      const data = await res.json();
      if (data.ready && data.variants?.length > 0) {
        const ordered = ['mvp', 'standard', 'ambitious'];
        const sorted = [...data.variants].sort(
          (a: IdeaVariant, b: IdeaVariant) => ordered.indexOf(a.scope) - ordered.indexOf(b.scope),
        );
        setVariants(sorted);
        const pref = getPreferredScope(ideaCategory);
        if (pref) {
          setPreferredScope(pref);
          const prefIdx = sorted.findIndex((v: IdeaVariant) => v.scope === pref);
          if (prefIdx >= 0) setActiveIndex(prefIdx);
        }
        setStep('selecting');
      } else {
        setFetchError('Claude finished but no variants were saved. You can retry or close.');
      }
    } catch {
      setFetchError('Failed to retrieve generated variants. You can retry or close.');
    }
  }, [ideaId, ideaCategory]);

  const handleTaskComplete = useCallback((_taskId: string, success: boolean) => {
    setAutoStart(false);
    setExecutionId(null);
    setStoredTaskId(null);
    if (terminalTask) {
      setTerminalTask(prev => prev ? {
        ...prev,
        status: success ? createCompletedStatus() : createFailedStatus('Task failed'),
        completedAt: Date.now(),
      } : null);
    }
    if (success) {
      fetchVariants();
    } else {
      setFetchError('Claude Code execution failed. You can retry or close.');
    }
  }, [terminalTask, fetchVariants]);

  // ── Step 1: Enrichment textarea ──────────────────────────────────────
  if (step === 'enrichment') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="text-center mb-2">
          <p className="text-xs text-gray-500 font-mono">
            Optionally add context before Claude generates variants
          </p>
        </div>

        <textarea
          autoFocus
          value={enrichment}
          onChange={e => setEnrichment(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
            if (e.key === 'Escape') onClose();
          }}
          placeholder={`e.g. "Focus on the mobile experience" or "We already have Redis set up" or leave empty to let Claude decide…`}
          rows={4}
          className="w-full bg-gray-900/60 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-gradient-to-r from-purple-600/30 to-purple-700/20 border border-purple-500/40 text-purple-300 hover:brightness-125 transition-all"
          >
            <Terminal className="w-4 h-4" />
            Generate with Claude
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 border border-gray-700/40 bg-gray-800/40 hover:bg-gray-800/60 transition-all"
          >
            Cancel
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-600 font-mono">
          ⌘/Ctrl+Enter to generate · ESC to cancel
        </p>
      </motion.div>
    );
  }

  // ── Step 2: CLI terminal executing ───────────────────────────────────
  if (step === 'generating') {
    const taskQueue = terminalTask ? [terminalTask] : [];
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 px-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
          <span className="text-xs text-gray-400 font-mono">CLAUDE_GENERATING_VARIANTS...</span>
        </div>

        <div className="rounded-lg overflow-hidden border border-purple-500/30 bg-gray-950/50">
          <div className="px-3 py-1.5 bg-purple-500/10 border-b border-purple-500/20 flex items-center gap-2">
            <Terminal className="w-3 h-3 text-purple-400" />
            <span className="text-[11px] font-mono text-purple-300">
              Generating: MVP / Standard / Ambitious
            </span>
          </div>
          <CompactTerminal
            instanceId={`variant-gen-${ideaId}`}
            projectPath={projectPath}
            title="Variant Generation"
            className="h-[220px]"
            taskQueue={taskQueue}
            autoStart={autoStart}
            onTaskStart={taskId => {
              setStoredTaskId(taskId);
              setTerminalTask(prev => prev ? { ...prev, status: createRunningStatus(), startedAt: Date.now() } : null);
            }}
            onTaskComplete={handleTaskComplete}
            onQueueEmpty={() => setAutoStart(false)}
            currentExecutionId={executionId}
            currentStoredTaskId={storedTaskId}
            onExecutionChange={(eid, tid) => { setExecutionId(eid); setStoredTaskId(tid); }}
          />
        </div>

        {fetchError && (
          <div className="space-y-2">
            <p className="text-xs text-red-400 text-center">{fetchError}</p>
            <div className="flex gap-2">
              <button
                onClick={fetchVariants}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-700/40 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Retry fetch
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-700/40 text-gray-500 hover:text-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ── Step 3: Variant selection carousel ───────────────────────────────
  if (variants.length === 0) return null;
  const activeVariant = variants[activeIndex];
  const scopeConf = SCOPE_CONFIG[activeVariant.scope];
  const ScopeIcon = scopeConf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      {/* Scope tabs */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={goLeft}
          disabled={activeIndex === 0}
          className="p-1 rounded-md hover:bg-gray-800 disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>

        <div className="flex items-center gap-2">
          {variants.map((v, i) => {
            const conf = SCOPE_CONFIG[v.scope];
            const isActive = i === activeIndex;
            return (
              <button
                key={v.scope}
                onClick={() => setActiveIndex(i)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono transition-all border ${
                  isActive
                    ? `bg-gradient-to-r ${conf.bgGradient} ${conf.color} ${conf.borderColor}`
                    : 'bg-gray-800/40 text-gray-500 border-gray-700/30 hover:text-gray-300 hover:border-gray-600/50'
                }`}
              >
                {conf.label.toUpperCase()}
                {preferredScope === v.scope && (
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={goRight}
          disabled={activeIndex === variants.length - 1}
          className="p-1 rounded-md hover:bg-gray-800 disabled:opacity-30 transition-all"
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Active variant card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeVariant.scope}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className={`relative bg-gradient-to-br ${scopeConf.bgGradient} border ${scopeConf.borderColor} rounded-xl p-5 backdrop-blur-sm`}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className={`p-2 bg-gray-900/60 rounded-lg border ${scopeConf.borderColor}`}>
              <ScopeIcon className={`w-5 h-5 ${scopeConf.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-mono uppercase tracking-wider ${scopeConf.color}`}>
                {scopeConf.label} — {scopeConf.description}
              </span>
              {activeVariant.label && (
                <span className="text-[10px] text-gray-500 ml-2">· {activeVariant.label}</span>
              )}
              <h3 className="text-sm font-semibold text-white leading-snug mt-0.5">
                {activeVariant.title}
              </h3>
            </div>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed mb-4">
            {activeVariant.description}
          </p>

          <div className="flex items-center gap-3 mb-4">
            {[
              { scale: effortScale, Icon: EffortIcon, val: activeVariant.effort, label: 'Effort' },
              { scale: impactScale, Icon: ImpactIcon, val: activeVariant.impact, label: 'Impact' },
              { scale: riskScale,   Icon: RiskIcon,   val: activeVariant.risk,   label: 'Risk'   },
            ].map(({ scale, Icon, val, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/40">
                <Icon className={`w-3.5 h-3.5 ${scale.colorOf(val)}`} />
                <div>
                  <div className="text-[9px] text-gray-500 uppercase">{label}</div>
                  <div className={`text-sm font-bold font-mono ${scale.colorOf(val)}`}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          {activeVariant.reasoning && (
            <p className="text-[11px] text-gray-500 italic mb-4">{activeVariant.reasoning}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelect(activeVariant)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all border ${scopeConf.borderColor} bg-gradient-to-r ${scopeConf.bgGradient} hover:brightness-125 ${scopeConf.color}`}
            >
              <Sparkles className="w-4 h-4" />
              Accept {scopeConf.label}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 border border-gray-700/40 bg-gray-800/40 hover:bg-gray-800/60 transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600 font-mono">
        <span>← → Navigate</span>
        <span>ENTER Accept</span>
        <span>ESC Cancel</span>
      </div>
    </motion.div>
  );
}
