/**
 * Voicebot Response Cache
 * Client-side cache for voicebot API responses using IndexedDB
 * Caches full LLM responses keyed by command payload to reduce latency and backend load
 */

const DB_NAME = 'voicebot-response-cache';
const DB_VERSION = 1;
const STORE_NAME = 'responses';
const DEFAULT_TTL_MS = 1000 * 60 * 60; // 1 hour default TTL

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
 * Open IndexedDB connection
 */
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Get cached response
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

  try {
    const db = await openDatabase();
    const key = generateCacheKey(message, conversationHistory, provider, model);

    return new Promise((resolve, reject) => {
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
          console.log('Response cache: Entry expired, invalidating');
          // Delete expired entry asynchronously
          deleteCachedResponse(key).catch(console.warn);
          resolve(null);
          return;
        }

        console.log(`Response cache: Hit (age: ${Math.round(age / 1000)}s)`);
        resolve(cached);
      };

      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('Failed to get cached response:', error);
    return null;
  }
}

/**
 * Set cached response
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

  try {
    const db = await openDatabase();
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

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => {
        console.log('Response cache: Stored new entry');

        // Check max entries limit
        if (config.maxEntries) {
          evictOldestEntries(config.maxEntries).catch(console.warn);
        }

        resolve();
      };

      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('Failed to cache response:', error);
  }
}

/**
 * Delete cached response
 */
export async function deleteCachedResponse(key: string): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('Failed to delete cached response:', error);
  }
}

/**
 * Clear all cached responses
 */
export async function clearResponseCache(): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Response cache: Cleared all entries');
        resolve();
      };

      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('Failed to clear response cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getResponseCacheStats(): Promise<{
  totalEntries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  totalSizeEstimate: number;
}> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CachedResponse[];

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

        resolve({
          totalEntries: entries.length,
          oldestEntry,
          newestEntry,
          totalSizeEstimate
        });
      };

      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('Failed to get cache stats:', error);
    return {
      totalEntries: 0,
      oldestEntry: null,
      newestEntry: null,
      totalSizeEstimate: 0
    };
  }
}

/**
 * Evict oldest entries to maintain max entries limit (LRU)
 */
async function evictOldestEntries(maxEntries: number): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
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
            console.log(`Response cache: Evicting ${toDelete} old entries`);

            for (let i = 0; i < toDelete; i++) {
              store.delete(entries[i].key);
            }
          }

          resolve();
        }
      };

      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('Failed to evict old entries:', error);
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
  const lastHash = sessionStorage.getItem('last-conversation-hash');

  if (lastHash && lastHash !== currentHash) {
    console.log('Response cache: Conversation context changed, clearing cache');
    await clearResponseCache();
  }

  sessionStorage.setItem('last-conversation-hash', currentHash);
}
