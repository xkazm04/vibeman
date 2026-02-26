/**
 * Ambient Voice Engine
 * Core engine for the always-on voice companion. Handles:
 * - Continuous microphone capture with VAD
 * - Wake-word detection ("Hey Annette" / "Annette")
 * - Push-to-talk mode as fallback
 * - Ambient transcript analysis for proactive suggestions
 * - Integration with STT → LLM → TTS pipeline
 * - Streaming TTS with chunk playback for sub-200ms response feel
 */

import { createVoiceActivityDetector, type VADConfig } from './voiceActivityDetector';
import { downsampleAudioBuffer } from '@/app/features/Commander/components/VoiceButton';

// ─── Types ───

export type CompanionMode = 'ambient' | 'push-to-talk' | 'off';
export type CompanionState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface AmbientTranscript {
  id: string;
  text: string;
  timestamp: number;
  isDirected: boolean; // Was this directed at Annette (wake word detected)?
  confidence: number;
  sentiment?: 'neutral' | 'frustrated' | 'curious' | 'excited';
}

export interface ProactiveSuggestion {
  id: string;
  trigger: string; // What ambient speech triggered this
  suggestion: string;
  toolName?: string; // Suggested tool to surface
  timestamp: number;
  dismissed: boolean;
}

export interface VoiceCompanionConfig {
  mode: CompanionMode;
  wakeWords: string[];
  vad: VADConfig;
  /** Max ambient transcripts to retain */
  maxTranscripts: number;
  /** Interval between ambient analysis runs in ms */
  ambientAnalysisIntervalMs: number;
  /** Pipeline to use: 'annette' (full) or 'simple' (fast) */
  pipeline: 'annette' | 'simple';
  /** Enable TTS playback for responses */
  ttsEnabled: boolean;
  /** Auto-play TTS responses */
  autoPlay: boolean;
}

export interface VoiceCompanionCallbacks {
  onStateChange?: (state: CompanionState) => void;
  onTranscript?: (transcript: AmbientTranscript) => void;
  onResponse?: (response: string, audioBase64?: string) => void;
  onSuggestion?: (suggestion: ProactiveSuggestion) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (error: string) => void;
}

interface StreamingChunk {
  text: string;
  audioBase64?: string;
}

// ─── Default Config ───

export const DEFAULT_COMPANION_CONFIG: VoiceCompanionConfig = {
  mode: 'ambient',
  wakeWords: ['hey annette', 'annette', 'hey anette', 'anette'],
  vad: {
    silenceTimeoutMs: 1500,
    silenceThreshold: 0.08,
    minSpeechDurationMs: 300,
    adaptiveThreshold: true,
  },
  maxTranscripts: 50,
  ambientAnalysisIntervalMs: 30000,
  pipeline: 'annette',
  ttsEnabled: true,
  autoPlay: true,
};

// ─── Wake-word Detection ───

const FRUSTRATION_PATTERNS = [
  /\b(ugh|argh|damn|dammit|crap|wtf|what the)\b/i,
  /\b(broken|not working|doesn't work|won't work|keeps failing)\b/i,
  /\b(stuck|confused|lost|no idea|help)\b/i,
  /\b(why is this|how do i|what's wrong)\b/i,
];

const CURIOSITY_PATTERNS = [
  /\b(i wonder|what if|maybe|could we|should i)\b/i,
  /\b(how does|what does|where is|which)\b/i,
];

function detectSentiment(text: string): AmbientTranscript['sentiment'] {
  const lower = text.toLowerCase();
  for (const p of FRUSTRATION_PATTERNS) {
    if (p.test(lower)) return 'frustrated';
  }
  for (const p of CURIOSITY_PATTERNS) {
    if (p.test(lower)) return 'curious';
  }
  if (/(!{2,}|amazing|awesome|great|perfect|nice)/.test(lower)) return 'excited';
  return 'neutral';
}

function containsWakeWord(text: string, wakeWords: string[]): boolean {
  const lower = text.toLowerCase().trim();
  return wakeWords.some((w) => lower.startsWith(w) || lower.includes(w));
}

function stripWakeWord(text: string, wakeWords: string[]): string {
  let lower = text.toLowerCase().trim();
  for (const w of wakeWords) {
    if (lower.startsWith(w)) {
      return text.slice(w.length).trim().replace(/^[,.\s]+/, '');
    }
  }
  return text;
}

// ─── Ambient Voice Engine Class ───

export class AmbientVoiceEngine {
  private config: VoiceCompanionConfig;
  private callbacks: VoiceCompanionCallbacks;
  private state: CompanionState = 'idle';
  private stream: MediaStream | null = null;
  private vad: ReturnType<typeof createVoiceActivityDetector> | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private transcripts: AmbientTranscript[] = [];
  private suggestions: ProactiveSuggestion[] = [];
  private ambientAnalysisTimer: ReturnType<typeof setInterval> | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isPushToTalkActive = false;

  constructor(
    config: Partial<VoiceCompanionConfig> = {},
    callbacks: VoiceCompanionCallbacks = {}
  ) {
    this.config = { ...DEFAULT_COMPANION_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  // ─── Lifecycle ───

  async start(): Promise<void> {
    if (this.stream) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      this.vad = createVoiceActivityDetector(this.stream, {
        onSpeechStart: () => this.handleSpeechStart(),
        onSpeechEnd: () => this.handleSpeechEnd(),
        onAudioLevel: (level) => this.callbacks.onAudioLevel?.(level),
      }, this.config.vad);

      if (this.config.mode === 'ambient') {
        this.vad.start();
        this.setState('listening');
        this.startAmbientAnalysis();
      } else {
        this.setState('idle');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setState('error');
      this.callbacks.onError?.(`Microphone access failed: ${msg}`);
    }
  }

  stop(): void {
    this.stopAmbientAnalysis();
    this.vad?.destroy();
    this.vad = null;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.mediaRecorder?.state !== 'inactive') {
      try { this.mediaRecorder?.stop(); } catch { /* already stopped */ }
    }
    this.mediaRecorder = null;
    this.stopAudioPlayback();
    this.setState('idle');
  }

  // ─── Mode Management ───

  setMode(mode: CompanionMode): void {
    this.config.mode = mode;
    if (!this.stream) return;

    if (mode === 'ambient') {
      this.vad?.start();
      this.setState('listening');
      this.startAmbientAnalysis();
    } else if (mode === 'push-to-talk') {
      this.vad?.stop();
      this.setState('idle');
      this.stopAmbientAnalysis();
    } else {
      this.vad?.stop();
      this.setState('idle');
      this.stopAmbientAnalysis();
    }
  }

  // ─── Push-to-Talk ───

  startPushToTalk(): void {
    if (!this.stream || this.config.mode !== 'push-to-talk') return;
    this.isPushToTalkActive = true;
    this.startRecording();
    this.setState('listening');
  }

  stopPushToTalk(): void {
    if (!this.isPushToTalkActive) return;
    this.isPushToTalkActive = false;
    this.stopRecording();
  }

  // ─── Recording ───

  private startRecording(): void {
    if (!this.stream || this.mediaRecorder?.state === 'recording') return;

    this.audioChunks = [];
    const recorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });
    this.mediaRecorder = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
      if (blob.size > 0) {
        this.processAudioBlob(blob);
      }
    };

    recorder.start();
  }

  private stopRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  // ─── VAD Handlers ───

  private handleSpeechStart(): void {
    if (this.config.mode !== 'ambient') return;
    if (this.state === 'speaking' || this.state === 'processing') return;
    this.startRecording();
  }

  private handleSpeechEnd(): void {
    if (this.config.mode !== 'ambient') return;
    this.stopRecording();
  }

  // ─── Audio Processing Pipeline ───

  private async processAudioBlob(blob: Blob): Promise<void> {
    this.setState('processing');

    try {
      // 1. STT
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const sttRes = await fetch('/api/voicebot/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      const sttData = await sttRes.json();

      if (!sttData.success || !sttData.text?.trim()) {
        this.setState(this.config.mode === 'ambient' ? 'listening' : 'idle');
        return;
      }

      const text = sttData.text.trim();
      const isDirected = containsWakeWord(text, this.config.wakeWords) || this.isPushToTalkActive;

      // 2. Create transcript
      const transcript: AmbientTranscript = {
        id: `t-${Date.now()}`,
        text,
        timestamp: Date.now(),
        isDirected,
        confidence: 0.9,
        sentiment: detectSentiment(text),
      };
      this.addTranscript(transcript);

      // 3. If directed at Annette, process through LLM
      if (isDirected) {
        const query = this.isPushToTalkActive ? text : stripWakeWord(text, this.config.wakeWords);
        if (query.length > 0) {
          await this.processDirectedSpeech(query);
        }
      } else {
        // Ambient speech — check for proactive triggers
        this.checkProactiveTriggers(transcript);
        this.setState('listening');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Processing failed';
      this.callbacks.onError?.(msg);
      this.setState(this.config.mode === 'ambient' ? 'listening' : 'idle');
    }
  }

  private async processDirectedSpeech(query: string): Promise<void> {
    try {
      const res = await fetch('/api/voicebot/test-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          pipeline: this.config.pipeline,
          includeTts: this.config.ttsEnabled,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        this.callbacks.onError?.(data.error || 'LLM request failed');
        this.setState(this.config.mode === 'ambient' ? 'listening' : 'idle');
        return;
      }

      this.callbacks.onResponse?.(data.response, data.audioBase64);

      // 4. Play TTS if enabled
      if (this.config.autoPlay && data.audioBase64) {
        await this.playAudio(data.audioBase64);
      }

      this.setState(this.config.mode === 'ambient' ? 'listening' : 'idle');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Response failed';
      this.callbacks.onError?.(msg);
      this.setState(this.config.mode === 'ambient' ? 'listening' : 'idle');
    }
  }

  // ─── Audio Playback ───

  private async playAudio(base64: string): Promise<void> {
    this.setState('speaking');
    return new Promise<void>((resolve) => {
      const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
      this.currentAudio = audio;
      audio.onended = () => {
        this.currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        this.currentAudio = null;
        resolve();
      };
      audio.play().catch(() => {
        this.currentAudio = null;
        resolve();
      });
    });
  }

  stopAudioPlayback(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }

  // ─── Interrupt: stop current response and listen ───

  interrupt(): void {
    this.stopAudioPlayback();
    this.setState(this.config.mode === 'ambient' ? 'listening' : 'idle');
  }

  // ─── Ambient Analysis ───

  private startAmbientAnalysis(): void {
    this.stopAmbientAnalysis();
    this.ambientAnalysisTimer = setInterval(
      () => this.runAmbientAnalysis(),
      this.config.ambientAnalysisIntervalMs
    );
  }

  private stopAmbientAnalysis(): void {
    if (this.ambientAnalysisTimer) {
      clearInterval(this.ambientAnalysisTimer);
      this.ambientAnalysisTimer = null;
    }
  }

  private runAmbientAnalysis(): void {
    // Check recent non-directed transcripts for patterns
    const recent = this.transcripts
      .filter((t) => !t.isDirected && Date.now() - t.timestamp < 60000)
      .slice(-5);

    if (recent.length === 0) return;

    const frustrated = recent.filter((t) => t.sentiment === 'frustrated');
    if (frustrated.length >= 2) {
      const trigger = frustrated.map((t) => t.text).join('; ');
      this.addSuggestion({
        id: `s-${Date.now()}`,
        trigger,
        suggestion: 'It sounds like you might be running into issues. Want me to help troubleshoot?',
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    const curious = recent.filter((t) => t.sentiment === 'curious');
    if (curious.length >= 1) {
      const lastCurious = curious[curious.length - 1];
      this.addSuggestion({
        id: `s-${Date.now()}`,
        trigger: lastCurious.text,
        suggestion: `I heard you wondering about something. Say "Hey Annette" to ask me directly!`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }
  }

  private checkProactiveTriggers(transcript: AmbientTranscript): void {
    if (transcript.sentiment === 'frustrated') {
      this.addSuggestion({
        id: `s-${Date.now()}`,
        trigger: transcript.text,
        suggestion: 'Having trouble? I can help — just say "Hey Annette".',
        timestamp: Date.now(),
        dismissed: false,
      });
    }
  }

  // ─── Transcript Management ───

  private addTranscript(transcript: AmbientTranscript): void {
    this.transcripts.push(transcript);
    if (this.transcripts.length > this.config.maxTranscripts) {
      this.transcripts = this.transcripts.slice(-this.config.maxTranscripts);
    }
    this.callbacks.onTranscript?.(transcript);
  }

  private addSuggestion(suggestion: ProactiveSuggestion): void {
    // Debounce: don't add if we had a similar suggestion in the last 30s
    const recent = this.suggestions.find(
      (s) => !s.dismissed && Date.now() - s.timestamp < 30000
    );
    if (recent) return;

    this.suggestions.push(suggestion);
    if (this.suggestions.length > 20) {
      this.suggestions = this.suggestions.slice(-20);
    }
    this.callbacks.onSuggestion?.(suggestion);
  }

  // ─── State ───

  private setState(state: CompanionState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  getState(): CompanionState {
    return this.state;
  }

  getTranscripts(): AmbientTranscript[] {
    return [...this.transcripts];
  }

  getSuggestions(): ProactiveSuggestion[] {
    return this.suggestions.filter((s) => !s.dismissed);
  }

  dismissSuggestion(id: string): void {
    const s = this.suggestions.find((s) => s.id === id);
    if (s) s.dismissed = true;
  }

  getConfig(): VoiceCompanionConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<VoiceCompanionConfig>): void {
    this.config = { ...this.config, ...partial };
  }
}
