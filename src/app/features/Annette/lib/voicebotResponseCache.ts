/**
 * Voicebot Response Cache
 * Client-side cache for voicebot API responses using IndexedDB
 * Caches full LLM responses keyed by command payload to reduce latency and backend load
 *
 * Uses centralized error handling from indexedDBErrors.ts for:
 * - Quota exceeded recovery (auto-cleanup of oldest entries)
 * - Corrupt data recovery (database reinitialization)
 * - In-memory fallback when IndexedDB is unavailable
 */

import {
  IndexedDBErrorCode,
  withIndexedDBErrorHandler,
  isIndexedDBAvailable,
  getInMemoryCache,
  cleanupQuota,
  reinitializeDatabase
} from './indexedDBErrors';

const DB_NAME = 'voicebot-response-cache';
const DB_VERSION = 1;
const STORE_NAME = 'responses';
const DEFAULT_TTL_MS = 1000 * 60 * 60; // 1 hour default TTL

// In-memory fallback cache
const memoryCache = getInMemoryCache<CachedResponse>(DB_NAME, 100);

/**
 * Cached response entry
 */
interface CachedResponse {
  key: string;
  userText: string;
  assistantText: string;
  audioUrl?: string;
  timestamp: number;
  ttl: number;
  conversationHash?: string; // Hash of conversation history for context-aware caching
}

/**
 * Cache configuration
 */
export interface ResponseCacheConfig {
  ttl?: number; // Time-to-live in milliseconds
  maxEntries?: number; // Maximum number of cached entries (LRU eviction)
  enabled?: boolean; // Toggle cache on/off
}

/**
 * Generate cache key from command payload
 */
function generateCacheKey(
  message: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  provider?: string,
  model?: string
): string {
  // Create a deterministic key from the message and context
  const contextStr = conversationHistory
    ? JSON.stringify(conversationHistory.slice(-3)) // Only last 3 messages for context
    : '';

  const keyComponents = [
    message.toLowerCase().trim(),
    contextStr,
    provider || 'default',
    model || 'default'
  ];

  return btoa(keyComponents.join('|')); // Base64 encode for safe key
}

/**
 * Generate conversation hash for context-aware caching
 */
function generateConversationHash(
  conversationHistory?: Array<{ role: string; content: string }>
): string {
  if (!conversationHistory || conversationHistory.length === 0) {
    return 'empty';
  }

  // Use last 3 messages for context
  const recentHistory = conversationHistory.slice(-3);
  return btoa(JSON.stringify(recentHistory));
}

/**
 * Open IndexedDB connection with error handling
 */
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[ResponseCache] Failed to open database:', request.error?.message);
      reject(request.error);
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onblocked = () => {
      console.warn('[ResponseCache] Database upgrade blocked by another connection');
    };
  });
}

/**
 * Handle quota exceeded by cleaning up old entries
 */
async function handleQuotaExceeded(): Promise<void> {
  try {
    const db = await openDatabase();
    await cleanupQuota(db, STORE_NAME, 20); // Clean up 20 oldest entries
    db.close();
    console.log('[ResponseCache] Cleaned up old entries to free quota');
  } catch (error) {
    console.error('[ResponseCache] Failed to clean up quota:', error);
  }
}

/**
 * Get cached response with error handling and fallback
 */
export async function getCachedResponse(
  message: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  provider?: string,
  model?: string,
  config: ResponseCacheConfig = {}
): Promise<CachedResponse | null> {
  if (config.enabled === false) {
    return null;
  }

  const key = generateCacheKey(message, conversationHistory, provider, model);

  // Check in-memory cache first
  const memoryCached = memoryCache.get(key);
  if (memoryCached) {
    const now = Date.now();
    const age = now - memoryCached.timestamp;

    if (age <= memoryCached.ttl) {
      console.log(`[ResponseCache] Memory cache hit (age: ${Math.round(age / 1000)}s)`);
      return memoryCached;
    } else {
      memoryCache.delete(key);
    }
  }

  if (!isIndexedDBAvailable()) {
    return null;
  }

  const result = await withIndexedDBErrorHandler<CachedResponse | null>(
    async () => {
      const db = await openDatabase();

      return new Promise<CachedResponse | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const cached = request.result as CachedResponse | undefined;

          if (!cached) {
            resolve(null);
            return;
          }

          // Check if entry has expired
          const now = Date.now();
          const age = now - cached.timestamp;

          if (age > cached.ttl) {
            console.log('[ResponseCache] Entry expired, invalidating');
            // Delete expired entry asynchronously
            deleteCachedResponse(key).catch(console.warn);
            resolve(null);
            return;
          }

          console.log(`[ResponseCache] IndexedDB hit (age: ${Math.round(age / 1000)}s)`);
          resolve(cached);
        };

        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    },
    {
      dbName: DB_NAME,
      storeName: STORE_NAME,
      operation: 'getCachedResponse'
    }
  );

  if (result.success && result.data) {
    // Update memory cache
    memoryCache.set(key, result.data);
    return result.data;
  }

  return null;
}

/**
 * Set cached response with error handling
 */
export async function setCachedResponse(
  message: string,
  assistantText: string,
  audioUrl: string | undefined,
  conversationHistory?: Array<{ role: string; content: string }>,
  provider?: string,
  model?: string,
  config: ResponseCacheConfig = {}
): Promise<void> {
  if (config.enabled === false) {
    return;
  }

  const ttl = config.ttl || DEFAULT_TTL_MS;
  const key = generateCacheKey(message, conversationHistory, provider, model);
  const conversationHash = generateConversationHash(conversationHistory);

  const entry: CachedResponse = {
    key,
    userText: message,
    assistantText,
    audioUrl,
    timestamp: Date.now(),
    ttl,
    conversationHash
  };

  // Always update in-memory cache
  memoryCache.set(key, entry, ttl);

  if (!isIndexedDBAvailable()) {
    console.warn('[ResponseCache] IndexedDB not available, using memory cache only');
    return;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDatabase();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(entry);

        request.onsuccess = () => {
          console.log('[ResponseCache] Stored new entry');

          // Check max entries limit
          if (config.maxEntries) {
            evictOldestEntries(config.maxEntries).catch(console.warn);
          }

          resolve();
        };

        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    },
    {
      dbName: DB_NAME,
      storeName: STORE_NAME,
      operation: 'setCachedResponse',
      onError: async (error) => {
        if (error.code === IndexedDBErrorCode.QUOTA_EXCEEDED) {
          await handleQuotaExceeded();
        } else if (error.code === IndexedDBErrorCode.CORRUPT_DATA) {
          await reinitializeDatabase(DB_NAME);
        }
      }
    }
  );

  if (!result.success) {
    console.warn('[ResponseCache] Failed to store in IndexedDB, using memory cache');
  }
}

/**
 * Delete cached response with error handling
 */
export async function deleteCachedResponse(key: string): Promise<void> {
  // Remove from memory cache
  memoryCache.delete(key);

  if (!isIndexedDBAvailable()) {
    return;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDatabase();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    },
    {
      dbName: DB_NAME,
      storeName: STORE_NAME,
      operation: 'deleteCachedResponse'
    }
  );

  if (!result.success) {
    console.warn('[ResponseCache] Failed to delete from IndexedDB');
  }
}

/**
 * Clear all cached responses with error handling
 */
export async function clearResponseCache(): Promise<void> {
  // Clear memory cache
  memoryCache.clear();

  if (!isIndexedDBAvailable()) {
    return;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDatabase();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('[ResponseCache] Cleared all entries');
          resolve();
        };

        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    },
    {
      dbName: DB_NAME,
      storeName: STORE_NAME,
      operation: 'clearResponseCache'
    }
  );

  if (!result.success) {
    console.warn('[ResponseCache] Failed to clear IndexedDB');
  }
}

/**
 * Get cache statistics with error handling
 */
export async function getResponseCacheStats(): Promise<{
  totalEntries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  totalSizeEstimate: number;
  inMemoryEntries: number;
  indexedDBAvailable: boolean;
}> {
  const inMemoryCount = memoryCache.size();
  const available = isIndexedDBAvailable();

  if (!available) {
    return {
      totalEntries: inMemoryCount,
      oldestEntry: null,
      newestEntry: null,
      totalSizeEstimate: 0,
      inMemoryEntries: inMemoryCount,
      indexedDBAvailable: false
    };
  }

  const result = await withIndexedDBErrorHandler<{
    entries: CachedResponse[];
  }>(
    async () => {
      const db = await openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve({ entries: request.result as CachedResponse[] });
        };

        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    },
    {
      dbName: DB_NAME,
      storeName: STORE_NAME,
      operation: 'getResponseCacheStats'
    }
  );

  if (result.success && result.data) {
    const entries = result.data.entries;

    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;
    let totalSizeEstimate = 0;

    entries.forEach((entry) => {
      if (oldestEntry === null || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (newestEntry === null || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }

      // Rough size estimate
      totalSizeEstimate += entry.assistantText.length + (entry.audioUrl?.length || 0);
    });

    return {
      totalEntries: entries.length,
      oldestEntry,
      newestEntry,
      totalSizeEstimate,
      inMemoryEntries: inMemoryCount,
      indexedDBAvailable: true
    };
  }

  // Fallback on error
  return {
    totalEntries: inMemoryCount,
    oldestEntry: null,
    newestEntry: null,
    totalSizeEstimate: 0,
    inMemoryEntries: inMemoryCount,
    indexedDBAvailable: available
  };
}

/**
 * Evict oldest entries to maintain max entries limit (LRU)
 */
async function evictOldestEntries(maxEntries: number): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDatabase();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor();

        const entries: Array<{ key: string; timestamp: number }> = [];

        request.onsuccess = () => {
          const cursor = request.result;

          if (cursor) {
            entries.push({
              key: cursor.value.key,
              timestamp: cursor.value.timestamp
            });
            cursor.continue();
          } else {
            // Sort by timestamp (oldest first)
            entries.sort((a, b) => a.timestamp - b.timestamp);

            // Delete oldest entries if we exceed the limit
            const toDelete = entries.length - maxEntries;

            if (toDelete > 0) {
              console.log(`[ResponseCache] Evicting ${toDelete} old entries`);

              for (let i = 0; i < toDelete; i++) {
                store.delete(entries[i].key);
                memoryCache.delete(entries[i].key);
              }
            }

            resolve();
          }
        };

        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    },
    {
      dbName: DB_NAME,
      storeName: STORE_NAME,
      operation: 'evictOldestEntries'
    }
  );

  if (!result.success) {
    console.warn('[ResponseCache] Failed to evict old entries');
  }
}

/**
 * Invalidate cache entries when a new command is detected
 * (i.e., when conversation context changes significantly)
 */
export async function invalidateCacheOnNewCommand(
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<void> {
  // This is a policy function that can be called when you detect
  // a significant context change. For now, it's a no-op, but you can
  // implement custom invalidation logic here.

  // Example: Clear cache if conversation has changed significantly
  const currentHash = generateConversationHash(conversationHistory);

  // Store this in sessionStorage or state to compare on next call
  const lastHash = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('last-conversation-hash')
    : null;

  if (lastHash && lastHash !== currentHash) {
    console.log('[ResponseCache] Conversation context changed, clearing cache');
    await clearResponseCache();
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('last-conversation-hash', currentHash);
  }
}
