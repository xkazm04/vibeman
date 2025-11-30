/**
 * Audio Error Types and Recovery Guidance
 * Provides typed error codes for Web Audio API failures with developer-friendly recovery messages
 */

/**
 * Typed audio error codes for specific Web Audio API failure scenarios
 */
export type AudioErrorCode =
  | 'AUDIO_CONTEXT_SUSPENDED'
  | 'AUDIO_CONTEXT_CLOSED'
  | 'AUDIO_CONTEXT_CREATION_FAILED'
  | 'MICROPHONE_DENIED'
  | 'MICROPHONE_NOT_FOUND'
  | 'MICROPHONE_IN_USE'
  | 'DEVICE_NOT_SUPPORTED'
  | 'PLAYBACK_FAILED'
  | 'AUTOPLAY_BLOCKED'
  | 'MEDIA_DECODE_ERROR'
  | 'NETWORK_ERROR'
  | 'TTS_API_ERROR'
  | 'ANALYSER_NODE_ERROR'
  | 'UNKNOWN_AUDIO_ERROR';

/**
 * Structured audio error with recovery guidance
 */
export interface AudioError {
  /** Typed error code for programmatic handling */
  code: AudioErrorCode;
  /** Human-readable error message */
  message: string;
  /** Developer-focused recovery guidance */
  recovery: string;
  /** Optional original error for debugging */
  originalError?: Error | unknown;
  /** Severity level for error handling */
  severity: 'warning' | 'error' | 'critical';
  /** Whether the error is recoverable */
  recoverable: boolean;
}

/**
 * Recovery guidance for each error code
 * Maps error codes to actionable developer messages
 */
export const AUDIO_ERROR_RECOVERY: Record<AudioErrorCode, { message: string; recovery: string; severity: AudioError['severity']; recoverable: boolean }> = {
  AUDIO_CONTEXT_SUSPENDED: {
    message: 'Audio context is suspended',
    recovery: 'Call audioContext.resume() after user interaction. Browser requires user gesture before playing audio.',
    severity: 'warning',
    recoverable: true,
  },
  AUDIO_CONTEXT_CLOSED: {
    message: 'Audio context has been closed',
    recovery: 'Create a new AudioContext instance. Once closed, an AudioContext cannot be reopened.',
    severity: 'error',
    recoverable: true,
  },
  AUDIO_CONTEXT_CREATION_FAILED: {
    message: 'Failed to create audio context',
    recovery: 'Check browser support for Web Audio API. Ensure AudioContext or webkitAudioContext is available.',
    severity: 'critical',
    recoverable: false,
  },
  MICROPHONE_DENIED: {
    message: 'Microphone access denied by user',
    recovery: 'User denied microphone permission. Prompt user to enable microphone access in browser settings.',
    severity: 'error',
    recoverable: true,
  },
  MICROPHONE_NOT_FOUND: {
    message: 'No microphone device found',
    recovery: 'No audio input device detected. Check that a microphone is connected and enabled in system settings.',
    severity: 'error',
    recoverable: true,
  },
  MICROPHONE_IN_USE: {
    message: 'Microphone is in use by another application',
    recovery: 'The microphone is being used by another application. Close other apps using the microphone and retry.',
    severity: 'warning',
    recoverable: true,
  },
  DEVICE_NOT_SUPPORTED: {
    message: 'Audio device not supported',
    recovery: 'The current browser or device does not support required audio features. Try a different browser (Chrome, Firefox, Safari).',
    severity: 'critical',
    recoverable: false,
  },
  PLAYBACK_FAILED: {
    message: 'Audio playback failed',
    recovery: 'Audio element failed to play. Check audio source URL, ensure CORS headers are correct, and verify audio format is supported.',
    severity: 'error',
    recoverable: true,
  },
  AUTOPLAY_BLOCKED: {
    message: 'Autoplay blocked by browser policy',
    recovery: 'Browser blocked audio autoplay. Trigger playback from a user click/touch event. Voice activation button should handle this.',
    severity: 'warning',
    recoverable: true,
  },
  MEDIA_DECODE_ERROR: {
    message: 'Failed to decode audio media',
    recovery: 'Audio file format not supported or file is corrupted. Verify the TTS API returns valid audio (mp3/wav/ogg).',
    severity: 'error',
    recoverable: true,
  },
  NETWORK_ERROR: {
    message: 'Network error during audio operation',
    recovery: 'Failed to load audio resource. Check network connection and verify the audio URL is accessible.',
    severity: 'error',
    recoverable: true,
  },
  TTS_API_ERROR: {
    message: 'Text-to-speech API error',
    recovery: 'TTS service failed. Check API key configuration, rate limits, and network connectivity.',
    severity: 'error',
    recoverable: true,
  },
  ANALYSER_NODE_ERROR: {
    message: 'Audio analyser node error',
    recovery: 'Failed to create or use AnalyserNode. Ensure audio context is running and source node is connected properly.',
    severity: 'warning',
    recoverable: true,
  },
  UNKNOWN_AUDIO_ERROR: {
    message: 'Unknown audio error',
    recovery: 'An unexpected audio error occurred. Check the browser console for more details. Try refreshing the page.',
    severity: 'error',
    recoverable: true,
  },
};

/**
 * Create a structured AudioError from an error code
 */
export function createAudioError(code: AudioErrorCode, originalError?: Error | unknown): AudioError {
  const config = AUDIO_ERROR_RECOVERY[code];
  return {
    code,
    message: config.message,
    recovery: config.recovery,
    originalError,
    severity: config.severity,
    recoverable: config.recoverable,
  };
}

/**
 * Detect error code from a raw error
 */
export function detectAudioErrorCode(error: Error | unknown): AudioErrorCode {
  if (error instanceof Error) {
    const name = error.name;
    const message = error.message.toLowerCase();

    // NotAllowedError - user denied or autoplay blocked
    if (name === 'NotAllowedError') {
      if (message.includes('autoplay') || message.includes('play()')) {
        return 'AUTOPLAY_BLOCKED';
      }
      return 'MICROPHONE_DENIED';
    }

    // NotFoundError - no device found
    if (name === 'NotFoundError') {
      return 'MICROPHONE_NOT_FOUND';
    }

    // NotReadableError - device in use
    if (name === 'NotReadableError' || name === 'AbortError') {
      return 'MICROPHONE_IN_USE';
    }

    // NotSupportedError - device/feature not supported
    if (name === 'NotSupportedError') {
      return 'DEVICE_NOT_SUPPORTED';
    }

    // MediaError for decode issues
    if (name === 'MediaError' || message.includes('decode')) {
      return 'MEDIA_DECODE_ERROR';
    }

    // Network errors
    if (name === 'TypeError' && message.includes('network')) {
      return 'NETWORK_ERROR';
    }

    // Audio context state errors
    if (message.includes('suspended')) {
      return 'AUDIO_CONTEXT_SUSPENDED';
    }
    if (message.includes('closed')) {
      return 'AUDIO_CONTEXT_CLOSED';
    }

    // Playback errors
    if (message.includes('play') || message.includes('playback')) {
      return 'PLAYBACK_FAILED';
    }
  }

  return 'UNKNOWN_AUDIO_ERROR';
}

/**
 * Parse and structure an error into AudioError format
 */
export function parseAudioError(error: Error | unknown): AudioError {
  const code = detectAudioErrorCode(error);
  return createAudioError(code, error);
}

/**
 * Log audio error to console with structured formatting
 */
export function logAudioError(audioError: AudioError): void {
  const prefix = `[Annette Audio ${audioError.severity.toUpperCase()}]`;
  const style = audioError.severity === 'critical'
    ? 'color: #ef4444; font-weight: bold;'
    : audioError.severity === 'error'
      ? 'color: #f97316; font-weight: bold;'
      : 'color: #eab308;';

  console.groupCollapsed(`%c${prefix} ${audioError.code}`, style);
  console.log('Message:', audioError.message);
  console.log('Recovery:', audioError.recovery);
  console.log('Recoverable:', audioError.recoverable);
  if (audioError.originalError) {
    console.log('Original Error:', audioError.originalError);
  }
  console.groupEnd();
}

/**
 * Get user-friendly message for display in UI
 */
export function getUserFriendlyMessage(code: AudioErrorCode): string {
  switch (code) {
    case 'AUDIO_CONTEXT_SUSPENDED':
      return 'Click to activate audio';
    case 'MICROPHONE_DENIED':
      return 'Microphone access required';
    case 'MICROPHONE_NOT_FOUND':
      return 'No microphone detected';
    case 'AUTOPLAY_BLOCKED':
      return 'Click to enable voice';
    case 'NETWORK_ERROR':
      return 'Connection error';
    case 'TTS_API_ERROR':
      return 'Voice service unavailable';
    case 'PLAYBACK_FAILED':
      return 'Audio playback error';
    default:
      return 'Audio system error';
  }
}

/**
 * Attempt automatic recovery for recoverable errors
 */
export async function attemptRecovery(
  audioError: AudioError,
  audioContext: AudioContext | null
): Promise<boolean> {
  if (!audioError.recoverable) {
    return false;
  }

  switch (audioError.code) {
    case 'AUDIO_CONTEXT_SUSPENDED':
      if (audioContext && audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          console.log('[Annette Audio] Successfully resumed audio context');
          return true;
        } catch {
          return false;
        }
      }
      break;

    case 'AUDIO_CONTEXT_CLOSED':
      // Cannot recover closed context - caller must create new one
      return false;

    case 'AUTOPLAY_BLOCKED':
      // Needs user interaction - cannot auto-recover
      return false;

    default:
      // Most errors require user action or cannot be auto-recovered
      return false;
  }

  return false;
}
