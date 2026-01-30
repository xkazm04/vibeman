/**
 * Voicebot Utility Functions
 * Pure helper functions for voicebot operations
 */

import { SessionLog, AudioConfig, AudioProcessingConfig, ConversationMessage, LLMProvider } from './voicebotTypes';

/**
 * Default audio configuration for media stream
 */
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};

/**
 * Default audio processing configuration
 */
export const DEFAULT_PROCESSING_CONFIG: AudioProcessingConfig = {
  silenceThreshold: 0.1,  // 10% threshold for smart silence detection
  silenceDuration: 3000,  // 3 seconds below threshold
  fftSize: 512
};

/**
 * Create a new session log entry
 */
export function createLog(
  type: 'user' | 'assistant' | 'system',
  message: string,
  audioUrl?: string,
  timing?: {
    llmMs?: number;
    ttsMs?: number;
    totalMs?: number;
  },
  toolsUsed?: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>
): SessionLog {
  return {
    id: `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toLocaleTimeString(),
    type,
    message,
    audioUrl,
    timing,
    toolsUsed
  };
}

/**
 * Calculate RMS (Root Mean Square) audio level
 */
export function calculateAudioLevel(dataArray: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / dataArray.length);
  return rms / 255; // Normalize to 0-1
}

/**
 * Check if audio level indicates silence
 */
export function isSilent(
  audioLevel: number,
  threshold: number = DEFAULT_PROCESSING_CONFIG.silenceThreshold
): boolean {
  return audioLevel <= threshold;
}

/**
 * Check if silence duration threshold is exceeded
 */
export function isSilenceDurationExceeded(
  lastSoundTime: number,
  currentTime: number,
  duration: number = DEFAULT_PROCESSING_CONFIG.silenceDuration
): boolean {
  return currentTime - lastSoundTime > duration;
}

/**
 * Convert Blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Play audio from URL
 */
export async function playAudio(audioUrl: string): Promise<void> {
  try {
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    // Audio playback failed - error will be handled by caller
    throw error;
  }
}

/**
 * Get user media stream with error handling
 */
export async function getUserMediaStream(
  config: AudioConfig = DEFAULT_AUDIO_CONFIG
): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: config });
  } catch (error) {
    // Microphone access failed - provide user-friendly error message
    throw new Error('Microphone access denied or unavailable');
  }
}

/**
 * Create audio context with browser compatibility
 */
export function createAudioContext(): AudioContext {
  const AudioContextClass = window.AudioContext ||
    (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AudioContextClass();
}

/**
 * Format session state for display
 */
export function formatSessionState(state: string): string {
  return state.toUpperCase();
}

/**
 * Check if WebSocket is ready
 */
export function isWebSocketReady(ws: WebSocket | null): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

/**
 * Create WebSocket connection with proper URL
 */
export function createWebSocketConnection(endpoint: string): WebSocket {
  // Handle both HTTP and HTTPS, convert to WS/WSS accordingly
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;

  // If endpoint is absolute, use it; otherwise construct from current location
  const wsUrl = endpoint.startsWith('ws')
    ? endpoint
    : `${protocol}//${host}${endpoint}`;

  return new WebSocket(wsUrl);
}

/**
 * Stop all media stream tracks
 */
export function stopMediaStream(stream: MediaStream): void {
  stream.getTracks().forEach(track => track.stop());
}

/**
 * Clean up audio context
 */
export async function cleanupAudioContext(context: AudioContext | null): Promise<void> {
  if (context && context.state !== 'closed') {
    await context.close();
  }
}

/**
 * Resume audio context if suspended
 */
export async function resumeAudioContext(context: AudioContext): Promise<void> {
  if (context.state === 'suspended') {
    await context.resume();
  }
}

/**
 * Process text message result interface
 */
export interface ProcessTextMessageResult {
  assistantText: string;
  audioUrl?: string;
  timing: {
    llmMs: number;
    ttsMs: number;
    totalMs: number;
  };
}

/**
 * Process a text message through the LLM and TTS pipeline
 *
 * @param text - The user's input text
 * @param conversationHistory - Previous conversation messages for context
 * @param provider - The LLM provider to use
 * @param model - The specific model to use
 * @returns The assistant's response with audio and timing
 */
export async function processTextMessage(
  text: string,
  conversationHistory: ConversationMessage[],
  provider: LLMProvider,
  model: string
): Promise<ProcessTextMessageResult> {
  const startTime = performance.now();

  // Call LLM API
  const llmStartTime = performance.now();
  let assistantText = '';

  try {
    const llmResponse = await fetch('/api/voicebot/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        conversationHistory,
        provider,
        model,
      }),
    });

    if (!llmResponse.ok) {
      throw new Error(`LLM API error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    assistantText = llmData.response || 'I apologize, I could not generate a response.';
  } catch (error) {
    console.error('LLM processing error:', error);
    assistantText = 'I encountered an error processing your request.';
  }

  const llmEndTime = performance.now();
  const llmMs = Math.round(llmEndTime - llmStartTime);

  // Call TTS API to generate audio
  const ttsStartTime = performance.now();
  let audioUrl: string | undefined;

  try {
    const ttsResponse = await fetch('/api/voicebot/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: assistantText }),
    });

    if (ttsResponse.ok) {
      const ttsData = await ttsResponse.json();
      audioUrl = ttsData.audioUrl;
    }
  } catch (error) {
    console.error('TTS processing error:', error);
    // Audio is optional, continue without it
  }

  const ttsEndTime = performance.now();
  const ttsMs = Math.round(ttsEndTime - ttsStartTime);

  const endTime = performance.now();
  const totalMs = Math.round(endTime - startTime);

  return {
    assistantText,
    audioUrl,
    timing: {
      llmMs,
      ttsMs,
      totalMs,
    },
  };
}

/**
 * Process voice message result interface
 */
export interface ProcessVoiceMessageResult {
  userText: string;
  assistantText: string;
  audioUrl?: string;
  timing: {
    sttMs: number;
    llmMs: number;
    ttsMs: number;
    totalMs: number;
  };
}

/**
 * Process a voice message through the STT, LLM, and TTS pipeline
 *
 * @param audioBlob - The user's voice input as a Blob
 * @param conversationHistory - Previous conversation messages for context
 * @param provider - The LLM provider to use
 * @param model - The specific model to use
 * @returns The assistant's response with transcription, audio and timing
 */
export async function processVoiceMessage(
  audioBlob: Blob,
  conversationHistory: ConversationMessage[],
  provider: LLMProvider,
  model: string
): Promise<ProcessVoiceMessageResult> {
  const startTime = performance.now();

  // Call STT API to transcribe audio
  const sttStartTime = performance.now();
  let userText = '';

  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');

    const sttResponse = await fetch('/api/voicebot/stt', {
      method: 'POST',
      body: formData,
    });

    if (!sttResponse.ok) {
      throw new Error(`STT API error: ${sttResponse.status}`);
    }

    const sttData = await sttResponse.json();
    userText = sttData.text || '';
  } catch (error) {
    console.error('STT processing error:', error);
    throw new Error('Failed to transcribe audio');
  }

  const sttEndTime = performance.now();
  const sttMs = Math.round(sttEndTime - sttStartTime);

  if (!userText.trim()) {
    throw new Error('No speech detected in audio');
  }

  // Process the transcribed text through LLM and TTS
  const textResult = await processTextMessage(userText, conversationHistory, provider, model);

  const endTime = performance.now();
  const totalMs = Math.round(endTime - startTime);

  return {
    userText,
    assistantText: textResult.assistantText,
    audioUrl: textResult.audioUrl,
    timing: {
      sttMs,
      llmMs: textResult.timing.llmMs,
      ttsMs: textResult.timing.ttsMs,
      totalMs,
    },
  };
}
