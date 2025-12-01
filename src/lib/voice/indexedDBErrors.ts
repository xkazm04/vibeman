/**
 * Centralized IndexedDB Error Handler
 *
 * Provides typed errors, recovery strategies, and in-memory fallback
 * for all IndexedDB operations in voice-related features.
 *
 * Error Types:
 * - QuotaExceededError: Storage quota exceeded, triggers cleanup
 * - CorruptDataError: Database or data corruption detected
 * - ConnectionError: Failed to connect to IndexedDB
 * - TransactionError: Transaction failed (timeout, abort)
 * - UnknownError: Catch-all for unexpected errors
 *
 * Recovery Strategies:
 * - Quota exceeded: Automatic cleanup of oldest entries
 * - Corrupt data: Delete and reinitialize database
 * - Connection error: Retry with exponential backoff, fallback to in-memory
 * - Transaction error: Retry once, then fallback
 */

// =============================================================================
// Error Types
// =============================================================================

export enum IndexedDBErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CORRUPT_DATA = 'CORRUPT_DATA',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  UNKNOWN = 'UNKNOWN'
}

export interface IndexedDBErrorDetails {
  code: IndexedDBErrorCode;
  message: string;
  originalError?: Error | DOMException;
  dbName?: string;
  storeName?: string;
  operation?: string;
  recoverable: boolean;
}

export class IndexedDBError extends Error {
  public readonly code: IndexedDBErrorCode;
  public readonly details: IndexedDBErrorDetails;
  public readonly recoverable: boolean;

  constructor(details: IndexedDBErrorDetails) {
    super(details.message);
    this.name = 'IndexedDBError';
    this.code = details.code;
    this.details = details;
    this.recoverable = details.recoverable;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, IndexedDBError.prototype);
  }

  static fromDOMException(
    error: DOMException,
    context: { dbName?: string; storeName?: string; operation?: string }
  ): IndexedDBError {
    const { dbName, storeName, operation } = context;

    // Detect error type from DOMException name
    if (error.name === 'QuotaExceededError') {
      return new IndexedDBError({
        code: IndexedDBErrorCode.QUOTA_EXCEEDED,
        message: `Storage quota exceeded for ${dbName || 'database'}`,
        originalError: error,
        dbName,
        storeName,
        operation,
        recoverable: true
      });
    }

    if (error.name === 'InvalidStateError' || error.name === 'AbortError') {
      return new IndexedDBError({
        code: IndexedDBErrorCode.TRANSACTION_FAILED,
        message: `Transaction failed: ${error.message}`,
        originalError: error,
        dbName,
        storeName,
        operation,
        recoverable: true
      });
    }

    if (error.name === 'NotFoundError' || error.name === 'DataError') {
      return new IndexedDBError({
        code: IndexedDBErrorCode.CORRUPT_DATA,
        message: `Data corruption detected: ${error.message}`,
        originalError: error,
        dbName,
        storeName,
        operation,
        recoverable: true
      });
    }

    if (error.name === 'NotSupportedError') {
      return new IndexedDBError({
        code: IndexedDBErrorCode.NOT_SUPPORTED,
        message: 'IndexedDB is not supported in this environment',
        originalError: error,
        dbName,
        storeName,
        operation,
        recoverable: false
      });
    }

    return new IndexedDBError({
      code: IndexedDBErrorCode.UNKNOWN,
      message: `IndexedDB error: ${error.message}`,
      originalError: error,
      dbName,
      storeName,
      operation,
      recoverable: false
    });
  }

  static fromError(
    error: Error,
    context: { dbName?: string; storeName?: string; operation?: string }
  ): IndexedDBError {
    if (error instanceof IndexedDBError) {
      return error;
    }

    if (error instanceof DOMException) {
      return IndexedDBError.fromDOMException(error, context);
    }

    const { dbName, storeName, operation } = context;
    const message = error.message.toLowerCase();

    // Check for connection-related errors
    if (message.includes('connection') || message.includes('open') || message.includes('blocked')) {
      return new IndexedDBError({
        code: IndexedDBErrorCode.CONNECTION_FAILED,
        message: `Failed to connect to ${dbName || 'database'}: ${error.message}`,
        originalError: error,
        dbName,
        storeName,
        operation,
        recoverable: true
      });
    }

    // Check for quota-related errors
    if (message.includes('quota') || message.includes('storage') || message.includes('full')) {
      return new IndexedDBError({
        code: IndexedDBErrorCode.QUOTA_EXCEEDED,
        message: `Storage quota exceeded for ${dbName || 'database'}`,
        originalError: error,
        dbName,
        storeName,
        operation,
        recoverable: true
      });
    }

    return new IndexedDBError({
      code: IndexedDBErrorCode.UNKNOWN,
      message: `IndexedDB error: ${error.message}`,
      originalError: error,
      dbName,
      storeName,
      operation,
      recoverable: false
    });
  }
}

// =============================================================================
// In-Memory Fallback Cache
// =============================================================================

interface InMemoryCacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
}

/**
 * In-memory fallback cache for when IndexedDB is unavailable
 * Limited capacity to prevent memory issues
 */
class InMemoryCache<T = unknown> {
  private cache = new Map<string, InMemoryCacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly defaultTTL: number;

  constructor(maxEntries = 100, defaultTTL = 60 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl?: number): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      timestamp: now,
      expiresAt: ttl ? now + ttl : now + this.defaultTTL
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getAll(): T[] {
    const now = Date.now();
    const results: T[] = [];
    const entries = Array.from(this.cache.entries());

    for (const [key, entry] of entries) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        continue;
      }
      results.push(entry.value);
    }

    return results;
  }

  size(): number {
    return this.cache.size;
  }

  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    const entries = Array.from(this.cache.entries());

    for (const [key, entry] of entries) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}

// Shared in-memory caches for different stores
const inMemoryCaches: Map<string, InMemoryCache<unknown>> = new Map();

function getInMemoryCache<T>(dbName: string, maxEntries = 100): InMemoryCache<T> {
  if (!inMemoryCaches.has(dbName)) {
    inMemoryCaches.set(dbName, new InMemoryCache<T>(maxEntries));
  }
  return inMemoryCaches.get(dbName) as InMemoryCache<T>;
}

// =============================================================================
// Recovery Strategies
// =============================================================================

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 100,
  maxDelay: 2000
};

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay } = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on non-recoverable errors
      if (error instanceof IndexedDBError && !error.recoverable) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Attempt quota cleanup by deleting oldest entries
 */
export async function cleanupQuota(
  db: IDBDatabase,
  storeName: string,
  deleteCount = 10
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // Get all keys with their timestamps if available
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result;

        if (entries.length === 0) {
          resolve(0);
          return;
        }

        // Sort by timestamp (oldest first)
        const sorted = entries.sort((a, b) => {
          const aTime = a.timestamp || a.createdAt || 0;
          const bTime = b.timestamp || b.createdAt || 0;
          return aTime - bTime;
        });

        // Delete oldest entries
        const toDelete = Math.min(deleteCount, sorted.length);
        let deleted = 0;

        for (let i = 0; i < toDelete; i++) {
          const entry = sorted[i];
          const key = entry.key || entry.id || entry.text; // Common key patterns

          if (key) {
            const deleteReq = store.delete(key);
            deleteReq.onsuccess = () => {
              deleted++;
            };
          }
        }

        transaction.oncomplete = () => {
          console.log(`[IndexedDB Recovery] Cleaned up ${deleted} entries from ${storeName}`);
          resolve(deleted);
        };
      };

      request.onerror = () => {
        reject(IndexedDBError.fromDOMException(
          request.error as DOMException,
          { storeName, operation: 'cleanup' }
        ));
      };

      transaction.onerror = () => {
        reject(IndexedDBError.fromDOMException(
          transaction.error as DOMException,
          { storeName, operation: 'cleanup' }
        ));
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Delete and reinitialize a corrupted database
 */
export async function reinitializeDatabase(dbName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[IndexedDB Recovery] Reinitializing database: ${dbName}`);

    const request = indexedDB.deleteDatabase(dbName);

    request.onsuccess = () => {
      console.log(`[IndexedDB Recovery] Database ${dbName} deleted, will be recreated on next use`);
      resolve();
    };

    request.onerror = () => {
      reject(new IndexedDBError({
        code: IndexedDBErrorCode.UNKNOWN,
        message: `Failed to delete database ${dbName}`,
        originalError: request.error as DOMException,
        dbName,
        recoverable: false
      }));
    };

    request.onblocked = () => {
      console.warn(`[IndexedDB Recovery] Database deletion blocked, will retry`);
      // Close any open connections and retry
      setTimeout(() => {
        reinitializeDatabase(dbName).then(resolve).catch(reject);
      }, 100);
    };
  });
}

// =============================================================================
// Error Handler Wrapper
// =============================================================================

export interface IndexedDBOperationContext {
  dbName: string;
  storeName: string;
  operation: string;
  enableFallback?: boolean;
  fallbackKey?: string;
  onError?: (error: IndexedDBError) => void;
}

export interface IndexedDBOperationResult<T> {
  success: boolean;
  data?: T;
  error?: IndexedDBError;
  usedFallback: boolean;
}

/**
 * Wrap an IndexedDB operation with error handling and recovery
 */
export async function withIndexedDBErrorHandler<T>(
  operation: () => Promise<T>,
  context: IndexedDBOperationContext
): Promise<IndexedDBOperationResult<T>> {
  const { dbName, storeName, operation: opName, onError } = context;

  try {
    // Attempt operation with retry
    const data = await withRetry(operation, { maxRetries: 2 });

    return {
      success: true,
      data,
      usedFallback: false
    };
  } catch (error) {
    const indexedDBError = error instanceof IndexedDBError
      ? error
      : IndexedDBError.fromError(error instanceof Error ? error : new Error(String(error)), {
          dbName,
          storeName,
          operation: opName
        });

    // Log error for debugging
    console.error(`[IndexedDB] ${opName} failed:`, {
      code: indexedDBError.code,
      message: indexedDBError.message,
      dbName,
      storeName
    });

    // Notify callback if provided
    if (onError) {
      onError(indexedDBError);
    }

    // Attempt recovery based on error type
    if (indexedDBError.code === IndexedDBErrorCode.QUOTA_EXCEEDED) {
      console.log(`[IndexedDB Recovery] Quota exceeded, attempting cleanup`);
      // Recovery will happen on next operation
    }

    if (indexedDBError.code === IndexedDBErrorCode.CORRUPT_DATA) {
      console.log(`[IndexedDB Recovery] Corrupt data detected, will reinitialize on next operation`);
      // Reinitialize in background
      reinitializeDatabase(dbName).catch(console.error);
    }

    // Return failure result
    return {
      success: false,
      error: indexedDBError,
      usedFallback: false
    };
  }
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    if (!window.indexedDB) {
      return false;
    }

    // Additional check for private browsing mode
    const testRequest = indexedDB.open('__test__');
    testRequest.onerror = () => {
      // IndexedDB blocked (private mode, etc.)
    };
    testRequest.onsuccess = () => {
      const db = testRequest.result;
      db.close();
      indexedDB.deleteDatabase('__test__');
    };

    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// High-Level Utilities for Cache Operations
// =============================================================================

/**
 * Safe wrapper for getting data from IndexedDB with in-memory fallback
 */
export async function safeIndexedDBGet<T>(
  openDb: () => Promise<IDBDatabase>,
  storeName: string,
  key: string,
  context: { dbName: string }
): Promise<T | null> {
  const cache = getInMemoryCache<T>(context.dbName);

  // Check in-memory cache first
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  if (!isIndexedDBAvailable()) {
    return null;
  }

  const result = await withIndexedDBErrorHandler<T | null>(
    async () => {
      const db = await openDb();

      return new Promise<T | null>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(request.error);
        };

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    },
    { dbName: context.dbName, storeName, operation: 'get' }
  );

  if (result.success && result.data) {
    // Update in-memory cache
    cache.set(key, result.data);
  }

  return result.data || null;
}

/**
 * Safe wrapper for storing data in IndexedDB with in-memory fallback
 */
export async function safeIndexedDBPut<T extends object>(
  openDb: () => Promise<IDBDatabase>,
  storeName: string,
  key: string,
  value: T,
  context: { dbName: string; onQuotaExceeded?: () => Promise<void> }
): Promise<boolean> {
  const cache = getInMemoryCache<T>(context.dbName);

  // Always update in-memory cache
  cache.set(key, value);

  if (!isIndexedDBAvailable()) {
    console.warn('[IndexedDB] Not available, using in-memory cache only');
    return true;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDb();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value);

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
      dbName: context.dbName,
      storeName,
      operation: 'put',
      onError: async (error) => {
        if (error.code === IndexedDBErrorCode.QUOTA_EXCEEDED && context.onQuotaExceeded) {
          await context.onQuotaExceeded();
        }
      }
    }
  );

  if (!result.success) {
    console.warn(`[IndexedDB] Failed to store ${key}, using in-memory cache`);
  }

  return result.success;
}

/**
 * Safe wrapper for deleting data from IndexedDB
 */
export async function safeIndexedDBDelete(
  openDb: () => Promise<IDBDatabase>,
  storeName: string,
  key: string,
  context: { dbName: string }
): Promise<boolean> {
  const cache = getInMemoryCache(context.dbName);
  cache.delete(key);

  if (!isIndexedDBAvailable()) {
    return true;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDb();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
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
    { dbName: context.dbName, storeName, operation: 'delete' }
  );

  return result.success;
}

/**
 * Safe wrapper for clearing all data from IndexedDB store
 */
export async function safeIndexedDBClear(
  openDb: () => Promise<IDBDatabase>,
  storeName: string,
  context: { dbName: string }
): Promise<boolean> {
  const cache = getInMemoryCache(context.dbName);
  cache.clear();

  if (!isIndexedDBAvailable()) {
    return true;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDb();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    },
    { dbName: context.dbName, storeName, operation: 'clear' }
  );

  return result.success;
}

/**
 * Get statistics about in-memory cache usage
 */
export function getInMemoryCacheStats(dbName: string): { size: number; entries: number } {
  const cache = getInMemoryCache(dbName);
  return {
    size: cache.size(),
    entries: cache.getAll().length
  };
}

// =============================================================================
// High-Level Transaction Helpers
// =============================================================================

/**
 * Options for IndexedDB transaction operations
 */
export interface TransactionOptions {
  /** Database name for error context */
  dbName: string;
  /** Store name for error context */
  storeName: string;
  /** Operation name for error context */
  operation: string;
  /** Callback when error occurs (for recovery actions) */
  onError?: (error: IndexedDBError) => void | Promise<void>;
}

/**
 * Execute an IndexedDB read operation with unified error handling.
 * Handles database opening, transaction management, and error recovery.
 *
 * @example
 * ```ts
 * const result = await executeIndexedDBRead(
 *   openDatabase,
 *   'sessions',
 *   (store) => store.get(sessionId),
 *   { dbName: 'MyDB', storeName: 'sessions', operation: 'getSession' }
 * );
 * ```
 */
export async function executeIndexedDBRead<T>(
  openDb: () => Promise<IDBDatabase>,
  storeName: string,
  storeOperation: (store: IDBObjectStore) => IDBRequest,
  options: TransactionOptions
): Promise<IndexedDBOperationResult<T>> {
  if (!isIndexedDBAvailable()) {
    return {
      success: false,
      error: new IndexedDBError({
        code: IndexedDBErrorCode.NOT_SUPPORTED,
        message: 'IndexedDB is not available',
        dbName: options.dbName,
        storeName: options.storeName,
        operation: options.operation,
        recoverable: false
      }),
      usedFallback: false
    };
  }

  return withIndexedDBErrorHandler<T>(
    async () => {
      const db = await openDb();

      return new Promise<T>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = storeOperation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    },
    {
      dbName: options.dbName,
      storeName: options.storeName,
      operation: options.operation,
      onError: options.onError
    }
  );
}

/**
 * Execute an IndexedDB write operation with unified error handling.
 * Handles database opening, transaction management, and error recovery.
 *
 * @example
 * ```ts
 * const result = await executeIndexedDBWrite(
 *   openDatabase,
 *   'sessions',
 *   (store) => store.put(sessionData),
 *   { dbName: 'MyDB', storeName: 'sessions', operation: 'saveSession' }
 * );
 * ```
 */
export async function executeIndexedDBWrite<T = void>(
  openDb: () => Promise<IDBDatabase>,
  storeName: string,
  storeOperation: (store: IDBObjectStore) => IDBRequest,
  options: TransactionOptions
): Promise<IndexedDBOperationResult<T>> {
  if (!isIndexedDBAvailable()) {
    return {
      success: false,
      error: new IndexedDBError({
        code: IndexedDBErrorCode.NOT_SUPPORTED,
        message: 'IndexedDB is not available',
        dbName: options.dbName,
        storeName: options.storeName,
        operation: options.operation,
        recoverable: false
      }),
      usedFallback: false
    };
  }

  return withIndexedDBErrorHandler<T>(
    async () => {
      const db = await openDb();

      return new Promise<T>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = storeOperation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    },
    {
      dbName: options.dbName,
      storeName: options.storeName,
      operation: options.operation,
      onError: options.onError
    }
  );
}

/**
 * Execute an IndexedDB read-write operation with a custom transaction callback.
 * Use this for complex operations that need access to the full transaction.
 *
 * @example
 * ```ts
 * const result = await executeIndexedDBTransaction(
 *   openDatabase,
 *   'sessions',
 *   'readwrite',
 *   async (store, transaction) => {
 *     const entry = await promisifyRequest(store.get(key));
 *     entry.accessCount++;
 *     await promisifyRequest(store.put(entry));
 *     return entry;
 *   },
 *   { dbName: 'MyDB', storeName: 'sessions', operation: 'updateAccessCount' }
 * );
 * ```
 */
export async function executeIndexedDBTransaction<T>(
  openDb: () => Promise<IDBDatabase>,
  storeName: string,
  mode: IDBTransactionMode,
  transactionCallback: (store: IDBObjectStore, transaction: IDBTransaction) => Promise<T>,
  options: TransactionOptions
): Promise<IndexedDBOperationResult<T>> {
  if (!isIndexedDBAvailable()) {
    return {
      success: false,
      error: new IndexedDBError({
        code: IndexedDBErrorCode.NOT_SUPPORTED,
        message: 'IndexedDB is not available',
        dbName: options.dbName,
        storeName: options.storeName,
        operation: options.operation,
        recoverable: false
      }),
      usedFallback: false
    };
  }

  return withIndexedDBErrorHandler<T>(
    async () => {
      const db = await openDb();

      try {
        const transaction = db.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        const result = await transactionCallback(store, transaction);

        // Wait for transaction to complete
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });

        return result;
      } finally {
        db.close();
      }
    },
    {
      dbName: options.dbName,
      storeName: options.storeName,
      operation: options.operation,
      onError: options.onError
    }
  );
}

/**
 * Convert an IDBRequest to a Promise.
 * Useful inside executeIndexedDBTransaction for sequential operations.
 */
export function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Create a standard error handler for quota exceeded and corrupt data errors.
 * Returns a callback suitable for the onError option.
 */
export function createRecoveryHandler(
  dbName: string,
  storeName: string,
  openDb: () => Promise<IDBDatabase>,
  cleanupCount = 10
): (error: IndexedDBError) => Promise<void> {
  return async (error: IndexedDBError) => {
    if (error.code === IndexedDBErrorCode.QUOTA_EXCEEDED) {
      try {
        const db = await openDb();
        await cleanupQuota(db, storeName, cleanupCount);
        db.close();
        console.log(`[IndexedDB] Cleaned up ${cleanupCount} entries from ${storeName}`);
      } catch (e) {
        console.error('[IndexedDB] Failed to clean up quota:', e);
      }
    } else if (error.code === IndexedDBErrorCode.CORRUPT_DATA) {
      await reinitializeDatabase(dbName);
    }
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  InMemoryCache,
  getInMemoryCache
};
