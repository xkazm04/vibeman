'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Compass,
  Sparkles,
  Loader2,
  ChevronDown,
  CheckSquare,
  Square,
  MessageSquare,
  Globe2
} from 'lucide-react';
import { DbQuestion, DbContext } from '@/app/db';

interface GenerateResult {
  requirementPath: string;
  requirementName: string;
}

interface CombinedGeneratePanelProps {
  /** SQLite contexts */
  contexts: DbContext[];
  selectedContextIds: string[];
  answeredQuestions: DbQuestion[];
  onGenerateQuestions: (count: number) => Promise<GenerateResult | void>;
  onGenerateDirections: (
    count: number,
    userContext: string,
    selectedQuestionIds: string[],
    brainstormAll?: boolean
  ) => Promise<GenerateResult | void>;
  disabled?: boolean;
}

export default function CombinedGeneratePanel({
  contexts,
  selectedContextIds,
  answeredQuestions,
  onGenerateQuestions,
  onGenerateDirections,
  disabled = false
}: CombinedGeneratePanelProps) {
  const [questionsPerContext, setQuestionsPerContext] = useState(3);
  const [directionsPerContext, setDirectionsPerContext] = useState(3);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingDirections, setGeneratingDirections] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  // Direction-specific state
  const [userContext, setUserContext] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [showDirectionOptions, setShowDirectionOptions] = useState(false);
  const [brainstormAll, setBrainstormAll] = useState(false);

  const selectedContextCount = selectedContextIds.length;

  const handleGenerateQuestions = async () => {
    if (selectedContextCount === 0) return;

    setGeneratingQuestions(true);
    setStatus(null);
    setMessage('');

    try {
      const result = await onGenerateQuestions(questionsPerContext);
      if (result) {
        setStatus('success');
        setMessage(`Questions requirement created! → ${result.requirementPath}`);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to generate requirement');
    } finally {
      setGeneratingQuestions(false);
      setTimeout(() => { setStatus(null); setMessage(''); }, 8000);
    }
  };

  const handleGenerateDirections = async () => {
    // Allow generation if brainstormAll is enabled OR contexts are selected
    if (!brainstormAll && selectedContextCount === 0) return;

    setGeneratingDirections(true);
    setStatus(null);
    setMessage('');

    try {
      const result = await onGenerateDirections(directionsPerContext, userContext, selectedQuestionIds, brainstormAll);
      if (result) {
        setStatus('success');
        const modeLabel = brainstormAll ? 'Brainstorm' : 'Directions';
        setMessage(`${modeLabel} requirement created! → ${result.requirementPath}`);
        setUserContext('');
        setSelectedQuestionIds([]);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to generate requirement');
    } finally {
      setGeneratingDirections(false);
      setTimeout(() => { setStatus(null); setMessage(''); }, 8000);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const selectAllQuestions = () => {
    setSelectedQuestionIds(answeredQuestions.map(q => q.id));
  };

  const clearAllQuestions = () => {
    setSelectedQuestionIds([]);
  };

  const isGenerating = generatingQuestions || generatingDirections;

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/40 p-4">
      <div className="space-y-3">
        {/* Compact Generate Row */}
        <div className="flex items-center gap-6 flex-wrap">
          {/* Questions Generator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-purple-400">
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Questions</span>
            </div>
            <input
              type="number"
              min={1}
              max={10}
              value={questionsPerContext}
              onChange={(e) => setQuestionsPerContext(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              className="w-12 bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              disabled={isGenerating}
            />
            <span className="text-xs text-gray-500">/ctx</span>
            <button
              onClick={handleGenerateQuestions}
              disabled={disabled || isGenerating || selectedContextCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600/80 hover:bg-purple-500 text-white"
            >
              {generatingQuestions ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Generate
            </button>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-700/50" />

          {/* Directions Generator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Compass className="w-4 h-4" />
              <span className="text-sm font-medium">Directions</span>
            </div>
            <input
              type="number"
              min={1}
              max={10}
              value={directionsPerContext}
              onChange={(e) => setDirectionsPerContext(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              className="w-12 bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              disabled={isGenerating}
            />
            <span className="text-xs text-gray-500">{brainstormAll ? 'total' : '/ctx'}</span>
            <button
              onClick={handleGenerateDirections}
              disabled={disabled || isGenerating || (!brainstormAll && selectedContextCount === 0)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-600/80 hover:bg-cyan-500 text-white"
            >
              {generatingDirections ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Generate
            </button>
            {/* Brainstorm All toggle */}
            <button
              onClick={() => setBrainstormAll(!brainstormAll)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                brainstormAll
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                  : 'bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600/50'
              }`}
              title="Brainstorm across entire project"
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">All</span>
            </button>
            {/* Expand options button */}
            <button
              onClick={() => setShowDirectionOptions(!showDirectionOptions)}
              className={`p-1.5 rounded transition-colors ${showDirectionOptions ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-500 hover:text-gray-300'}`}
              title="Direction options"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showDirectionOptions ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Context count indicator */}
          {brainstormAll ? (
            <span className="text-xs text-amber-400/70">
              Brainstorming across {contexts.length} contexts
            </span>
          ) : selectedContextCount === 0 ? (
            <span className="text-xs text-gray-500">Select contexts above</span>
          ) : (
            <span className="text-xs text-gray-400">
              {selectedContextCount} context{selectedContextCount !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        {/* Direction Options (collapsible) */}
        <AnimatePresence>
          {showDirectionOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-gray-700/30 pt-3 space-y-3"
            >
              {/* User Context Textarea */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Focus area or dilemma (optional)
                </label>
                <textarea
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="Describe your current focus, challenge, or topic to guide direction suggestions..."
                  rows={2}
                  className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none text-sm"
                />
              </div>

              {/* Answered Questions Selector */}
              {answeredQuestions.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowQuestionSelector(!showQuestionSelector)}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>
                      Include answered questions as context
                      {selectedQuestionIds.length > 0 && (
                        <span className="ml-1.5 text-cyan-400">({selectedQuestionIds.length} selected)</span>
                      )}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showQuestionSelector ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showQuestionSelector && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-1.5 overflow-hidden"
                      >
                        {/* Select/Clear all */}
                        <div className="flex items-center gap-2 text-xs">
                          <button onClick={selectAllQuestions} className="text-cyan-400 hover:text-cyan-300">
                            Select all
                          </button>
                          <span className="text-gray-600">|</span>
                          <button onClick={clearAllQuestions} className="text-gray-400 hover:text-white">
                            Clear
                          </button>
                        </div>

                        {/* Question checkboxes */}
                        <div className="max-h-32 overflow-y-auto space-y-1 pr-2">
                          {answeredQuestions.map(q => (
                            <label
                              key={q.id}
                              className="flex items-start gap-2 p-1.5 rounded hover:bg-gray-800/50 cursor-pointer group"
                            >
                              <button
                                onClick={() => toggleQuestion(q.id)}
                                className="mt-0.5 flex-shrink-0"
                              >
                                {selectedQuestionIds.includes(q.id) ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-400" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-300 line-clamp-1">{q.question}</p>
                                <p className="text-xs text-gray-500 line-clamp-1">{q.answer}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Message */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`
                p-2.5 rounded-lg text-sm
                ${status === 'success'
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }
              `}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
