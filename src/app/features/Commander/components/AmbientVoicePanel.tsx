/**
 * Ambient Voice Panel
 * Always-on voice companion UI panel showing:
 * - Companion mode toggle (ambient / push-to-talk / off)
 * - Live audio level visualizer
 * - Ambient transcript feed with sentiment indicators
 * - Proactive suggestions from ambient awareness
 * - Last Annette response with replay
 * - Pipeline & TTS settings
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ear, Radio, MicOff, Mic, Volume2, VolumeX, Zap, X, Trash2,
  MessageSquare, AlertTriangle, HelpCircle, Sparkles, ChevronDown,
  ChevronRight, Play, Square, Settings2, Loader2, Hand,
} from 'lucide-react';
import { useVoiceCompanionStore } from '@/stores/voiceCompanionStore';

// ─── Audio Level Visualizer ───

function AudioLevelBar({ level }: { level: number }) {
  const barCount = 16;
  return (
    <div className="flex items-end gap-px h-6">
      {Array.from({ length: barCount }, (_, i) => {
        const threshold = i / barCount;
        const active = level > threshold;
        const intensity = Math.max(0, Math.min(1, (level - threshold) * barCount));
        return (
          <div
            key={i}
            className="w-1 rounded-full transition-all duration-75"
            style={{
              height: `${4 + (i / barCount) * 20}px`,
              backgroundColor: active
                ? i < barCount * 0.4
                  ? `rgba(52, 211, 153, ${0.4 + intensity * 0.6})`  // green
                  : i < barCount * 0.7
                    ? `rgba(251, 191, 36, ${0.4 + intensity * 0.6})` // amber
                    : `rgba(239, 68, 68, ${0.4 + intensity * 0.6})`  // red
                : 'rgba(71, 85, 105, 0.3)',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Sentiment Icon ───

function SentimentIcon({ sentiment }: { sentiment?: string }) {
  switch (sentiment) {
    case 'frustrated':
      return <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />;
    case 'curious':
      return <HelpCircle className="w-3 h-3 text-blue-400 flex-shrink-0" />;
    case 'excited':
      return <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />;
    default:
      return <MessageSquare className="w-3 h-3 text-slate-500 flex-shrink-0" />;
  }
}

// ─── State Badge ───

function StateBadge({ state }: { state: string }) {
  const configs: Record<string, { color: string; label: string; pulse?: boolean }> = {
    idle: { color: 'bg-slate-600/30 text-slate-500 border-slate-600/30', label: 'Idle' },
    listening: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Listening', pulse: true },
    processing: { color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Processing' },
    speaking: { color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', label: 'Speaking', pulse: true },
    error: { color: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Error' },
  };
  const cfg = configs[state] || configs.idle;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.color}`}>
      {cfg.pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {cfg.label}
    </span>
  );
}

// ─── Mode Button ───

function ModeButton({
  active, icon: Icon, label, onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none ${
        active
          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
          : 'text-slate-500 hover:text-slate-300 bg-slate-800/40 border border-slate-700/30 hover:bg-slate-700/40'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ─── Main Panel ───

export default function AmbientVoicePanel() {
  const {
    mode, engineState, isActive, audioLevel,
    transcripts, suggestions, lastResponse, lastResponseAudio,
    error, pipeline, ttsEnabled, autoPlay, isPanelOpen,
    startCompanion, stopCompanion, setMode, startPushToTalk, stopPushToTalk,
    interrupt, dismissSuggestion, setPipeline, toggleTts, toggleAutoPlay,
    togglePanel, clearError, clearTranscripts,
  } = useVoiceCompanionStore();

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auto-scroll transcript feed
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts.length]);

  const handleToggleActive = useCallback(async () => {
    if (isActive) {
      stopCompanion();
    } else {
      await startCompanion();
    }
  }, [isActive, startCompanion, stopCompanion]);

  const recentTranscripts = transcripts.slice(-15);
  const activeSuggestions = suggestions.filter((s) => !s.dismissed);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <Ear className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-medium text-slate-300">Voice Companion</span>
          <StateBadge state={engineState} />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700/40 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none"
            aria-label="Toggle settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Controls Row ── */}
      <div className="px-4 py-2 border-b border-slate-800/30 space-y-2">
        {/* Power + Mode */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none ${
              isActive
                ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
            }`}
          >
            {isActive ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isActive ? 'Stop' : 'Start'}
          </button>

          {isActive && (
            <>
              <div className="w-px h-5 bg-slate-700/40" />
              <ModeButton
                active={mode === 'ambient'}
                icon={Ear}
                label="Ambient"
                onClick={() => setMode('ambient')}
              />
              <ModeButton
                active={mode === 'push-to-talk'}
                icon={Hand}
                label="Push-to-Talk"
                onClick={() => setMode('push-to-talk')}
              />
            </>
          )}
        </div>

        {/* Audio Level + Push-to-Talk Button */}
        {isActive && (
          <div className="flex items-center gap-3">
            <AudioLevelBar level={audioLevel} />

            {mode === 'push-to-talk' && (
              <button
                onMouseDown={startPushToTalk}
                onMouseUp={stopPushToTalk}
                onMouseLeave={stopPushToTalk}
                onTouchStart={startPushToTalk}
                onTouchEnd={stopPushToTalk}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all select-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none ${
                  engineState === 'listening'
                    ? 'bg-red-500/20 border border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                    : 'bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25'
                }`}
              >
                <Mic className="w-4 h-4" />
                {engineState === 'listening' ? 'Listening...' : 'Hold to speak'}
              </button>
            )}

            {engineState === 'speaking' && (
              <button
                onClick={interrupt}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none"
              >
                <VolumeX className="w-3 h-3" />
                Interrupt
              </button>
            )}

            {engineState === 'processing' && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing...
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Settings Collapsible ── */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-b border-slate-800/30"
          >
            <div className="px-4 py-2 space-y-2">
              {/* Pipeline */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-16">Pipeline</span>
                <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5">
                  <button
                    onClick={() => setPipeline('annette')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none ${
                      pipeline === 'annette'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Annette
                  </button>
                  <button
                    onClick={() => setPipeline('simple')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none ${
                      pipeline === 'simple'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Simple
                  </button>
                </div>
              </div>

              {/* TTS + Auto-play */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTts}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none ${
                    ttsEnabled
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-500 bg-slate-800/40 border border-slate-700/30'
                  }`}
                >
                  <Volume2 className="w-3 h-3" />
                  {ttsEnabled ? 'TTS On' : 'TTS Off'}
                </button>
                {ttsEnabled && (
                  <button
                    onClick={toggleAutoPlay}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none ${
                      autoPlay
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        : 'text-slate-500 bg-slate-800/40 border border-slate-700/30'
                    }`}
                  >
                    <Play className="w-2.5 h-2.5" />
                    {autoPlay ? 'Auto-Play' : 'Manual'}
                  </button>
                )}
              </div>

              {/* Wake words info */}
              <div className="text-[10px] text-slate-600">
                Wake words: <span className="text-slate-500">&quot;Hey Annette&quot;, &quot;Annette&quot;</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-red-500/10 border-b border-red-500/20"
          >
            <div className="flex items-center justify-between text-xs text-red-300">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300 ml-2 focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none rounded"
              >
                dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Proactive Suggestions ── */}
      <AnimatePresence>
        {activeSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-slate-800/30"
          >
            <div className="px-4 py-2 space-y-1.5">
              {activeSuggestions.slice(-3).map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/15 px-2.5 py-1.5"
                >
                  <Zap className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-300">{s.suggestion}</p>
                    <p className="text-[10px] text-slate-600 truncate mt-0.5">
                      Heard: &quot;{s.trigger.slice(0, 60)}{s.trigger.length > 60 ? '...' : ''}&quot;
                    </p>
                  </div>
                  <button
                    onClick={() => dismissSuggestion(s.id)}
                    className="text-slate-600 hover:text-slate-400 flex-shrink-0 focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none rounded"
                    aria-label="Dismiss suggestion"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Transcript Feed ── */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {recentTranscripts.length === 0 && isActive && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-600">
            <Ear className="w-6 h-6 mb-2 opacity-40" />
            <p className="text-xs">
              {mode === 'ambient' ? 'Listening for speech...' : 'Press and hold to speak'}
            </p>
            <p className="text-[10px] mt-1 text-slate-700">
              Say &quot;Hey Annette&quot; to talk to me
            </p>
          </div>
        )}

        {!isActive && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-600">
            <MicOff className="w-6 h-6 mb-2 opacity-40" />
            <p className="text-xs">Voice companion is off</p>
            <p className="text-[10px] mt-1 text-slate-700">Click Start to begin</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {recentTranscripts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                t.isDirected
                  ? 'bg-cyan-500/5 border border-cyan-500/15'
                  : 'bg-slate-800/20'
              }`}
            >
              <SentimentIcon sentiment={t.sentiment} />
              <div className="flex-1 min-w-0">
                <span className={t.isDirected ? 'text-cyan-300' : 'text-slate-400'}>
                  {t.text}
                </span>
                {t.isDirected && (
                  <span className="ml-1.5 text-[10px] text-cyan-500/60 font-medium">DIRECTED</span>
                )}
              </div>
              <span className="text-[10px] text-slate-600 flex-shrink-0">
                {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={transcriptEndRef} />
      </div>

      {/* ── Last Response ── */}
      <AnimatePresence>
        {lastResponse && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-slate-800/50 px-4 py-2.5"
          >
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                Annette
              </span>
              <p className="text-xs text-slate-400 flex-1 line-clamp-3">{lastResponse}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      {recentTranscripts.length > 0 && (
        <div className="border-t border-slate-800/50 px-4 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">
            {transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={clearTranscripts}
            className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none rounded"
          >
            <Trash2 className="w-2.5 h-2.5" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

