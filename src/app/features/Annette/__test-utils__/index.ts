/**
 * Annette Audio Test Utilities
 *
 * Centralized exports for all audio testing utilities.
 * Import from this file to get all mock classes and helpers.
 *
 * @example
 * ```typescript
 * import {
 *   setupAudioTest,
 *   MockAudioContext,
 *   MockTTSCache,
 *   createMockUseAnnetteAudio
 * } from '@/app/features/Annette/__test-utils__';
 * ```
 */

export {
  // Main setup helper
  setupAudioTest,

  // Mock classes
  MockAudioContext,
  MockAnalyserNode,
  MockAudioNode,
  MockMediaElementAudioSourceNode,
  MockGainNode,
  MockOscillatorNode,
  MockAudioDestinationNode,
  MockTTSCache,

  // Mock factories
  createMockUseAnnetteAudio,
  createTTSCacheMockFactory,
  createUseAnnetteAudioMockFactory,

  // Utility functions
  createMockHTMLAudioElement,
  installGlobalAudioMock,

  // Types
  type MockAudioContextOptions,
  type MockAnalyserNodeOptions,
  type MockTTSCacheOptions,
  type MockUseAnnetteAudioOptions,
  type SetupAudioTestOptions,
  type AudioTestContext,
  type MockUseAnnetteAudioReturn,
} from './audioMocks';
