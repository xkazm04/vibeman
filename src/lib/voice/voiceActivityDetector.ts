/**
 * Voice Activity Detector (VAD)
 * Uses WebAudio API with AnalyserNode for real-time voice activity detection.
 * Supports adaptive threshold, energy-based speech detection, and configurable
 * silence timeouts for end-of-utterance detection.
 */

export interface VADConfig {
  /** FFT size for frequency analysis (default: 512) */
  fftSize?: number;
  /** Base silence threshold 0-1 (default: 0.08) */
  silenceThreshold?: number;
  /** Duration in ms below threshold to consider end of speech (default: 1500) */
  silenceTimeoutMs?: number;
  /** Minimum speech duration in ms to count as valid utterance (default: 300) */
  minSpeechDurationMs?: number;
  /** Smoothing time constant for analyser (default: 0.3) */
  smoothingTimeConstant?: number;
  /** Enable adaptive threshold based on ambient noise (default: true) */
  adaptiveThreshold?: boolean;
  /** How often to run the detection loop in ms (default: 50) */
  pollIntervalMs?: number;
}

export interface VADCallbacks {
  /** Fired when voice activity begins */
  onSpeechStart?: () => void;
  /** Fired when voice activity ends (silence timeout reached) */
  onSpeechEnd?: () => void;
  /** Fired each poll with current audio level 0-1 */
  onAudioLevel?: (level: number) => void;
  /** Fired when the ambient noise floor is recalibrated */
  onNoiseFloorUpdate?: (level: number) => void;
}

export interface VADState {
  isSpeaking: boolean;
  audioLevel: number;
  noiseFloor: number;
  effectiveThreshold: number;
}

const DEFAULT_CONFIG: Required<VADConfig> = {
  fftSize: 512,
  silenceThreshold: 0.08,
  silenceTimeoutMs: 1500,
  minSpeechDurationMs: 300,
  smoothingTimeConstant: 0.3,
  adaptiveThreshold: true,
  pollIntervalMs: 50,
};

/**
 * Creates a voice activity detector attached to a MediaStream.
 * Returns controls to start/stop and query state.
 */
export function createVoiceActivityDetector(
  stream: MediaStream,
  callbacks: VADCallbacks = {},
  userConfig: VADConfig = {}
) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = config.fftSize;
  analyser.smoothingTimeConstant = config.smoothingTimeConstant;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  let isSpeaking = false;
  let speechStartTime = 0;
  let lastSoundTime = Date.now();
  let noiseFloor = 0;
  let noiseFloorSamples = 0;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;

  function calculateRMS(): number {
    analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  function getEffectiveThreshold(): number {
    if (!config.adaptiveThreshold || noiseFloorSamples < 10) {
      return config.silenceThreshold;
    }
    // Threshold = noise floor + margin (at least the base threshold)
    return Math.max(config.silenceThreshold, noiseFloor * 2.5 + 0.02);
  }

  function updateNoiseFloor(level: number) {
    if (isSpeaking) return; // don't calibrate during speech
    noiseFloorSamples++;
    // Exponential moving average
    const alpha = Math.min(0.1, 1 / noiseFloorSamples);
    noiseFloor = noiseFloor * (1 - alpha) + level * alpha;
    if (noiseFloorSamples % 20 === 0) {
      callbacks.onNoiseFloorUpdate?.(noiseFloor);
    }
  }

  function poll() {
    if (destroyed) return;

    const level = calculateRMS();
    const threshold = getEffectiveThreshold();
    const now = Date.now();

    callbacks.onAudioLevel?.(level);

    if (level > threshold) {
      lastSoundTime = now;
      if (!isSpeaking) {
        speechStartTime = now;
        isSpeaking = true;
        callbacks.onSpeechStart?.();
      }
    } else {
      updateNoiseFloor(level);
      if (isSpeaking) {
        const silenceDuration = now - lastSoundTime;
        const speechDuration = now - speechStartTime;
        if (
          silenceDuration >= config.silenceTimeoutMs &&
          speechDuration >= config.minSpeechDurationMs
        ) {
          isSpeaking = false;
          callbacks.onSpeechEnd?.();
        }
      }
    }
  }

  function start() {
    if (pollTimer || destroyed) return;
    pollTimer = setInterval(poll, config.pollIntervalMs);
  }

  function stop() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function destroy() {
    destroyed = true;
    stop();
    source.disconnect();
    if (audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }
  }

  function getState(): VADState {
    return {
      isSpeaking,
      audioLevel: calculateRMS(),
      noiseFloor,
      effectiveThreshold: getEffectiveThreshold(),
    };
  }

  return { start, stop, destroy, getState, analyser, audioContext };
}
