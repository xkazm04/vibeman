/**
 * Voice Session Storage using IndexedDB
 * Stores and retrieves voice session data for replay functionality
 *
 * Uses centralized error handling from indexedDBErrors.ts for:
 * - Quota exceeded recovery
 * - Corrupt data recovery
 * - In-memory fallback when IndexedDB is unavailable
 */

import { VoiceSession, VoiceSessionInteraction } from './voicebotTypes';
import {
  IndexedDBError,
  IndexedDBErrorCode,
  withIndexedDBErrorHandler,
  isIndexedDBAvailable,
  getInMemoryCache,
  cleanupQuota,
  reinitializeDatabase
} from './indexedDBErrors';

const DB_NAME = 'AnnetteVoiceSessions';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';

// In-memory fallback cache
const memoryCache = getInMemoryCache<SerializedSession>(DB_NAME, 50);

interface SerializedInteraction {
  id: string;
  timestamp: string;
  userText: string;
  assistantText: string;
  audioUrl?: string;
  sources?: Array<{
    type: 'context' | 'goal' | 'backlog' | 'documentation' | 'idea';
    id: string;
    name: string;
    description?: string;
  }>;
  insights?: string[];
  nextSteps?: string[];
  toolsUsed?: Array<{
    name: string;
    description?: string;
  }>;
  timing?: {
    llmMs?: number;
    ttsMs?: number;
    totalMs?: number;
  };
}

interface SerializedSession {
  id: string;
  projectId: string;
  projectName: string;
  startTime: string;
  endTime?: string;
  interactions: SerializedInteraction[];
  totalInteractions: number;
  conversationId?: string;
}

/**
 * Initialize IndexedDB database with error handling
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new IndexedDBError({
        code: IndexedDBErrorCode.NOT_SUPPORTED,
        message: 'IndexedDB is not available',
        dbName: DB_NAME,
        recoverable: false
      }));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      const error = IndexedDBError.fromDOMException(
        request.error as DOMException,
        { dbName: DB_NAME, operation: 'open' }
      );
      console.error('[VoiceSessionStorage] Failed to open database:', error.message);
      reject(error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create sessions object store if it doesn't exist
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const objectStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });

        // Create indexes for querying
        objectStore.createIndex('projectId', 'projectId', { unique: false });
        objectStore.createIndex('startTime', 'startTime', { unique: false });
        objectStore.createIndex('endTime', 'endTime', { unique: false });
      }
    };

    request.onblocked = () => {
      console.warn('[VoiceSessionStorage] Database upgrade blocked by another connection');
    };
  });
}

/**
 * Serialize VoiceSession for storage (convert Dates to ISO strings)
 */
function serializeSession(session: VoiceSession): SerializedSession {
  return {
    ...session,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime?.toISOString(),
    interactions: session.interactions.map(interaction => ({
      ...interaction,
      timestamp: interaction.timestamp.toISOString(),
    })),
  };
}

/**
 * Deserialize VoiceSession from storage (convert ISO strings to Dates)
 */
function deserializeSession(data: SerializedSession): VoiceSession {
  return {
    ...data,
    startTime: new Date(data.startTime),
    endTime: data.endTime ? new Date(data.endTime) : undefined,
    interactions: data.interactions.map((interaction) => ({
      ...interaction,
      timestamp: new Date(interaction.timestamp),
    })),
  };
}

/**
 * Handle quota exceeded by cleaning up old sessions
 */
async function handleQuotaExceeded(): Promise<void> {
  try {
    const db = await openDatabase();
    await cleanupQuota(db, SESSIONS_STORE, 5);
    db.close();
    console.log('[VoiceSessionStorage] Cleaned up old sessions to free quota');
  } catch (error) {
    console.error('[VoiceSessionStorage] Failed to clean up quota:', error);
  }
}

/**
 * Save a voice session to IndexedDB with error handling
 */
export async function saveVoiceSession(session: VoiceSession): Promise<void> {
  const serialized = serializeSession(session);

  // Always update in-memory cache
  memoryCache.set(session.id, serialized);

  if (!isIndexedDBAvailable()) {
    console.warn('[VoiceSessionStorage] IndexedDB not available, using memory cache only');
    return;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDatabase();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
        const objectStore = transaction.objectStore(SESSIONS_STORE);
        const request = objectStore.put(serialized);

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
      storeName: SESSIONS_STORE,
      operation: 'saveVoiceSession',
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
    console.warn('[VoiceSessionStorage] Failed to save to IndexedDB, using memory cache');
  }
}

/**
 * Get a specific voice session by ID with error handling
 */
export async function getVoiceSession(sessionId: string): Promise<VoiceSession | null> {
  // Check in-memory cache first
  const cached = memoryCache.get(sessionId);
  if (cached) {
    return deserializeSession(cached);
  }

  if (!isIndexedDBAvailable()) {
    return null;
  }

  const result = await withIndexedDBErrorHandler<SerializedSession | null>(
    async () => {
      const db = await openDatabase();

      return new Promise<SerializedSession | null>((resolve, reject) => {
        const transaction = db.transaction([SESSIONS_STORE], 'readonly');
        const objectStore = transaction.objectStore(SESSIONS_STORE);
        const request = objectStore.get(sessionId);

        request.onsuccess = () => {
          resolve(request.result || null);
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
      storeName: SESSIONS_STORE,
      operation: 'getVoiceSession'
    }
  );

  if (result.success && result.data) {
    memoryCache.set(sessionId, result.data);
    return deserializeSession(result.data);
  }

  return null;
}

/**
 * Get all voice sessions for a specific project with error handling
 */
export async function getProjectVoiceSessions(projectId: string): Promise<VoiceSession[]> {
  // Check memory cache for any matching sessions
  const memorySessions = memoryCache.getAll()
    .filter(s => s.projectId === projectId)
    .map(deserializeSession);

  if (!isIndexedDBAvailable()) {
    return memorySessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  const result = await withIndexedDBErrorHandler<SerializedSession[]>(
    async () => {
      const db = await openDatabase();

      return new Promise<SerializedSession[]>((resolve, reject) => {
        const transaction = db.transaction([SESSIONS_STORE], 'readonly');
        const objectStore = transaction.objectStore(SESSIONS_STORE);
        const index = objectStore.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
          resolve(request.result || []);
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
      storeName: SESSIONS_STORE,
      operation: 'getProjectVoiceSessions'
    }
  );

  if (result.success && result.data) {
    // Update memory cache with results
    result.data.forEach(s => memoryCache.set(s.id, s));

    const sessions = result.data.map(deserializeSession);
    // Sort by start time (most recent first)
    return sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  // Fall back to memory cache on error
  return memorySessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

/**
 * Get all voice sessions (across all projects) with error handling
 */
export async function getAllVoiceSessions(): Promise<VoiceSession[]> {
  // Get all from memory cache as fallback
  const memorySessions = memoryCache.getAll().map(deserializeSession);

  if (!isIndexedDBAvailable()) {
    return memorySessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  const result = await withIndexedDBErrorHandler<SerializedSession[]>(
    async () => {
      const db = await openDatabase();

      return new Promise<SerializedSession[]>((resolve, reject) => {
        const transaction = db.transaction([SESSIONS_STORE], 'readonly');
        const objectStore = transaction.objectStore(SESSIONS_STORE);
        const request = objectStore.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
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
      storeName: SESSIONS_STORE,
      operation: 'getAllVoiceSessions'
    }
  );

  if (result.success && result.data) {
    // Update memory cache
    result.data.forEach(s => memoryCache.set(s.id, s));

    const sessions = result.data.map(deserializeSession);
    // Sort by start time (most recent first)
    return sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  // Fall back to memory cache on error
  return memorySessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

/**
 * Delete a voice session with error handling
 */
export async function deleteVoiceSession(sessionId: string): Promise<void> {
  // Always remove from memory cache
  memoryCache.delete(sessionId);

  if (!isIndexedDBAvailable()) {
    return;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDatabase();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
        const objectStore = transaction.objectStore(SESSIONS_STORE);
        const request = objectStore.delete(sessionId);

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
      storeName: SESSIONS_STORE,
      operation: 'deleteVoiceSession'
    }
  );

  if (!result.success) {
    console.warn('[VoiceSessionStorage] Failed to delete from IndexedDB');
  }
}

/**
 * Update an existing voice session
 */
export async function updateVoiceSession(session: VoiceSession): Promise<void> {
  // Same as save - put() will update if exists
  return saveVoiceSession(session);
}

/**
 * Add an interaction to an existing session with error handling
 */
export async function addInteractionToSession(
  sessionId: string,
  interaction: VoiceSessionInteraction
): Promise<void> {
  const session = await getVoiceSession(sessionId);

  if (!session) {
    console.warn(`[VoiceSessionStorage] Session ${sessionId} not found`);
    return;
  }

  session.interactions.push(interaction);
  session.totalInteractions = session.interactions.length;

  await updateVoiceSession(session);
}

/**
 * Clear all voice sessions with error handling
 */
export async function clearAllVoiceSessions(): Promise<void> {
  // Clear memory cache
  memoryCache.clear();

  if (!isIndexedDBAvailable()) {
    return;
  }

  const result = await withIndexedDBErrorHandler<void>(
    async () => {
      const db = await openDatabase();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
        const objectStore = transaction.objectStore(SESSIONS_STORE);
        const request = objectStore.clear();

        request.onsuccess = () => {
          console.log('[VoiceSessionStorage] Cleared all sessions');
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
      storeName: SESSIONS_STORE,
      operation: 'clearAllVoiceSessions'
    }
  );

  if (!result.success) {
    console.warn('[VoiceSessionStorage] Failed to clear IndexedDB');
  }
}

/**
 * Get storage statistics
 */
export async function getVoiceSessionStorageStats(): Promise<{
  totalSessions: number;
  inMemorySessions: number;
  indexedDBAvailable: boolean;
}> {
  const inMemoryCount = memoryCache.size();
  const available = isIndexedDBAvailable();

  if (!available) {
    return {
      totalSessions: inMemoryCount,
      inMemorySessions: inMemoryCount,
      indexedDBAvailable: false
    };
  }

  const result = await withIndexedDBErrorHandler<number>(
    async () => {
      const db = await openDatabase();

      return new Promise<number>((resolve, reject) => {
        const transaction = db.transaction([SESSIONS_STORE], 'readonly');
        const objectStore = transaction.objectStore(SESSIONS_STORE);
        const request = objectStore.count();

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
      dbName: DB_NAME,
      storeName: SESSIONS_STORE,
      operation: 'getStorageStats'
    }
  );

  return {
    totalSessions: result.success ? (result.data || 0) : inMemoryCount,
    inMemorySessions: inMemoryCount,
    indexedDBAvailable: available
  };
}
