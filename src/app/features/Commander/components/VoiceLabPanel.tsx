/**
 * Voice Lab Panel
 * Test session UI with tech stack overview, pipeline testing, mic input (STT),
 * auto-play TTS audio, and development directions.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Loader2, ChevronDown, ChevronRight, Zap, BarChart3, Cpu,
  Mic, MicOff, Volume2, BrainCircuit, Database, Radio, Globe, Play,
} from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import VoiceLabTimingBar from './VoiceLabTimingBar';

// --- Types ---

interface Exchange {
  id: string;
  prompt: string;
  response: string;
  pipeline: 'annette' | 'simple';
  model: string;
  timing: {
    sttMs?: number;
    llmMs: number;
    ttsMs?: number;
    ttsCached?: boolean;
    totalMs: number;
  };
  audioBase64?: string;
  inputMethod: 'text' | 'voice';
}

interface SessionStats {
  count: number;
  avgLlm: number;
  avgTts: number;
  avgTotal: number;
  fastest: number;
  slowest: number;
  ttsCacheHits: number;
  ttsCacheTotal: number;
  avgStt: number;
}

// --- Constants ---

const TEST_PROMPTS = [
  'hi',
  'this is a test',
  'tell me a joke',
  "what's 2+2?",
  'say something short',
];

const TECH_STACK = [
  { icon: Mic, label: 'STT', value: 'ElevenLabs Scribe v2 (cloud API, 90+ languages)' },
  { icon: BrainCircuit, label: 'LLM (Main)', value: 'Claude Haiku 4.5 via Anthropic Messages API (tool_use, max 10 rounds, 4096 max tokens)' },
  { icon: Cpu, label: 'LLM (Alt)', value: 'Gemini 3 Flash Preview via Google AI API (150 max tokens, no tools)' },
  { icon: Cpu, label: 'LLM (Eval)', value: 'Gemini 3 Flash Preview via Google AI API (conversation evaluation)' },
  { icon: Volume2, label: 'TTS', value: 'ElevenLabs eleven_flash_v2_5 (voice: WAhoMTNdLdMoq1j3wf3I, stability 0.8)' },
  { icon: Volume2, label: 'TTS (Alt)', value: 'OpenAI TTS-1 (voice: alloy, MP3 output)' },
  { icon: Radio, label: 'Audio Capture', value: 'Web Audio API → 16kHz mono downsample' },
  { icon: Globe, label: 'Audio Playback', value: 'HTMLAudioElement (browser native)' },
  { icon: Database, label: 'Caching', value: 'In-memory TTS cache (SHA-256 keys, 10min TTL, 50 entries max)' },
  { icon: BarChart3, label: 'History', value: 'Summarize after 10 messages (keep first 2 + last 4)' },
];

const DIRECTIONS = [
  {
    title: 'Streaming TTS with chunked playback',
    body: 'Instead of waiting for the full LLM response before starting TTS, stream LLM tokens, buffer sentence-sized chunks, and start TTS+playback on the first chunk while the rest generates. This overlaps LLM and TTS latency. Implementation: use Anthropic streaming API, accumulate until sentence boundary, fire TTS request per chunk, queue audio segments.',
  },
  {
    title: 'WebSocket-based bidirectional audio stream',
    body: 'Replace the current request/response pattern (record → upload → wait → download → play) with a persistent WebSocket connection. Audio frames stream continuously to the server, STT runs incrementally (partial transcripts), and TTS audio streams back in real-time. This eliminates HTTP overhead per turn and enables interrupt-ability (user can interrupt Annette mid-response).',
  },
  {
    title: 'Local/edge STT with Whisper.cpp or WebAssembly',
    body: 'Move STT to run locally using whisper.cpp (native) or a WebAssembly Whisper model in the browser. This eliminates STT network latency entirely (~100-300ms saved). The tradeoff is slightly lower accuracy than cloud Scribe, but for development-assistant use-cases, English-only local whisper is very competitive.',
  },
  {
    title: 'Tiered LLM response strategy',
    body: 'Use a fast initial response + enrichment pattern: (a) First, generate a quick 1-sentence acknowledgment using a local model (Ollama, <200ms), play it immediately as TTS; (b) Then run the full Claude Haiku orchestration with tools in the background; (c) When the full response is ready, either play it or present it as a follow-up. This gives instant feedback while maintaining precision.',
  },
  {
    title: 'Precomputed response cache with semantic matching',
    body: 'For common voice interactions (greetings, status queries, "what should I work on"), maintain a semantic cache of recent full responses. Use embedding similarity to detect near-duplicate queries and serve cached responses instantly. Brain context changes would invalidate relevant cache entries. This could reduce repeat-query latency to near-zero while preserving freshness for novel questions.',
  },
];

// --- Helpers ---

function computeStats(exchanges: Exchange[]): SessionStats {
  if (exchanges.length === 0) {
    return { count: 0, avgLlm: 0, avgTts: 0, avgTotal: 0, fastest: 0, slowest: 0, ttsCacheHits: 0, ttsCacheTotal: 0, avgStt: 0 };
  }
  const totals = exchanges.map((e) => e.timing.totalMs);
  const llms = exchanges.map((e) => e.timing.llmMs);
  const ttsEntries = exchanges.filter((e) => e.timing.ttsMs !== undefined && e.timing.ttsMs >= 0);
  const ttsCacheHits = exchanges.filter((e) => e.timing.ttsCached).length;
  const ttsCacheTotal = ttsEntries.length;
  const sttEntries = exchanges.filter((e) => e.timing.sttMs !== undefined && e.timing.sttMs >= 0);

  return {
    count: exchanges.length,
    avgLlm: Math.round(llms.reduce((a, b) => a + b, 0) / llms.length),
    avgTts: ttsEntries.length > 0 ? Math.round(ttsEntries.reduce((a, b) => a + b.timing.ttsMs!, 0) / ttsEntries.length) : 0,
    avgTotal: Math.round(totals.reduce((a, b) => a + b, 0) / totals.length),
    fastest: Math.min(...totals),
    slowest: Math.max(...totals),
    ttsCacheHits,
    ttsCacheTotal,
    avgStt: sttEntries.length > 0 ? Math.round(sttEntries.reduce((a, b) => a + b.timing.sttMs!, 0) / sttEntries.length) : 0,
  };
}

/** Play base64 mp3 audio via HTMLAudioElement. Returns a promise that resolves when playback ends. */
function playAudioBase64(base64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Audio playback failed'));
    audio.play().catch(reject);
  });
}

// --- Recording waveform animation ---

function RecordingWaveform() {
  return (
    <div className="flex items-center gap-[2px] h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-[2px] bg-red-400 rounded-full"
          animate={{ height: ['6px', '14px', '6px'] }}
          transition={{ duration: 0.5 + i * 0.08, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
        />
      ))}
    </div>
  );
}

// --- Component ---

export default function VoiceLabPanel() {
  const activeProject = useActiveProjectStore((s) => s.activeProject);
  const [pipeline, setPipeline] = useState<'annette' | 'simple'>('annette');
  const [includeTts, setIncludeTts] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [techStackOpen, setTechStackOpen] = useState(true);
  const [directionsOpen, setDirectionsOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stats = computeStats(exchanges);

  // ── Core test runner ──

  const runTest = useCallback(async (prompt: string, sttMs?: number) => {
    if (!prompt.trim() || isLoading) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/voicebot/test-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt.trim(),
          pipeline,
          projectId: activeProject?.id || 'test',
          projectPath: activeProject?.path,
          includeTts,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Request failed');
        return;
      }

      const exchangeId = `ex-${Date.now()}`;

      const newExchange: Exchange = {
        id: exchangeId,
        prompt: prompt.trim(),
        response: data.response,
        pipeline: data.pipeline,
        model: data.model,
        timing: {
          sttMs,
          llmMs: data.timing.llmMs,
          ttsMs: data.timing.ttsMs,
          ttsCached: data.timing.ttsCached,
          totalMs: data.timing.totalMs + (sttMs || 0),
        },
        audioBase64: data.audioBase64,
        inputMethod: sttMs !== undefined ? 'voice' : 'text',
      };

      setExchanges((prev) => [...prev, newExchange]);

      // Auto-play TTS audio if enabled and available
      if (autoPlay && data.audioBase64) {
        setIsPlaying(exchangeId);
        try {
          await playAudioBase64(data.audioBase64);
        } catch {
          // playback failure is non-critical
        } finally {
          setIsPlaying(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [pipeline, activeProject, isLoading, includeTts, autoPlay]);

  const handleCustomSend = useCallback(() => {
    if (!customInput.trim()) return;
    runTest(customInput);
    setCustomInput('');
  }, [customInput, runTest]);

  // ── Microphone recording + STT ──

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Microphone API not available. Ensure you are on HTTPS or localhost.');
        return;
      }

      // Check Permissions API if available to give early feedback
      if (navigator.permissions) {
        try {
          const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (perm.state === 'denied') {
            setError('Microphone permission denied. Allow microphone access in browser settings and restart the dev server to pick up Permissions-Policy changes.');
            return;
          }
        } catch {
          // permissions.query may not support 'microphone' in all browsers — proceed anyway
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop media tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) {
          setError('No audio captured');
          return;
        }

        // Send to STT
        setIsTranscribing(true);
        const sttStart = Date.now();
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');

          const res = await fetch('/api/voicebot/speech-to-text', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          const sttMs = Date.now() - sttStart;

          if (!data.success || !data.text) {
            setError(data.error || 'Transcription returned empty');
            return;
          }

          // Feed transcription into the test pipeline
          await runTest(data.text, sttMs);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'STT failed');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Microphone blocked by browser policy. Restart the dev server so the updated Permissions-Policy header takes effect, then reload the page.');
      } else {
        setError(`Microphone error: ${msg}`);
      }
    }
  }, [runTest]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // ── Manual replay ──

  const replayAudio = useCallback(async (exchangeId: string, base64: string) => {
    setIsPlaying(exchangeId);
    try {
      await playAudioBase64(base64);
    } catch {
      // non-critical
    } finally {
      setIsPlaying(null);
    }
  }, []);

  const isBusy = isLoading || isTranscribing;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── A) Tech Stack Overview ── */}
      <div className="border-b border-slate-800/50">
        <button
          onClick={() => setTechStackOpen(!techStackOpen)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors"
        >
          {techStackOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <Cpu className="w-3.5 h-3.5" />
          Pipeline Component Overview
        </button>
        <AnimatePresence>
          {techStackOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-1.5">
                {TECH_STACK.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <item.icon className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="text-cyan-400 font-medium">{item.label}:</span>{' '}
                      <span className="text-slate-400">{item.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── B) Test Session Area ── */}
      <div className="flex-1 px-4 py-3 space-y-4">
        {/* Controls row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Pipeline selector */}
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5">
            <button
              onClick={() => setPipeline('annette')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                pipeline === 'annette'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Annette (full)
            </button>
            <button
              onClick={() => setPipeline('simple')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                pipeline === 'simple'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Simple (no tools)
            </button>
          </div>

          {/* TTS toggle */}
          <button
            onClick={() => setIncludeTts(!includeTts)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              includeTts
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-500 hover:text-slate-300 bg-slate-800/40 border border-slate-700/30'
            }`}
          >
            <Volume2 className="w-3 h-3" />
            {includeTts ? 'TTS On' : 'TTS Off'}
          </button>

          {/* Auto-play toggle (only visible when TTS is on) */}
          {includeTts && (
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                autoPlay
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  : 'text-slate-500 hover:text-slate-300 bg-slate-800/40 border border-slate-700/30'
              }`}
            >
              <Play className="w-3 h-3" />
              {autoPlay ? 'Auto-Play' : 'Manual Play'}
            </button>
          )}

          {/* Running averages */}
          {stats.count > 0 && (
            <div className="flex items-center gap-3 ml-auto text-[10px] text-slate-500">
              {stats.avgStt > 0 && <span>Avg STT: <span className="text-blue-400">{stats.avgStt}ms</span></span>}
              <span>Avg LLM: <span className="text-amber-400">{stats.avgLlm}ms</span></span>
              {stats.avgTts > 0 && <span>Avg TTS: <span className="text-emerald-400">{stats.avgTts}ms</span></span>}
              <span>Avg Total: <span className="text-slate-300">{stats.avgTotal}ms</span></span>
            </div>
          )}
        </div>

        {/* Test prompts + mic button */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {/* Mic button */}
          <button
            onClick={toggleRecording}
            disabled={isBusy}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isRecording
                ? 'bg-red-500/20 border border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                : 'bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25'
            }`}
            title={isRecording ? 'Stop recording' : 'Record voice (STT test)'}
          >
            {isRecording ? (
              <>
                <RecordingWaveform />
                <span>Stop</span>
              </>
            ) : isTranscribing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transcribing...</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Speak</span>
              </>
            )}
          </button>

          <div className="w-px h-5 bg-slate-700/40" />

          {/* Text test prompts */}
          {TEST_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => runTest(prompt)}
              disabled={isBusy}
              className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/30 text-slate-400 text-xs hover:bg-slate-800/80 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/30 rounded-xl px-3 py-2 focus-within:border-cyan-500/30 transition-colors">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCustomSend(); } }}
            placeholder="Custom test prompt..."
            disabled={isBusy}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none disabled:opacity-50"
          />
          <button
            onClick={handleCustomSend}
            disabled={!customInput.trim() || isBusy}
            className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center justify-between"
            >
              {error}
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-2">dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exchange list */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {exchanges.map((ex) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-slate-800/30 border border-slate-700/20 p-3 space-y-2"
              >
                {/* User prompt */}
                <div className="flex items-start gap-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 ${
                    ex.inputMethod === 'voice'
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-cyan-400 bg-cyan-500/10'
                  }`}>
                    {ex.inputMethod === 'voice' && <Mic className="w-2.5 h-2.5" />}
                    YOU
                  </span>
                  <span className="text-xs text-slate-300">{ex.prompt}</span>
                  <span className="ml-auto text-[10px] text-slate-600 whitespace-nowrap">{ex.pipeline} · {ex.model}</span>
                </div>

                {/* Response */}
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">AI</span>
                  <span className="text-xs text-slate-400 whitespace-pre-wrap break-words flex-1">{ex.response}</span>
                  {/* Play button for exchanges with audio */}
                  {ex.audioBase64 && (
                    <button
                      onClick={() => replayAudio(ex.id, ex.audioBase64!)}
                      disabled={isPlaying === ex.id}
                      className={`flex-shrink-0 p-1 rounded-md transition-colors ${
                        isPlaying === ex.id
                          ? 'text-purple-400 bg-purple-500/20'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                      }`}
                      title="Play audio"
                    >
                      {isPlaying === ex.id ? (
                        <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Timing bar */}
                <VoiceLabTimingBar
                  sttMs={ex.timing.sttMs}
                  llmMs={ex.timing.llmMs}
                  ttsMs={ex.timing.ttsMs}
                  totalMs={ex.timing.totalMs}
                  ttsCached={ex.timing.ttsCached}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {(isLoading || isTranscribing) && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            {isTranscribing ? 'Transcribing speech...' : 'Processing...'}
          </div>
        )}
      </div>

      {/* ── C) Session Summary ── */}
      {stats.count > 0 && (
        <div className="border-t border-slate-800/50 px-4 py-3">
          <h4 className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Session Summary
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBlock label="Exchanges" value={String(stats.count)} />
            <StatBlock label="Avg Response" value={`${stats.avgTotal}ms`} />
            <StatBlock label="Fastest" value={`${stats.fastest}ms`} accent="emerald" />
            <StatBlock label="Slowest" value={`${stats.slowest}ms`} accent={stats.slowest > 2000 ? 'red' : 'amber'} />
            {stats.avgStt > 0 && (
              <StatBlock label="Avg STT" value={`${stats.avgStt}ms`} accent="blue" />
            )}
            {stats.ttsCacheTotal > 0 && (
              <StatBlock
                label="TTS Cache Hits"
                value={`${stats.ttsCacheHits}/${stats.ttsCacheTotal}`}
                accent="cyan"
              />
            )}
          </div>
        </div>
      )}

      {/* ── D) Development Directions ── */}
      <div className="border-t border-slate-800/50">
        <button
          onClick={() => setDirectionsOpen(!directionsOpen)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors"
        >
          {directionsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <Zap className="w-3.5 h-3.5" />
          Development Directions ({DIRECTIONS.length})
        </button>
        <AnimatePresence>
          {directionsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {DIRECTIONS.map((dir, i) => (
                  <div key={i} className="rounded-lg bg-slate-800/30 border border-slate-700/20 p-3">
                    <h5 className="text-xs font-medium text-slate-200 mb-1">
                      <span className="text-cyan-400 mr-1.5">{i + 1}.</span>
                      {dir.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{dir.body}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    blue: 'text-blue-400',
  };
  const valueColor = accent ? colorMap[accent] || 'text-slate-200' : 'text-slate-200';

  return (
    <div className="bg-slate-800/40 rounded-lg px-3 py-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`text-sm font-medium ${valueColor}`}>{value}</div>
    </div>
  );
}
