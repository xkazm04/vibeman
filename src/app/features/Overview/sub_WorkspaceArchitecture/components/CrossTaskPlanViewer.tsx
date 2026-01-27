'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  CheckCircle2,
  FileText,
  AlertCircle,
  Clock,
  Layers,
  Zap,
  Scale,
  Rocket,
  Eye,
} from 'lucide-react';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';

interface CrossTaskPlan {
  id: string;
  workspace_id: string | null;
  project_ids: string[];
  requirement: string;
  requirement_summary: string | null;
  current_flow_analysis: string | null;
  plan_option_1: string | null;
  plan_option_1_title: string | null;
  plan_option_2: string | null;
  plan_option_2_title: string | null;
  plan_option_3: string | null;
  plan_option_3_title: string | null;
  selected_plan: number | null;
  user_notes: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface CrossTaskPlanViewerProps {
  planId: string;
  onClose: () => void;
  onSelectPlan?: (planNumber: 1 | 2 | 3) => void;
}

type ViewMode = 'analysis' | 'options';

const OPTION_CONFIGS = [
  { number: 1 as const, label: 'Quick Win', icon: Zap, color: 'amber', description: 'Fastest to implement' },
  { number: 2 as const, label: 'Balanced', icon: Scale, color: 'cyan', description: 'Recommended approach' },
  { number: 3 as const, label: 'Future-Proof', icon: Rocket, color: 'purple', description: 'Long-term solution' },
];

export default function CrossTaskPlanViewer({
  planId,
  onClose,
  onSelectPlan,
}: CrossTaskPlanViewerProps) {
  const [plan, setPlan] = useState<CrossTaskPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('analysis');
  const [selectedOption, setSelectedOption] = useState<1 | 2 | 3 | null>(null);
  const [selectingPlan, setSelectingPlan] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cross-task/${planId}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Failed to fetch plan');
          return;
        }

        setPlan(result.plan);
        if (result.plan.user_notes) {
          setNotes(result.plan.user_notes);
        }
        // If already selected, show that option
        if (result.plan.selected_plan) {
          setSelectedOption(result.plan.selected_plan as 1 | 2 | 3);
          setViewMode('options');
        }
      } catch (err) {
        console.error('Error fetching plan:', err);
        setError('Failed to fetch plan');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId]);

  const handleSelectPlan = useCallback(async (planNumber: 1 | 2 | 3) => {
    try {
      setSelectingPlan(planNumber);

      const response = await fetch(`/api/cross-task/${planId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planNumber, notes }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to select plan:', result.error);
        return;
      }

      setPlan(result.plan);

      if (onSelectPlan) {
        onSelectPlan(planNumber);
      }
    } catch (err) {
      console.error('Error selecting plan:', err);
    } finally {
      setSelectingPlan(null);
    }
  }, [planId, notes, onSelectPlan]);

  const getOptionContent = (optionNumber: 1 | 2 | 3) => {
    if (!plan) return null;
    return plan[`plan_option_${optionNumber}` as keyof typeof plan] as string | null;
  };

  const getOptionTitle = (optionNumber: 1 | 2 | 3) => {
    if (!plan) return '';
    return (plan[`plan_option_${optionNumber}_title` as keyof typeof plan] as string) || OPTION_CONFIGS[optionNumber - 1].label;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="w-[92vw] max-w-6xl h-[90vh] bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Requirement Analysis</h2>
              {plan?.requirement_summary && (
                <p className="text-sm text-zinc-400 mt-0.5">{plan.requirement_summary}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {plan?.completed_at && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Clock className="w-3 h-3" />
                {new Date(plan.completed_at).toLocaleDateString()}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Loading analysis...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-red-400">
              <AlertCircle className="w-8 h-8" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && plan && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left sidebar - Navigation */}
            <div className="w-64 flex-shrink-0 border-r border-zinc-800/50 bg-zinc-900/50 flex flex-col">
              {/* View mode toggle */}
              <div className="p-3 border-b border-zinc-800/30">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setViewMode('analysis')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                      viewMode === 'analysis'
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <div>
                      <div className="text-sm font-medium">Current Behavior</div>
                      <div className="text-[10px] opacity-70">Analysis of existing code</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setViewMode('options')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                      viewMode === 'options'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <div>
                      <div className="text-sm font-medium">Implementation Options</div>
                      <div className="text-[10px] opacity-70">3 approaches to choose</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Options list (when in options view) */}
              {viewMode === 'options' && (
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2 px-2">
                    Choose an option
                  </div>
                  <div className="space-y-2">
                    {OPTION_CONFIGS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = selectedOption === opt.number;
                      const isChosen = plan.selected_plan === opt.number;
                      const title = getOptionTitle(opt.number);

                      const colorClasses = {
                        amber: isSelected ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'border-zinc-800 hover:border-amber-500/30',
                        cyan: isSelected ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400' : 'border-zinc-800 hover:border-cyan-500/30',
                        purple: isSelected ? 'bg-purple-500/15 border-purple-500/40 text-purple-400' : 'border-zinc-800 hover:border-purple-500/30',
                      }[opt.color];

                      return (
                        <button
                          key={opt.number}
                          onClick={() => setSelectedOption(opt.number)}
                          className={`w-full flex items-start gap-2 p-2.5 rounded-lg border transition-all ${colorClasses}`}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 ${isSelected ? '' : 'text-zinc-500'}`} />
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${isSelected ? '' : 'text-zinc-300'}`}>
                                {title}
                              </span>
                              {isChosen && (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              )}
                            </div>
                            <div className={`text-[10px] ${isSelected ? 'opacity-80' : 'text-zinc-500'}`}>
                              {opt.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes input (when option selected) */}
              {viewMode === 'options' && selectedOption && (
                <div className="p-3 border-t border-zinc-800/30">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5 block">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Why this option..."
                    className="w-full px-2.5 py-1.5 text-xs bg-zinc-800/50 border border-zinc-700/50 rounded-lg focus:outline-none focus:border-amber-500/50 text-zinc-200 placeholder:text-zinc-600"
                  />

                  {/* Select button */}
                  <button
                    onClick={() => handleSelectPlan(selectedOption)}
                    disabled={selectingPlan !== null || plan.selected_plan === selectedOption}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {selectingPlan === selectedOption ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : plan.selected_plan === selectedOption ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Selected</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Select This Option
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                {viewMode === 'analysis' ? (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {plan.current_flow_analysis ? (
                      <MarkdownViewer content={plan.current_flow_analysis} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                        <Eye className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm">No behavior analysis available</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`option-${selectedOption || 'none'}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {selectedOption ? (
                      getOptionContent(selectedOption) ? (
                        <MarkdownViewer content={getOptionContent(selectedOption)!} />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                          <FileText className="w-12 h-12 mb-3 opacity-50" />
                          <p className="text-sm">No content for this option</p>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                        <FileText className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm">Select an option from the sidebar to view details</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
