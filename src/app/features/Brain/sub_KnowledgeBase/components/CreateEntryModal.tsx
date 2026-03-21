'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import {
  KNOWLEDGE_LANGUAGES,
  KNOWLEDGE_LAYERS, KNOWLEDGE_LAYER_LABELS,
  LAYER_CATEGORIES, KNOWLEDGE_CATEGORY_LABELS,
  CATEGORY_TO_LAYER,
} from '@/app/db/models/knowledge.types';
import type { KnowledgeCategory, KnowledgeLayer, KnowledgePatternType, KnowledgeLanguage, CreateKnowledgeEntryInput } from '@/app/db/models/knowledge.types';
import { transition, fadeOnly } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface CreateEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateKnowledgeEntryInput) => Promise<unknown>;
}

const PATTERN_TYPES: { value: KnowledgePatternType; label: string }[] = [
  { value: 'best_practice', label: 'Best Practice' },
  { value: 'anti_pattern', label: 'Anti-Pattern' },
  { value: 'convention', label: 'Convention' },
  { value: 'gotcha', label: 'Gotcha' },
  { value: 'optimization', label: 'Optimization' },
];

const inputCls = 'w-full px-3 py-2 rounded-lg bg-zinc-950/50 border border-zinc-800/50 text-[0.8125rem] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40 transition-colors';

const sliderCls = `w-full h-1.5 rounded-full appearance-none bg-zinc-800 cursor-pointer
  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:hover:bg-purple-400
  [&::-webkit-slider-thumb]:transition-colors
  [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5
  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:hover:bg-purple-400
  [&::-moz-range-thumb]:transition-colors
  [&::-moz-range-track]:bg-zinc-800 [&::-moz-range-track]:rounded-full`;

export default function CreateEntryModal({ isOpen, onClose, onCreate }: CreateEntryModalProps) {
  const prefersReduced = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    layer: 'frontend' as KnowledgeLayer,
    domain: 'ui' as KnowledgeCategory,
    pattern_type: 'best_practice' as KnowledgePatternType,
    title: '',
    pattern: '',
    rationale: '',
    code_example: '',
    anti_pattern: '',
    language: 'typescript' as KnowledgeLanguage,
    tags: '',
    confidence: 75,
  });

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.pattern.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate({
        domain: form.domain,
        layer: form.layer,
        pattern_type: form.pattern_type,
        title: form.title.trim(),
        pattern: form.pattern.trim(),
        rationale: form.rationale.trim() || undefined,
        code_example: form.code_example.trim() || undefined,
        anti_pattern: form.anti_pattern.trim() || undefined,
        language: form.language,
        tags: form.tags.trim() ? form.tags.split(',').map(t => t.trim()) : undefined,
        confidence: form.confidence,
        source_type: 'manual',
      });
      onClose();
      // Reset form
      setForm({
        layer: 'frontend', domain: 'ui', pattern_type: 'best_practice', title: '', pattern: '',
        rationale: '', code_example: '', anti_pattern: '', language: 'typescript',
        tags: '', confidence: 75,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={fadeOnly}
            initial={prefersReduced ? false : 'hidden'}
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            initial={prefersReduced ? false : { opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={transition.deliberate}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl max-h-[85vh] overflow-y-auto bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/50 rounded-xl shadow-2xl"
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800/50">
                <h2 className="text-sm font-semibold text-zinc-200">Create Knowledge Entry</h2>
                <button type="button" onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Layer + Category + Pattern Type */}
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Layer">
                    <select
                      value={form.layer}
                      onChange={e => {
                        const layer = e.target.value as KnowledgeLayer;
                        const cats = LAYER_CATEGORIES[layer];
                        update('layer', layer);
                        // Auto-select first category in this layer
                        if (cats.length > 0 && !cats.includes(form.domain)) {
                          update('domain', cats[0]);
                        }
                      }}
                      className={`${inputCls} cursor-pointer`}
                    >
                      {KNOWLEDGE_LAYERS.map(l => (
                        <option key={l} value={l}>{KNOWLEDGE_LAYER_LABELS[l]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Category">
                    <select
                      value={form.domain}
                      onChange={e => update('domain', e.target.value as KnowledgeCategory)}
                      className={`${inputCls} cursor-pointer`}
                    >
                      {LAYER_CATEGORIES[form.layer].map(c => (
                        <option key={c} value={c}>{KNOWLEDGE_CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Pattern Type">
                    <select
                      value={form.pattern_type}
                      onChange={e => update('pattern_type', e.target.value as KnowledgePatternType)}
                      className={`${inputCls} cursor-pointer`}
                    >
                      {PATTERN_TYPES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Title */}
                <Field label="Title" required>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => update('title', e.target.value)}
                    placeholder="e.g., Use GlassCard for all panel containers"
                    className={inputCls}
                    required
                  />
                </Field>

                {/* Pattern */}
                <Field label="Pattern" required>
                  <textarea
                    value={form.pattern}
                    onChange={e => update('pattern', e.target.value)}
                    placeholder="Describe the pattern..."
                    rows={3}
                    className={`${inputCls} resize-none`}
                    required
                  />
                </Field>

                {/* Rationale */}
                <Field label="Rationale">
                  <textarea
                    value={form.rationale}
                    onChange={e => update('rationale', e.target.value)}
                    placeholder="Why this pattern matters..."
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </Field>

                {/* Code Example */}
                <Field label="Code Example">
                  <textarea
                    value={form.code_example}
                    onChange={e => update('code_example', e.target.value)}
                    placeholder="// Example code..."
                    rows={3}
                    className={`${inputCls} resize-none font-mono text-xs`}
                  />
                </Field>

                {/* Anti-Pattern */}
                <Field label="Anti-Pattern">
                  <textarea
                    value={form.anti_pattern}
                    onChange={e => update('anti_pattern', e.target.value)}
                    placeholder="What NOT to do..."
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </Field>

                {/* Language + Confidence row */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Language">
                    <select
                      value={form.language}
                      onChange={e => update('language', e.target.value as KnowledgeLanguage)}
                      className={`${inputCls} cursor-pointer`}
                    >
                      {KNOWLEDGE_LANGUAGES.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={`Confidence: ${form.confidence}%`}>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={form.confidence}
                      onChange={e => update('confidence', Number(e.target.value))}
                      className={sliderCls}
                    />
                  </Field>
                </div>

                {/* Tags */}
                <Field label="Tags (comma-separated)">
                  <input
                    type="text"
                    value={form.tags}
                    onChange={e => update('tags', e.target.value)}
                    placeholder="e.g., zustand, state, pattern"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !form.title.trim() || !form.pattern.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Creating...' : 'Create Entry'}
                </button>
              </div>
            </form>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
