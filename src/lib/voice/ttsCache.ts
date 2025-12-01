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
  isIndexedDBAvailable,
  executeIndexedDBRead,
  executeIndexedDBWrite,
  executeIndexedDBTransaction,
  promisifyRequest,
  createRecoveryHandler
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

// Reusable recovery handler for this cache
const recoveryHandler = createRecoveryHandler(DB_NAME, STORE_NAME, openDatabase, 20);

/**
 * Generate a cache key from text (normalized)
 */
function generateCacheKey(text: string): string {
  // Normalize text: trim, lowercase, remove extra spaces
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
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

  // Use transaction helper for read-modify-write operation
  const result = await executeIndexedDBTransaction<CacheEntry | null>(
    openDatabase,
    STORE_NAME,
    'readwrite',
    async (store) => {
      const entry = await promisifyRequest(store.get(key)) as CacheEntry | undefined;
      if (entry) {
        // Update access statistics
        entry.accessCount += 1;
        entry.lastAccessed = Date.now();
        store.put(entry);
        return entry;
      }
      return null;
    },
    { dbName: DB_NAME, storeName: STORE_NAME, operation: 'getCachedAudio' }
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

  const entry: CacheEntry = {
    text: key,
    audioBlob,
    timestamp: now,
    size: audioBlob.size,
    accessCount: 1,
    lastAccessed: now
  };

  // Use transaction helper for write with eviction
  const result = await executeIndexedDBTransaction<void>(
    openDatabase,
    STORE_NAME,
    'readwrite',
    async (store) => {
      // Check cache size and evict if necessary
      const entries = await promisifyRequest(store.getAll()) as CacheEntry[];
      const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
      const totalSizeMB = totalSize / (1024 * 1024);

      if (entries.length > MAX_CACHE_ENTRIES || totalSizeMB > MAX_CACHE_SIZE_MB) {
        // Sort by LRU (least recently used)
        const sorted = entries.sort((a, b) => {
          if (a.accessCount !== b.accessCount) {
            return a.accessCount - b.accessCount;
          }
          return a.lastAccessed - b.lastAccessed;
        });

        // Delete oldest/least used entries
        let currentSize = totalSize;
        let currentCount = entries.length;
        let deleteCount = 0;

        for (const e of sorted) {
          if (currentCount <= MAX_CACHE_ENTRIES * 0.8 &&
              currentSize / (1024 * 1024) <= MAX_CACHE_SIZE_MB * 0.8) {
            break;
          }

          store.delete(e.text);
          memoryCache.delete(e.text);
          currentSize -= e.size;
          currentCount -= 1;
          deleteCount += 1;
        }

        if (deleteCount > 0) {
          console.log(`[TTSCache] Evicted ${deleteCount} entries`);
        }
      }

      // Store the new entry
      await promisifyRequest(store.put(entry));
      console.log(`[TTSCache] Cached audio for: "${text.substring(0, 30)}..." (${(audioBlob.size / 1024).toFixed(1)} KB)`);
    },
    { dbName: DB_NAME, storeName: STORE_NAME, operation: 'setCachedAudio', onError: recoveryHandler }
  );

  if (!result.success) {
    console.warn('[TTSCache] Failed to store in IndexedDB, using memory cache only');
  }
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

  const result = await executeIndexedDBRead<CacheEntry[]>(
    openDatabase,
    STORE_NAME,
    (store) => store.getAll(),
    { dbName: DB_NAME, storeName: STORE_NAME, operation: 'getCacheStats' }
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

  const result = await executeIndexedDBWrite<undefined>(
    openDatabase,
    STORE_NAME,
    (store) => store.clear(),
    { dbName: DB_NAME, storeName: STORE_NAME, operation: 'clearCache' }
  );

  if (result.success) {
    console.log('[TTSCache] Cleared all entries');
  } else {
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

  const result = await executeIndexedDBWrite<undefined>(
    openDatabase,
    STORE_NAME,
    (store) => store.delete(key),
    { dbName: DB_NAME, storeName: STORE_NAME, operation: 'deleteCachedAudio' }
  );

  if (!result.success) {
    console.warn('[TTSCache] Failed to delete from IndexedDB');
    throw result.error;
  }
}
