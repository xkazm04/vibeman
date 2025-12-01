/**
 * Shared Voice Library
 * Centralized exports for voice-related utilities, types, and caching
 *
 * This library provides reusable voice functionality that can be used
 * by multiple features including Annette voice assistant and voicebot.
 */

// =============================================================================
// Type Definitions
// =============================================================================

export * from './voicebotTypes';

// =============================================================================
// Utility Functions
// =============================================================================

// Export all from voicebotUtils except playAudio (which has a more complete version in ttsGen)
export {
  DEFAULT_AUDIO_CONFIG,
  DEFAULT_PROCESSING_CONFIG,
  createLog,
  calculateAudioLevel,
  isSilent,
  isSilenceDurationExceeded,
  blobToBase64,
  getUserMediaStream,
  createAudioContext,
  formatSessionState,
  isWebSocketReady,
  createWebSocketConnection,
  stopMediaStream,
  cleanupAudioContext,
  resumeAudioContext
} from './voicebotUtils';

// =============================================================================
// TTS Generation Utilities
// =============================================================================

// Export all from ttsGen (includes the preferred playAudio implementation)
export * from './ttsGen';

// =============================================================================
// Caching
// =============================================================================

// TTS Audio Cache (IndexedDB-based)
export {
  getCachedAudio,
  setCachedAudio,
  getCacheStats,
  clearCache,
  deleteCachedAudio
} from './ttsCache';

// Response Cache (IndexedDB-based)
export {
  getCachedResponse,
  setCachedResponse,
  getResponseCacheStats,
  clearResponseCache,
  deleteCachedResponse,
  invalidateCacheOnNewCommand,
  type ResponseCacheConfig
} from './voicebotResponseCache';

// =============================================================================
// IndexedDB Error Handling
// =============================================================================

export {
  // Error types
  IndexedDBErrorCode,
  IndexedDBError,
  type IndexedDBErrorDetails,
  type IndexedDBOperationContext,
  type IndexedDBOperationResult,
  type TransactionOptions,

  // Error handling
  withIndexedDBErrorHandler,
  withRetry,
  isIndexedDBAvailable,

  // Recovery utilities
  cleanupQuota,
  reinitializeDatabase,
  createRecoveryHandler,

  // In-memory cache utilities
  InMemoryCache,
  getInMemoryCache,
  getInMemoryCacheStats,

  // Safe IndexedDB operations (simple key-value)
  safeIndexedDBGet,
  safeIndexedDBPut,
  safeIndexedDBDelete,
  safeIndexedDBClear,

  // Transaction helpers (for complex operations)
  executeIndexedDBRead,
  executeIndexedDBWrite,
  executeIndexedDBTransaction,
  promisifyRequest
} from './indexedDBErrors';
