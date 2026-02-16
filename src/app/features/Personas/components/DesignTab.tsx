'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { useDesignAnalysis } from '@/app/features/Personas/hooks/useDesignAnalysis';
import type { DesignAnalysisResult, SuggestedConnector } from '@/app/features/Personas/lib/designTypes';
import { DesignTerminal } from './DesignTerminal';
import { DesignResultPreview } from './DesignResultPreview';
import { ConnectorCredentialModal } from './ConnectorCredentialModal';
import { Sparkles, Send, X, Check, RefreshCw, Loader2, Pencil, MessageCircleQuestion } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DesignInput } from './DesignInput';
import type { DesignContext } from '@/app/db/models/persona.types';

export function DesignTab() {
  const selectedPersona = usePersonaStore((s) => s.selectedPersona);
  const toolDefinitions = usePersonaStore((s) => s.toolDefinitions);
  const credentials = usePersonaStore((s) => s.credentials);
  const connectorDefinitions = usePersonaStore((s) => s.connectorDefinitions);
  const fetchConnectorDefinitions = usePersonaStore((s) => s.fetchConnectorDefinitions);
  const createCredential = usePersonaStore((s) => s.createCredential);
  const fetchCredentials = usePersonaStore((s) => s.fetchCredentials);
  const updateTrigger = usePersonaStore((s) => s.updateTrigger);
  const updatePersona = usePersonaStore((s) => s.updatePersona);

  // Fetch connector definitions on mount
  useEffect(() => {
    if (connectorDefinitions.length === 0) {
      fetchConnectorDefinitions();
    }
  }, [connectorDefinitions.length, fetchConnectorDefinitions]);

  const {
    phase,
    outputLines,
    result,
    error,
    question,
    currentDesignId,
    startAnalysis,
    cancelAnalysis,
    refineAnalysis,
    answerQuestion,
    applyResult,
    reset,
  } = useDesignAnalysis();

  const [instruction, setInstruction] = useState('');
  const [designContext, setDesignContext] = useState<DesignContext>({ files: [], references: [] });
  const [refinementMessage, setRefinementMessage] = useState('');
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [selectedTriggerIndices, setSelectedTriggerIndices] = useState<Set<number>>(new Set());
  const [selectedChannelIndices, setSelectedChannelIndices] = useState<Set<number>>(new Set());
  const [selectedSubscriptionIndices, setSelectedSubscriptionIndices] = useState<Set<number>>(new Set());
  const [credentialModalConnector, setCredentialModalConnector] = useState<SuggestedConnector | null>(null);
  const [questionAnswer, setQuestionAnswer] = useState('');

  // Parse saved design result from persona DB
  // Patches legacy results that pre-date the oauth_type field on connectors
  const savedDesignResult = useMemo<DesignAnalysisResult | null>(() => {
    if (!selectedPersona?.last_design_result) return null;
    try {
      const parsed = JSON.parse(selectedPersona.last_design_result) as DesignAnalysisResult;
      const GOOGLE_CONNECTORS = new Set(['gmail', 'google_calendar', 'google_drive']);
      parsed.suggested_connectors?.forEach((c) => {
        if (!c.oauth_type && GOOGLE_CONNECTORS.has(c.name)) {
          c.oauth_type = 'google';
        }
      });
      return parsed;
    } catch {
      return null;
    }
  }, [selectedPersona?.last_design_result]);

  // Initialize design context from persona DB
  useEffect(() => {
    if (selectedPersona?.design_context) {
      try {
        const saved = JSON.parse(selectedPersona.design_context) as DesignContext;
        setDesignContext(saved);
      } catch {
        setDesignContext({ files: [], references: [] });
      }
    } else {
      setDesignContext({ files: [], references: [] });
    }
  }, [selectedPersona?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setSelectedChannelIndices(
        new Set((result.suggested_notification_channels || []).map((_, i) => i))
      );
      if (result.suggested_event_subscriptions?.length) {
        setSelectedSubscriptionIndices(new Set(result.suggested_event_subscriptions.map((_: any, i: number) => i)));
      }
    }
  }, [resultId]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentToolNames = useMemo(
    () => (selectedPersona?.tools || []).map((t) => t.name),
    [selectedPersona]
  );

  const handleStartAnalysis = async () => {
    if (!selectedPersona || !instruction.trim()) return;
    // Persist design context to persona before starting
    const hasContext = designContext.files.length > 0 || designContext.references.length > 0;
    if (hasContext) {
      await updatePersona(selectedPersona.id, {
        design_context: JSON.stringify(designContext),
      });
    }
    startAnalysis(selectedPersona.id, instruction.trim());
  };

  const handleApply = async () => {
    if (!selectedPersona || !result) return;
    await applyResult(
      selectedPersona.id,
      Array.from(selectedTools),
      Array.from(selectedTriggerIndices),
      Array.from(selectedChannelIndices),
      Array.from(selectedSubscriptionIndices)
    );
  };

  const handleRefine = () => {
    reset();
    // instruction stays preserved - no clearing
  };

  const handleSendRefinement = () => {
    if (!selectedPersona || !currentDesignId || !refinementMessage.trim()) return;
    refineAnalysis(selectedPersona.id, currentDesignId, refinementMessage.trim());
    setRefinementMessage('');
  };

  const handleDiscard = () => {
    reset();
    setInstruction('');
    setDesignContext({ files: [], references: [] });
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

  const handleChannelToggle = (index: number) => {
    setSelectedChannelIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleTriggerEnabledToggle = async (triggerId: string, enabled: boolean) => {
    if (!selectedPersona) return;
    await updateTrigger(selectedPersona.id, triggerId, { enabled });
  };

  /** Start a new design analysis from the idle-with-overview chat input */
  const handleOverviewRedesign = async () => {
    if (!selectedPersona || !instruction.trim()) return;
    // Persist design context to persona before starting
    const hasContext = designContext.files.length > 0 || designContext.references.length > 0;
    if (hasContext) {
      await updatePersona(selectedPersona.id, {
        design_context: JSON.stringify(designContext),
      });
    }
    startAnalysis(selectedPersona.id, instruction.trim());
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
            className="space-y-4"
          >
            {savedDesignResult ? (
              <>
                {/* Read-only overview of saved design */}
                <DesignResultPreview
                  result={savedDesignResult}
                  allToolDefs={toolDefinitions}
                  currentToolNames={currentToolNames}
                  credentials={credentials}
                  connectorDefinitions={connectorDefinitions}
                  selectedTools={new Set(savedDesignResult.suggested_tools)}
                  selectedTriggerIndices={new Set(savedDesignResult.suggested_triggers.map((_, i) => i))}
                  selectedChannelIndices={new Set((savedDesignResult.suggested_notification_channels || []).map((_, i) => i))}
                  suggestedSubscriptions={savedDesignResult.suggested_event_subscriptions}
                  selectedSubscriptionIndices={new Set((savedDesignResult.suggested_event_subscriptions || []).map((_: any, i: number) => i))}
                  onToolToggle={() => {}}
                  onTriggerToggle={() => {}}
                  onChannelToggle={() => {}}
                  onConnectorClick={setCredentialModalConnector}
                  readOnly
                  actualTriggers={selectedPersona.triggers || []}
                  onTriggerEnabledToggle={handleTriggerEnabledToggle}
                  feasibility={savedDesignResult.feasibility}
                />

                {/* Chat input for modifications */}
                <div className="pt-2 border-t border-primary/10 space-y-2">
                  <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground/50">
                    <Pencil className="w-3 h-3 shrink-0" />
                    <span>Current configuration will be preserved. Describe what to change.</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <textarea
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="Describe changes to this design..."
                      className="flex-1 min-h-[60px] max-h-[120px] bg-background/50 border border-primary/15 rounded-xl px-3 py-2 text-sm text-foreground font-sans resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder-muted-foreground/30"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleOverviewRedesign();
                        }
                      }}
                    />
                    <button
                      onClick={handleOverviewRedesign}
                      disabled={!instruction.trim()}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        !instruction.trim()
                          ? 'bg-secondary/40 text-muted-foreground/30 cursor-not-allowed'
                          : 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/20 hover:from-primary/90 hover:to-accent/90'
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Update Design
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Fresh design: no saved result */}
                <DesignInput
                  instruction={instruction}
                  onInstructionChange={setInstruction}
                  designContext={designContext}
                  onDesignContextChange={setDesignContext}
                  disabled={phase !== 'idle'}
                  onSubmit={handleStartAnalysis}
                />

                {error && (
                  <p className="text-sm text-red-400 px-1">{error}</p>
                )}

                <button
                  onClick={handleStartAnalysis}
                  disabled={!instruction.trim()}
                  className={`flex items-center justify-center gap-2.5 px-4 py-2 rounded-xl font-medium text-sm transition-all w-full ${
                    !instruction.trim()
                      ? 'bg-secondary/60 text-muted-foreground/40 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Analyze &amp; Build
                </button>
              </>
            )}
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
            {savedDesignResult && (
              <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground/50">
                <Pencil className="w-3 h-3 shrink-0" />
                <span>Updating design...</span>
              </div>
            )}
            <div className="bg-secondary/30 rounded-xl px-4 py-3 text-sm text-foreground/70 border border-primary/15">
              {instruction}
            </div>

            <DesignTerminal lines={outputLines} isRunning={true} />

            <button
              onClick={cancelAnalysis}
              className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </motion.div>
        )}

        {/* ── Phase: refining ─────────────────────────────────────── */}
        {phase === 'refining' && (
          <motion.div
            key="refining"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            {result && (
              <div className="bg-secondary/30 rounded-xl px-4 py-3 border border-primary/15">
                <p className="text-sm text-muted-foreground/50 mb-1">Current design</p>
                <p className="text-sm text-foreground/70">{result.summary}</p>
              </div>
            )}

            <DesignTerminal lines={outputLines} isRunning={true} />

            <button
              onClick={cancelAnalysis}
              className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </motion.div>
        )}

        {/* ── Phase: awaiting-input ──────────────────────────────── */}
        {phase === 'awaiting-input' && question && (
          <motion.div
            key="awaiting-input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Terminal output so far */}
            <DesignTerminal lines={outputLines} isRunning={false} />

            {/* Question card */}
            <div className="bg-gradient-to-br from-purple-500/10 via-primary/5 to-transparent border border-purple-500/20 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                  <MessageCircleQuestion className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-sm font-semibold text-purple-300">Clarification Needed</span>
              </div>

              <p className="text-sm text-foreground/80 leading-relaxed">{question.question}</p>

              {question.context && (
                <p className="text-xs text-muted-foreground/50 italic border-l-2 border-purple-500/20 pl-3">
                  {question.context}
                </p>
              )}

              {/* Option buttons */}
              {question.options && question.options.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {question.options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuestionAnswer('');
                        answerQuestion(option);
                      }}
                      className="px-3.5 py-2 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-primary/10" />
                <span className="text-[10px] text-muted-foreground/30 uppercase tracking-wider">or type your answer</span>
                <div className="flex-1 h-px bg-primary/10" />
              </div>

              {/* Free-text input */}
              <div className="flex items-end gap-2">
                <textarea
                  value={questionAnswer}
                  onChange={(e) => setQuestionAnswer(e.target.value)}
                  placeholder="Type a custom answer..."
                  className="flex-1 min-h-[48px] max-h-[100px] bg-background/50 border border-primary/15 rounded-xl px-3 py-2 text-sm text-foreground font-sans resize-y focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all placeholder-muted-foreground/30"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (questionAnswer.trim()) {
                        answerQuestion(questionAnswer.trim());
                        setQuestionAnswer('');
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (questionAnswer.trim()) {
                      answerQuestion(questionAnswer.trim());
                      setQuestionAnswer('');
                    }
                  }}
                  disabled={!questionAnswer.trim()}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    !questionAnswer.trim()
                      ? 'bg-secondary/40 text-muted-foreground/30 cursor-not-allowed'
                      : 'bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Answer
                </button>
              </div>
            </div>

            {/* Cancel */}
            <button
              onClick={cancelAnalysis}
              className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground/50 hover:text-foreground/60 transition-colors"
            >
              Cancel Design
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
              connectorDefinitions={connectorDefinitions}
              selectedTools={selectedTools}
              selectedTriggerIndices={selectedTriggerIndices}
              selectedChannelIndices={selectedChannelIndices}
              suggestedSubscriptions={result.suggested_event_subscriptions}
              selectedSubscriptionIndices={selectedSubscriptionIndices}
              onToolToggle={handleToolToggle}
              onTriggerToggle={handleTriggerToggle}
              onChannelToggle={handleChannelToggle}
              onSubscriptionToggle={(idx) => {
                setSelectedSubscriptionIndices(prev => {
                  const next = new Set(prev);
                  if (next.has(idx)) next.delete(idx);
                  else next.add(idx);
                  return next;
                });
              }}
              onConnectorClick={setCredentialModalConnector}
              feasibility={result.feasibility}
            />

            {error && (
              <p className="text-sm text-red-400 px-1">{error}</p>
            )}

            {/* Action buttons row */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleApply}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gradient-to-r from-primary to-accent text-white hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Check className="w-3.5 h-3.5" />
                Apply Changes
              </button>
              <button
                onClick={handleRefine}
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm bg-secondary/50 text-foreground/70 hover:bg-secondary/70 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refine
              </button>
              <button
                onClick={handleDiscard}
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm text-muted-foreground hover:text-foreground/60 transition-colors"
              >
                Discard
              </button>
            </div>

            {/* Refinement chat input */}
            <div className="flex items-end gap-2">
              <textarea
                value={refinementMessage}
                onChange={(e) => setRefinementMessage(e.target.value)}
                placeholder="Describe what to change..."
                className="flex-1 min-h-[60px] max-h-[120px] bg-background/50 border border-primary/15 rounded-xl px-3 py-2 text-sm text-foreground font-sans resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder-muted-foreground/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendRefinement();
                  }
                }}
              />
              <button
                onClick={handleSendRefinement}
                disabled={!refinementMessage.trim() || !currentDesignId}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  !refinementMessage.trim() || !currentDesignId
                    ? 'bg-secondary/40 text-muted-foreground/30 cursor-not-allowed'
                    : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                Send
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
              className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary/50 text-foreground/70 hover:bg-secondary/70 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connector Credential Modal */}
      {credentialModalConnector && (
        <ConnectorCredentialModal
          connector={credentialModalConnector}
          connectorDefinition={connectorDefinitions.find((c) => c.name === credentialModalConnector.name)}
          existingCredential={credentials.find((c) => c.service_type === credentialModalConnector.name)}
          onSave={async (values) => {
            await createCredential({
              name: `${credentialModalConnector.name} credential`,
              service_type: credentialModalConnector.name,
              data: values,
            });
            await fetchCredentials();
            setCredentialModalConnector(null);
          }}
          onClose={() => setCredentialModalConnector(null)}
        />
      )}
    </div>
  );
}
