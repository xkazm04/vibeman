/**
 * Audio Hook & Cache Testing Utilities
 *
 * Pre-built mocks for useAnnetteAudio, ttsCache, and Web Audio API contexts.
 * Provides standardized test utilities that eliminate the need for developers
 * to understand Web Audio API internals when writing tests for Annette components.
 */

import type { AudioError, AudioErrorCode } from '../lib/audioErrors';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration options for MockAudioContext
 */
export interface MockAudioContextOptions {
  /** Initial state of the AudioContext */
  initialState?: 'running' | 'suspended' | 'closed';
  /** Sample rate to simulate */
  sampleRate?: number;
  /** FFT size for analyser node */
  fftSize?: number;
  /** Whether to simulate errors on resume() */
  simulateResumeError?: boolean;
  /** Whether to simulate errors on close() */
  simulateCloseError?: boolean;
}

/**
 * Configuration options for MockAnalyserNode
 */
export interface MockAnalyserNodeOptions {
  /** FFT size (default: 256) */
  fftSize?: number;
  /** Min decibels for display (default: -100) */
  minDecibels?: number;
  /** Max decibels for display (default: -30) */
  maxDecibels?: number;
  /** Smoothing time constant (default: 0.8) */
  smoothingTimeConstant?: number;
  /** Pattern for generated frequency data: 'sine', 'random', 'silent', 'constant' */
  frequencyPattern?: 'sine' | 'random' | 'silent' | 'constant';
  /** Constant value when pattern is 'constant' (0-255) */
  constantValue?: number;
}

/**
 * Configuration options for TTS cache mock
 */
export interface MockTTSCacheOptions {
  /** Pre-populate cache with these entries */
  initialEntries?: Map<string, Blob>;
  /** Simulate cache miss for all reads */
  alwaysMiss?: boolean;
  /** Simulate errors on cache operations */
  simulateErrors?: boolean;
  /** Maximum entries before eviction starts */
  maxEntries?: number;
}

/**
 * Configuration options for useAnnetteAudio mock
 */
export interface MockUseAnnetteAudioOptions {
  /** Initial speaking state */
  isSpeaking?: boolean;
  /** Initial error state */
  isError?: boolean;
  /** Initial audio error */
  audioError?: AudioError | null;
  /** Initial volume (0-1) */
  volume?: number;
  /** Initial voice enabled state */
  isVoiceEnabled?: boolean;
  /** Initial message */
  message?: string;
  /** Simulate TTS API failure */
  simulateTTSFailure?: boolean;
  /** Simulate playback failure */
  simulatePlaybackFailure?: boolean;
  /** Custom error code for simulated failures */
  failureErrorCode?: AudioErrorCode;
}

/**
 * Options for setupAudioTest helper
 */
export interface SetupAudioTestOptions {
  /** Options for MockAudioContext */
  audioContext?: MockAudioContextOptions;
  /** Options for MockAnalyserNode */
  analyser?: MockAnalyserNodeOptions;
  /** Options for TTS cache mock */
  ttsCache?: MockTTSCacheOptions;
  /** Options for useAnnetteAudio mock */
  useAnnetteAudio?: MockUseAnnetteAudioOptions;
  /** Auto-cleanup on test end (set to false for manual cleanup) */
  autoCleanup?: boolean;
}

/**
 * Return type from setupAudioTest
 */
export interface AudioTestContext {
  /** Mock AudioContext instance */
  audioContext: MockAudioContext;
  /** Mock AnalyserNode instance */
  analyser: MockAnalyserNode;
  /** Mock TTS cache functions */
  ttsCache: MockTTSCache;
  /** Mock useAnnetteAudio return value */
  useAnnetteAudioMock: MockUseAnnetteAudioReturn;
  /** Cleanup function to restore all mocks */
  cleanup: () => void;
  /** Simulate a cache hit with given blob */
  simulateCacheHit: (text: string, blob: Blob) => void;
  /** Simulate a cache miss */
  simulateCacheMiss: () => void;
  /** Simulate TTS API failure */
  simulateTTSFailure: (errorCode?: AudioErrorCode) => void;
  /** Simulate successful playback completion */
  simulatePlaybackComplete: () => void;
  /** Generate test audio blob */
  createTestAudioBlob: (durationMs?: number) => Blob;
}

// ============================================================================
// MockAudioContext
// ============================================================================

/**
 * Mock implementation of Web Audio API AudioContext
 * Simulates frequency data generation and audio context lifecycle
 */
export class MockAudioContext {
  public state: 'running' | 'suspended' | 'closed';
  public sampleRate: number;
  public currentTime: number = 0;
  public baseLatency: number = 0.005;

  private _options: MockAudioContextOptions;
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _stateChangeListeners: Array<() => void> = [];

  constructor(options: MockAudioContextOptions = {}) {
    this._options = options;
    this.state = options.initialState ?? 'running';
    this.sampleRate = options.sampleRate ?? 44100;

    // Simulate time progression
    this._startTimeSimulation();
  }

  private _startTimeSimulation(): void {
    if (this.state === 'running' && !this._intervalId) {
      this._intervalId = setInterval(() => {
        this.currentTime += 0.01;
      }, 10);
    }
  }

  private _stopTimeSimulation(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /**
   * Resume suspended audio context
   */
  async resume(): Promise<void> {
    if (this._options.simulateResumeError) {
      throw new Error('Failed to resume AudioContext');
    }

    if (this.state === 'closed') {
      throw new DOMException('Cannot resume a closed AudioContext', 'InvalidStateError');
    }

    this.state = 'running';
    this._startTimeSimulation();
    this._notifyStateChange();
  }

  /**
   * Suspend audio context
   */
  async suspend(): Promise<void> {
    if (this.state === 'closed') {
      throw new DOMException('Cannot suspend a closed AudioContext', 'InvalidStateError');
    }

    this.state = 'suspended';
    this._stopTimeSimulation();
    this._notifyStateChange();
  }

  /**
   * Close audio context
   */
  async close(): Promise<void> {
    if (this._options.simulateCloseError) {
      throw new Error('Failed to close AudioContext');
    }

    this.state = 'closed';
    this._stopTimeSimulation();
    this._notifyStateChange();
  }

  /**
   * Create an analyser node
   */
  createAnalyser(): MockAnalyserNode {
    return new MockAnalyserNode({ fftSize: this._options.fftSize });
  }

  /**
   * Create a media element source
   */
  createMediaElementSource(_mediaElement: HTMLAudioElement): MockMediaElementAudioSourceNode {
    return new MockMediaElementAudioSourceNode(this);
  }

  /**
   * Create a gain node
   */
  createGain(): MockGainNode {
    return new MockGainNode(this);
  }

  /**
   * Create an oscillator node
   */
  createOscillator(): MockOscillatorNode {
    return new MockOscillatorNode(this);
  }

  /**
   * Get the destination node
   */
  get destination(): MockAudioDestinationNode {
    return new MockAudioDestinationNode();
  }

  /**
   * Add state change listener
   */
  addEventListener(type: string, listener: () => void): void {
    if (type === 'statechange') {
      this._stateChangeListeners.push(listener);
    }
  }

  /**
   * Remove state change listener
   */
  removeEventListener(type: string, listener: () => void): void {
    if (type === 'statechange') {
      this._stateChangeListeners = this._stateChangeListeners.filter(l => l !== listener);
    }
  }

  private _notifyStateChange(): void {
    this._stateChangeListeners.forEach(listener => listener());
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this._stopTimeSimulation();
    this._stateChangeListeners = [];
  }
}

// ============================================================================
// MockAnalyserNode
// ============================================================================

/**
 * Mock implementation of Web Audio API AnalyserNode
 * Generates simulated frequency data for visualization testing
 */
export class MockAnalyserNode {
  public fftSize: number;
  public frequencyBinCount: number;
  public minDecibels: number;
  public maxDecibels: number;
  public smoothingTimeConstant: number;

  private _options: MockAnalyserNodeOptions;
  private _frameCount: number = 0;
  private _connectedNodes: MockAudioNode[] = [];

  constructor(options: MockAnalyserNodeOptions = {}) {
    this._options = options;
    this.fftSize = options.fftSize ?? 256;
    this.frequencyBinCount = this.fftSize / 2;
    this.minDecibels = options.minDecibels ?? -100;
    this.maxDecibels = options.maxDecibels ?? -30;
    this.smoothingTimeConstant = options.smoothingTimeConstant ?? 0.8;
  }

  /**
   * Get frequency data (simulated)
   */
  getByteFrequencyData(dataArray: Uint8Array): void {
    const pattern = this._options.frequencyPattern ?? 'sine';
    this._frameCount++;

    for (let i = 0; i < dataArray.length && i < this.frequencyBinCount; i++) {
      switch (pattern) {
        case 'sine':
          // Simulate voice-like frequency distribution
          const phase = (this._frameCount * 0.1) + (i * 0.2);
          const base = Math.sin(phase) * 0.5 + 0.5;
          const frequencyFalloff = 1 - (i / this.frequencyBinCount) * 0.7;
          dataArray[i] = Math.floor(base * frequencyFalloff * 200 + 20);
          break;

        case 'random':
          dataArray[i] = Math.floor(Math.random() * 256);
          break;

        case 'silent':
          dataArray[i] = 0;
          break;

        case 'constant':
          dataArray[i] = this._options.constantValue ?? 128;
          break;
      }
    }
  }

  /**
   * Get time domain data (simulated)
   */
  getByteTimeDomainData(dataArray: Uint8Array): void {
    for (let i = 0; i < dataArray.length && i < this.fftSize; i++) {
      // Center line with some variation
      dataArray[i] = 128 + Math.floor(Math.sin(this._frameCount * 0.1 + i * 0.1) * 30);
    }
    this._frameCount++;
  }

  /**
   * Get float frequency data
   */
  getFloatFrequencyData(dataArray: Float32Array): void {
    const uint8Data = new Uint8Array(dataArray.length);
    this.getByteFrequencyData(uint8Data);

    for (let i = 0; i < dataArray.length; i++) {
      // Convert to decibels range
      const normalized = uint8Data[i] / 255;
      dataArray[i] = this.minDecibels + normalized * (this.maxDecibels - this.minDecibels);
    }
  }

  /**
   * Connect to another node
   */
  connect(destination: MockAudioNode): MockAudioNode {
    this._connectedNodes.push(destination);
    return destination;
  }

  /**
   * Disconnect from nodes
   */
  disconnect(): void {
    this._connectedNodes = [];
  }

  /**
   * Reset frame counter (useful for deterministic tests)
   */
  resetFrameCount(): void {
    this._frameCount = 0;
  }
}

// ============================================================================
// Supporting Mock Audio Nodes
// ============================================================================

/**
 * Base mock audio node
 */
export class MockAudioNode {
  protected _connectedNodes: MockAudioNode[] = [];

  connect(destination: MockAudioNode): MockAudioNode {
    this._connectedNodes.push(destination);
    return destination;
  }

  disconnect(): void {
    this._connectedNodes = [];
  }
}

/**
 * Mock MediaElementAudioSourceNode
 */
export class MockMediaElementAudioSourceNode extends MockAudioNode {
  public context: MockAudioContext;

  constructor(context: MockAudioContext) {
    super();
    this.context = context;
  }
}

/**
 * Mock GainNode
 */
export class MockGainNode extends MockAudioNode {
  public context: MockAudioContext;
  public gain: { value: number; setValueAtTime: (value: number, time: number) => void };

  constructor(context: MockAudioContext) {
    super();
    this.context = context;
    this.gain = {
      value: 1,
      setValueAtTime: (value: number, _time: number) => {
        this.gain.value = value;
      }
    };
  }
}

/**
 * Mock OscillatorNode
 */
export class MockOscillatorNode extends MockAudioNode {
  public context: MockAudioContext;
  public frequency: { value: number; setValueAtTime: (value: number, time: number) => void };
  public type: OscillatorType = 'sine';

  constructor(context: MockAudioContext) {
    super();
    this.context = context;
    this.frequency = {
      value: 440,
      setValueAtTime: (value: number, _time: number) => {
        this.frequency.value = value;
      }
    };
  }

  start(_when?: number): void {
    // No-op
  }

  stop(_when?: number): void {
    // No-op
  }
}

/**
 * Mock AudioDestinationNode
 */
export class MockAudioDestinationNode extends MockAudioNode {
  public maxChannelCount: number = 2;
  public numberOfInputs: number = 1;
  public numberOfOutputs: number = 0;
}

// ============================================================================
// MockTTSCache
// ============================================================================

/**
 * Mock TTS cache for testing cache hit/miss scenarios
 */
export class MockTTSCache {
  private _cache: Map<string, { blob: Blob; timestamp: number; accessCount: number }>;
  private _options: MockTTSCacheOptions;

  // Tracking for test assertions
  public getCalls: string[] = [];
  public setCalls: Array<{ text: string; size: number }> = [];
  public clearCalls: number = 0;
  public deleteCalls: string[] = [];

  constructor(options: MockTTSCacheOptions = {}) {
    this._options = options;
    this._cache = new Map();

    // Pre-populate if initial entries provided
    if (options.initialEntries) {
      options.initialEntries.forEach((blob, text) => {
        this._cache.set(this._normalizeKey(text), {
          blob,
          timestamp: Date.now(),
          accessCount: 0
        });
      });
    }
  }

  private _normalizeKey(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Get cached audio (mock implementation of getCachedAudio)
   */
  async getCachedAudio(text: string): Promise<Blob | null> {
    this.getCalls.push(text);

    if (this._options.simulateErrors) {
      throw new Error('Mock cache read error');
    }

    if (this._options.alwaysMiss) {
      return null;
    }

    const key = this._normalizeKey(text);
    const entry = this._cache.get(key);

    if (entry) {
      entry.accessCount++;
      return entry.blob;
    }

    return null;
  }

  /**
   * Set cached audio (mock implementation of setCachedAudio)
   */
  async setCachedAudio(text: string, audioBlob: Blob): Promise<void> {
    this.setCalls.push({ text, size: audioBlob.size });

    if (this._options.simulateErrors) {
      throw new Error('Mock cache write error');
    }

    const key = this._normalizeKey(text);

    // Evict if at max entries
    if (this._options.maxEntries && this._cache.size >= this._options.maxEntries) {
      const oldestKey = Array.from(this._cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
      if (oldestKey) {
        this._cache.delete(oldestKey);
      }
    }

    this._cache.set(key, {
      blob: audioBlob,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  /**
   * Get cache statistics (mock implementation of getCacheStats)
   */
  async getCacheStats(): Promise<{
    entryCount: number;
    totalSizeMB: number;
    oldestEntry: number | null;
    mostAccessed: number;
  }> {
    if (this._options.simulateErrors) {
      throw new Error('Mock cache stats error');
    }

    const entries = Array.from(this._cache.values());

    if (entries.length === 0) {
      return { entryCount: 0, totalSizeMB: 0, oldestEntry: null, mostAccessed: 0 };
    }

    const totalSize = entries.reduce((sum, e) => sum + e.blob.size, 0);
    const oldestTimestamp = Math.min(...entries.map(e => e.timestamp));
    const maxAccessCount = Math.max(...entries.map(e => e.accessCount));

    return {
      entryCount: entries.length,
      totalSizeMB: totalSize / (1024 * 1024),
      oldestEntry: oldestTimestamp,
      mostAccessed: maxAccessCount
    };
  }

  /**
   * Clear all cached audio (mock implementation of clearCache)
   */
  async clearCache(): Promise<void> {
    this.clearCalls++;

    if (this._options.simulateErrors) {
      throw new Error('Mock cache clear error');
    }

    this._cache.clear();
  }

  /**
   * Delete specific cached entry (mock implementation of deleteCachedAudio)
   */
  async deleteCachedAudio(text: string): Promise<void> {
    this.deleteCalls.push(text);

    if (this._options.simulateErrors) {
      throw new Error('Mock cache delete error');
    }

    const key = this._normalizeKey(text);
    this._cache.delete(key);
  }

  /**
   * Manually add entry for testing cache hits
   */
  addEntry(text: string, blob: Blob): void {
    const key = this._normalizeKey(text);
    this._cache.set(key, {
      blob,
      timestamp: Date.now(),
      accessCount: 0
    });
  }

  /**
   * Check if entry exists
   */
  hasEntry(text: string): boolean {
    return this._cache.has(this._normalizeKey(text));
  }

  /**
   * Reset all tracking arrays
   */
  resetTracking(): void {
    this.getCalls = [];
    this.setCalls = [];
    this.clearCalls = 0;
    this.deleteCalls = [];
  }
}

// ============================================================================
// MockUseAnnetteAudio
// ============================================================================

/**
 * Mock return type for useAnnetteAudio hook
 */
export interface MockUseAnnetteAudioReturn {
  isSpeaking: boolean;
  isError: boolean;
  audioError: AudioError | null;
  volume: number;
  audioContext: MockAudioContext | null;
  analyser: MockAnalyserNode | null;
  isVoiceEnabled: boolean;
  message: string;
  // Setter functions
  setIsVoiceEnabled: (enabled: boolean) => void;
  setMessage: (message: string) => void;
  setIsError: (error: boolean) => void;
  // Action functions
  playAudioInternal: (text: string) => Promise<void>;
  speakMessage: (text: string) => Promise<void>;
  handleAudioError: (error: Error | unknown) => AudioError;
  clearAudioError: () => void;
  tryRecovery: () => Promise<boolean>;
  // Test helpers (only on mock)
  _setIsSpeaking: (speaking: boolean) => void;
  _setVolume: (volume: number) => void;
  _simulateError: (code: AudioErrorCode) => void;
  _simulatePlaybackComplete: () => void;
}

/**
 * Create a mock for useAnnetteAudio hook
 */
export function createMockUseAnnetteAudio(
  options: MockUseAnnetteAudioOptions = {}
): MockUseAnnetteAudioReturn {
  let isSpeaking = options.isSpeaking ?? false;
  let isError = options.isError ?? false;
  let audioError: AudioError | null = options.audioError ?? null;
  let volume = options.volume ?? 0.5;
  let isVoiceEnabled = options.isVoiceEnabled ?? false;
  let message = options.message ?? 'Systems ready - Click to activate voice';

  const audioContext = new MockAudioContext({ initialState: 'running' });
  const analyser = new MockAnalyserNode({ frequencyPattern: 'sine' });

  const createError = (code: AudioErrorCode): AudioError => ({
    code,
    message: `Mock error: ${code}`,
    recovery: 'This is a mock error for testing',
    severity: 'error',
    recoverable: true
  });

  const mockReturn: MockUseAnnetteAudioReturn = {
    get isSpeaking() { return isSpeaking; },
    get isError() { return isError; },
    get audioError() { return audioError; },
    get volume() { return volume; },
    get audioContext() { return isSpeaking ? audioContext : null; },
    get analyser() { return isSpeaking ? analyser : null; },
    get isVoiceEnabled() { return isVoiceEnabled; },
    get message() { return message; },

    setIsVoiceEnabled: (enabled: boolean) => {
      isVoiceEnabled = enabled;
    },

    setMessage: (newMessage: string) => {
      message = newMessage;
    },

    setIsError: (error: boolean) => {
      isError = error;
    },

    playAudioInternal: async (text: string) => {
      if (options.simulateTTSFailure) {
        const error = createError(options.failureErrorCode ?? 'TTS_API_ERROR');
        audioError = error;
        isError = true;
        throw new Error(error.message);
      }

      if (options.simulatePlaybackFailure) {
        const error = createError(options.failureErrorCode ?? 'PLAYBACK_FAILED');
        audioError = error;
        isError = true;
        throw new Error(error.message);
      }

      message = text;
      isSpeaking = true;
      volume = 0.7;

      // Simulate playback completing after a short delay
      await new Promise(resolve => setTimeout(resolve, 100));

      isSpeaking = false;
      volume = 0.5;
    },

    speakMessage: async (text: string) => {
      message = text;
      if (!isVoiceEnabled) {
        return;
      }
      await mockReturn.playAudioInternal(text);
    },

    handleAudioError: (error: Error | unknown) => {
      const parsedError = createError('UNKNOWN_AUDIO_ERROR');
      if (error instanceof Error) {
        parsedError.message = error.message;
      }
      audioError = parsedError;
      isError = true;
      return parsedError;
    },

    clearAudioError: () => {
      audioError = null;
      isError = false;
    },

    tryRecovery: async () => {
      if (!audioError) return false;
      if (audioError.code === 'AUDIO_CONTEXT_SUSPENDED') {
        await audioContext.resume();
        audioError = null;
        isError = false;
        return true;
      }
      return false;
    },

    // Test helpers
    _setIsSpeaking: (speaking: boolean) => {
      isSpeaking = speaking;
    },

    _setVolume: (newVolume: number) => {
      volume = newVolume;
    },

    _simulateError: (code: AudioErrorCode) => {
      audioError = createError(code);
      isError = true;
    },

    _simulatePlaybackComplete: () => {
      isSpeaking = false;
      volume = 0.5;
    }
  };

  return mockReturn;
}

// ============================================================================
// setupAudioTest Helper
// ============================================================================

/**
 * Initialize all audio mocks with sensible defaults
 *
 * @example
 * ```typescript
 * import { setupAudioTest } from '../__test-utils__/audioMocks';
 *
 * describe('MyComponent', () => {
 *   let audioTest: AudioTestContext;
 *
 *   beforeEach(() => {
 *     audioTest = setupAudioTest();
 *   });
 *
 *   afterEach(() => {
 *     audioTest.cleanup();
 *   });
 *
 *   it('should handle TTS playback', async () => {
 *     const { useAnnetteAudioMock, ttsCache } = audioTest;
 *
 *     // Simulate cache hit
 *     audioTest.simulateCacheHit('Hello', audioTest.createTestAudioBlob());
 *
 *     await useAnnetteAudioMock.speakMessage('Hello');
 *     expect(useAnnetteAudioMock.isSpeaking).toBe(false); // After completion
 *   });
 * });
 * ```
 */
export function setupAudioTest(options: SetupAudioTestOptions = {}): AudioTestContext {
  const audioContext = new MockAudioContext(options.audioContext);
  const analyser = new MockAnalyserNode(options.analyser);
  const ttsCache = new MockTTSCache(options.ttsCache);
  const useAnnetteAudioMock = createMockUseAnnetteAudio(options.useAnnetteAudio);

  // Store original globals for cleanup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalAudioContext = (globalThis as any).AudioContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalWebkitAudioContext = (globalThis as any).webkitAudioContext;

  // Install global mocks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).AudioContext = MockAudioContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).webkitAudioContext = MockAudioContext;

  const cleanup = () => {
    // Restore original globals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    if (originalAudioContext) {
      g.AudioContext = originalAudioContext;
    } else {
      delete g.AudioContext;
    }

    if (originalWebkitAudioContext) {
      g.webkitAudioContext = originalWebkitAudioContext;
    } else {
      delete g.webkitAudioContext;
    }

    // Cleanup audio context
    audioContext.dispose();
  };

  // Auto-cleanup if enabled (default)
  // Note: afterEach is available in Jest/Vitest test environments
  if (options.autoCleanup !== false) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testEnvAfterEach = (globalThis as any).afterEach;
    if (typeof testEnvAfterEach === 'function') {
      testEnvAfterEach(cleanup);
    }
  }

  const createTestAudioBlob = (durationMs: number = 1000): Blob => {
    // Create a minimal valid audio blob (silent WAV)
    const sampleRate = 44100;
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const fileSize = 36 + dataSize;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Silent audio data (zeros)
    // Already zeros from ArrayBuffer initialization

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view: DataView, offset: number, str: string): void => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  return {
    audioContext,
    analyser,
    ttsCache,
    useAnnetteAudioMock,
    cleanup,

    simulateCacheHit: (text: string, blob: Blob) => {
      ttsCache.addEntry(text, blob);
    },

    simulateCacheMiss: () => {
      // Just reset to ensure no entries match
      ttsCache.resetTracking();
    },

    simulateTTSFailure: (errorCode?: AudioErrorCode) => {
      useAnnetteAudioMock._simulateError(errorCode ?? 'TTS_API_ERROR');
    },

    simulatePlaybackComplete: () => {
      useAnnetteAudioMock._simulatePlaybackComplete();
    },

    createTestAudioBlob
  };
}

// ============================================================================
// Jest/Vitest Mock Factories
// ============================================================================

/**
 * Create a jest.fn() compatible mock for ttsCache module
 * Use this to mock the entire ttsCache module in tests
 *
 * @example
 * ```typescript
 * jest.mock('../lib/ttsCache', () => createTTSCacheMockFactory());
 * ```
 */
export function createTTSCacheMockFactory(options: MockTTSCacheOptions = {}): {
  getCachedAudio: (text: string) => Promise<Blob | null>;
  setCachedAudio: (text: string, blob: Blob) => Promise<void>;
  getCacheStats: () => Promise<{ entryCount: number; totalSizeMB: number; oldestEntry: number | null; mostAccessed: number }>;
  clearCache: () => Promise<void>;
  deleteCachedAudio: (text: string) => Promise<void>;
  __mockCache: MockTTSCache;
} {
  const mockCache = new MockTTSCache(options);

  return {
    getCachedAudio: (text: string) => mockCache.getCachedAudio(text),
    setCachedAudio: (text: string, blob: Blob) => mockCache.setCachedAudio(text, blob),
    getCacheStats: () => mockCache.getCacheStats(),
    clearCache: () => mockCache.clearCache(),
    deleteCachedAudio: (text: string) => mockCache.deleteCachedAudio(text),
    __mockCache: mockCache
  };
}

/**
 * Create a mock factory for useAnnetteAudio hook
 * Use this with jest.mock or vi.mock
 *
 * @example
 * ```typescript
 * const mockAudio = createUseAnnetteAudioMockFactory();
 * jest.mock('../hooks/useAnnetteAudio', () => ({
 *   useAnnetteAudio: () => mockAudio
 * }));
 * ```
 */
export function createUseAnnetteAudioMockFactory(
  options: MockUseAnnetteAudioOptions = {}
): MockUseAnnetteAudioReturn {
  return createMockUseAnnetteAudio(options);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a mock HTMLAudioElement for testing
 */
export function createMockHTMLAudioElement(options: {
  duration?: number;
  autoPlayFails?: boolean;
  loadError?: boolean;
} = {}): HTMLAudioElement {
  let currentSrc = '';
  let paused = true;
  let ended = false;

  const handlers: Record<string, Array<() => void>> = {
    ended: [],
    error: [],
    loadeddata: [],
    canplaythrough: []
  };

  const mockAudio = {
    get src() { return currentSrc; },
    set src(value: string) {
      currentSrc = value;
      if (options.loadError) {
        setTimeout(() => handlers.error?.forEach(h => h()), 0);
      } else {
        setTimeout(() => {
          handlers.loadeddata?.forEach(h => h());
          handlers.canplaythrough?.forEach(h => h());
        }, 0);
      }
    },
    duration: options.duration ?? 1,
    currentTime: 0,
    paused,
    ended,
    volume: 1,
    muted: false,

    play: async () => {
      if (options.autoPlayFails) {
        const error = new DOMException('Autoplay blocked', 'NotAllowedError');
        throw error;
      }
      paused = false;
      // Simulate playback completion
      setTimeout(() => {
        ended = true;
        paused = true;
        handlers.ended?.forEach(h => h());
      }, 50);
    },

    pause: () => {
      paused = true;
    },

    load: () => {
      // No-op
    },

    addEventListener: (event: string, handler: () => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    },

    removeEventListener: (event: string, handler: () => void) => {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter(h => h !== handler);
      }
    },

    // Convenience setters for tests
    set onended(handler: (() => void) | null) {
      handlers.ended = handler ? [handler] : [];
    },
    set onerror(handler: (() => void) | null) {
      handlers.error = handler ? [handler] : [];
    },

    error: options.loadError ? { code: 4, message: 'MEDIA_ERR_SRC_NOT_SUPPORTED' } : null
  };

  return mockAudio as unknown as HTMLAudioElement;
}

/**
 * Install global Audio mock
 */
export function installGlobalAudioMock(options?: Parameters<typeof createMockHTMLAudioElement>[0]): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const originalAudio = g.Audio;

  // Create a mock Audio constructor
  g.Audio = class MockAudio {
    constructor(_src?: string) {
      return createMockHTMLAudioElement(options);
    }
  };

  return () => {
    if (originalAudio) {
      g.Audio = originalAudio;
    } else {
      delete g.Audio;
    }
  };
}
