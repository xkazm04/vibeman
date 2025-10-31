/**
 * Voicebot Utility Functions
 * Pure helper functions for voicebot operations
 */

import { SessionLog, AudioConfig, AudioProcessingConfig } from './voicebotTypes';

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
    console.error('Failed to play audio:', error);
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
    console.error('Failed to access microphone:', error);
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
