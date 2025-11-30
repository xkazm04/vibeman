/**
 * IndexedDB-based TTS Audio Cache
 * Stores generated TTS audio blobs to reduce network latency and bandwidth
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
  cleanupQuota,
  reinitializeDatabase
} from './indexedDBErrors';

const DB_NAME = 'tts-cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio';
const MAX_CACHE_SIZE_MB = 50; // Maximum cache size in megabytes
const MAX_CACHE_ENTRIES = 100; // Maximum number of cached entries

// In-memory fallback for audio blobs (limited due to memory constraints)
const memoryCache = new Map<string, { blob: Blob; timestamp: number; accessCount: number }>();
const MAX_MEMORY_ENTRIES = 20; // Keep memory usage low for audio blobs

interface CacheEntry {
  text: string;           // The text that was spoken (used as key)
  audioBlob: Blob;        // The audio data
  timestamp: number;      // When this was cached
  size: number;           // Size in bytes
  accessCount: number;    // How many times this has been accessed
  lastAccessed: number;   // Last access timestamp
}

/**
 * Initialize IndexedDB database with error handling
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[TTSCache] Failed to open database:', request.error?.message);
      reject(request.error);
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'text' });

        // Create indexes for efficient querying
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        store.createIndex('accessCount', 'accessCount', { unique: false });
      }
    };

    request.onblocked = () => {
      console.warn('[TTSCache] Database upgrade blocked by another connection');
    };
  });
}

/**
 * Generate a cache key from text (normalized)
 */
function generateCacheKey(text: string): string {
  // Normalize text: trim, lowercase, remove extra spaces
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Handle quota exceeded by cleaning up old entries
 */
async function handleQuotaExceeded(): Promise<void> {
  try {
    const db = await openDatabase();
    await cleanupQuota(db, STORE_NAME, 20); // Clean up 20 oldest entries
    db.close();
    console.log('[TTSCache] Cleaned up old entries to free quota');
  } catch (error) {
    console.error('[TTSCache] Failed to clean up quota:', error);
  }
}

/**
 * Evict oldest entries from memory cache if at capacity
 */
function evictMemoryCache(): void {
  if (memoryCache.size < MAX_MEMORY_ENTRIES) {
    return;
  }

  // Find and remove oldest entry
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  const entries = Array.from(memoryCache.entries());

  for (const [key, entry] of entries) {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    memoryCache.delete(oldestKey);
  }
}

/**
 * Get cached audio for given text with error handling
 */
export async function getCachedAudio(text: string): Promise<Blob | null> {
  const key = generateCacheKey(text);

  // Check in-memory cache first
  const memoryCached = memoryCache.get(key);
  if (memoryCached) {
    memoryCached.accessCount++;
    console.log(`[TTSCache] Memory cache hit for: "${text.substring(0, 30)}..."`);
    return memoryCached.blob;
  }

  if (!isIndexedDBAvailable()) {
    return null;
  }

  const result = await withIndexedDBErrorHandler<CacheEntry | null>(
    async () => {
      const db = await openDatabase();

      return new Promise<CacheEntry | null>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result as CacheEntry | undefined;

          if (entry) {
            // Update access statistics
            entry.accessCount += 1;
            entry.lastAccessed = Date.now();
            store.put(entry);

            resolve(entry);
          } else {
            resolve(null);
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
      operation: 'getCachedAudio'
    }
  );

  if (result.success && result.data) {
    // Update memory cache
    evictMemoryCache();
    memoryCache.set(key, {
      blob: result.data.audioBlob,
      timestamp: result.data.timestamp,
      accessCount: result.data.accessCount
    });

    console.log(`[TTSCache] IndexedDB hit for: "${text.substring(0, 30)}..."`);
    return result.data.audioBlob;
  }

  return null;
}

/**
 * Cache audio blob for given text with error handling
 */
export async function setCachedAudio(text: string, audioBlob: Blob): Promise<void> {
  const key = generateCacheKey(text);
  const now = Date.now();

  // Update memory cache
  evictMemoryCache();
  memoryCache.set(key, {
    blob: audioBlob,
    timestamp: now,
    accessCount: 1
  });

  if (!isIndexedDBAvailable()) {
    console.warn('[TTSCache] IndexedDB not available, using memory cache only');
    return;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDatabase();

      // Check cache size and evict if necessary
      await evictIfNeeded(db);

      const entry: CacheEntry = {
        text: key,
        audioBlob,
        timestamp: now,
        size: audioBlob.size,
        accessCount: 1,
        lastAccessed: now
      };

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(entry);

        request.onsuccess = () => {
          console.log(`[TTSCache] Cached audio for: "${text.substring(0, 30)}..." (${(audioBlob.size / 1024).toFixed(1)} KB)`);
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
      operation: 'setCachedAudio',
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
    console.warn('[TTSCache] Failed to store in IndexedDB, using memory cache only');
  }
}

/**
 * Evict old entries if cache is too large
 */
async function evictIfNeeded(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const entries = request.result as CacheEntry[];

      // Check if we need to evict
      const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
      const totalSizeMB = totalSize / (1024 * 1024);

      if (entries.length <= MAX_CACHE_ENTRIES && totalSizeMB <= MAX_CACHE_SIZE_MB) {
        resolve();
        return;
      }

      // Sort by LRU (least recently used) - least accessed and oldest
      const sorted = entries.sort((a, b) => {
        // First priority: access count (lower is worse)
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount;
        }
        // Second priority: last accessed time (older is worse)
        return a.lastAccessed - b.lastAccessed;
      });

      // Delete oldest/least used entries until we're under limits
      let currentSize = totalSize;
      let currentCount = entries.length;
      let deleteCount = 0;

      for (const entry of sorted) {
        if (currentCount <= MAX_CACHE_ENTRIES * 0.8 &&
            currentSize / (1024 * 1024) <= MAX_CACHE_SIZE_MB * 0.8) {
          break;
        }

        store.delete(entry.text);
        memoryCache.delete(entry.text);
        currentSize -= entry.size;
        currentCount -= 1;
        deleteCount += 1;
      }

      if (deleteCount > 0) {
        console.log(`[TTSCache] Evicted ${deleteCount} entries`);
      }

      resolve();
    };

    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get cache statistics with error handling
 */
export async function getCacheStats(): Promise<{
  entryCount: number;
  totalSizeMB: number;
  oldestEntry: number | null;
  mostAccessed: number;
  inMemoryEntries: number;
  indexedDBAvailable: boolean;
}> {
  const inMemoryCount = memoryCache.size;
  const available = isIndexedDBAvailable();

  if (!available) {
    return {
      entryCount: inMemoryCount,
      totalSizeMB: 0,
      oldestEntry: null,
      mostAccessed: 0,
      inMemoryEntries: inMemoryCount,
      indexedDBAvailable: false
    };
  }

  const result = await withIndexedDBErrorHandler<CacheEntry[]>(
    async () => {
      const db = await openDatabase();

      return new Promise<CacheEntry[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result as CacheEntry[]);
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
      operation: 'getCacheStats'
    }
  );

  if (result.success && result.data) {
    const entries = result.data;

    if (entries.length === 0) {
      return {
        entryCount: 0,
        totalSizeMB: 0,
        oldestEntry: null,
        mostAccessed: 0,
        inMemoryEntries: inMemoryCount,
        indexedDBAvailable: true
      };
    }

    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    const oldestTimestamp = Math.min(...entries.map(e => e.timestamp));
    const maxAccessCount = Math.max(...entries.map(e => e.accessCount));

    return {
      entryCount: entries.length,
      totalSizeMB: totalSize / (1024 * 1024),
      oldestEntry: oldestTimestamp,
      mostAccessed: maxAccessCount,
      inMemoryEntries: inMemoryCount,
      indexedDBAvailable: true
    };
  }

  // Fallback on error
  return {
    entryCount: inMemoryCount,
    totalSizeMB: 0,
    oldestEntry: null,
    mostAccessed: 0,
    inMemoryEntries: inMemoryCount,
    indexedDBAvailable: available
  };
}

/**
 * Clear all cached audio with error handling
 */
export async function clearCache(): Promise<void> {
  // Clear memory cache
  memoryCache.clear();

  if (!isIndexedDBAvailable()) {
    return;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDatabase();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('[TTSCache] Cleared all entries');
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
      operation: 'clearCache'
    }
  );

  if (!result.success) {
    console.warn('[TTSCache] Failed to clear IndexedDB');
    throw result.error;
  }
}

/**
 * Delete specific cached entry with error handling
 */
export async function deleteCachedAudio(text: string): Promise<void> {
  const key = generateCacheKey(text);

  // Remove from memory cache
  memoryCache.delete(key);

  if (!isIndexedDBAvailable()) {
    return;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDatabase();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
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
      operation: 'deleteCachedAudio'
    }
  );

  if (!result.success) {
    console.warn('[TTSCache] Failed to delete from IndexedDB');
    throw result.error;
  }
}
