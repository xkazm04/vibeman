/**
 * IndexedDB-based TTS Audio Cache
 * Stores generated TTS audio blobs to reduce network latency and bandwidth
 */

const DB_NAME = 'tts-cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio';
const MAX_CACHE_SIZE_MB = 50; // Maximum cache size in megabytes
const MAX_CACHE_ENTRIES = 100; // Maximum number of cached entries

interface CacheEntry {
  text: string;           // The text that was spoken (used as key)
  audioBlob: Blob;        // The audio data
  timestamp: number;      // When this was cached
  size: number;           // Size in bytes
  accessCount: number;    // How many times this has been accessed
  lastAccessed: number;   // Last access timestamp
}

/**
 * Initialize IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
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
 * Get cached audio for given text
 */
export async function getCachedAudio(text: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    const key = generateCacheKey(text);

    return new Promise((resolve, reject) => {
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

          resolve(entry.audioBlob);
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
  } catch (error) {
    console.error('Failed to get cached audio:', error);
    return null;
  }
}

/**
 * Cache audio blob for given text
 */
export async function setCachedAudio(text: string, audioBlob: Blob): Promise<void> {
  try {
    const db = await openDatabase();
    const key = generateCacheKey(text);

    // Check cache size and evict if necessary
    await evictIfNeeded(db);

    const entry: CacheEntry = {
      text: key,
      audioBlob,
      timestamp: Date.now(),
      size: audioBlob.size,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Failed to cache audio:', error);
    // Don't throw - caching failure shouldn't break TTS functionality
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
        currentSize -= entry.size;
        currentCount -= 1;
        deleteCount += 1;
      }

      if (deleteCount > 0) {
        console.log(`TTS Cache: Evicted ${deleteCount} entries`);
      }

      resolve();
    };

    request.onerror = () => reject(request.error);

    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  entryCount: number;
  totalSizeMB: number;
  oldestEntry: number | null;
  mostAccessed: number;
}> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];

        if (entries.length === 0) {
          resolve({
            entryCount: 0,
            totalSizeMB: 0,
            oldestEntry: null,
            mostAccessed: 0
          });
          return;
        }

        const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
        const oldestTimestamp = Math.min(...entries.map(e => e.timestamp));
        const maxAccessCount = Math.max(...entries.map(e => e.accessCount));

        resolve({
          entryCount: entries.length,
          totalSizeMB: totalSize / (1024 * 1024),
          oldestEntry: oldestTimestamp,
          mostAccessed: maxAccessCount
        });
      };

      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      entryCount: 0,
      totalSizeMB: 0,
      oldestEntry: null,
      mostAccessed: 0
    };
  }
}

/**
 * Clear all cached audio
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('TTS Cache cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    throw error;
  }
}

/**
 * Delete specific cached entry
 */
export async function deleteCachedAudio(text: string): Promise<void> {
  try {
    const db = await openDatabase();
    const key = generateCacheKey(text);

    return new Promise((resolve, reject) => {
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
  } catch (error) {
    console.error('Failed to delete cached audio:', error);
    throw error;
  }
}
