/**
 * Voice Session Storage using IndexedDB
 * Stores and retrieves voice session data for replay functionality
 */

import { VoiceSession, VoiceSessionInteraction } from './voicebotTypes';

const DB_NAME = 'AnnetteVoiceSessions';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';

/**
 * Initialize IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
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
  });
}

/**
 * Serialize VoiceSession for storage (convert Dates to ISO strings)
 */
function serializeSession(session: VoiceSession): any {
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
function deserializeSession(data: any): VoiceSession {
  return {
    ...data,
    startTime: new Date(data.startTime),
    endTime: data.endTime ? new Date(data.endTime) : undefined,
    interactions: data.interactions.map((interaction: any) => ({
      ...interaction,
      timestamp: new Date(interaction.timestamp),
    })),
  };
}

/**
 * Save a voice session to IndexedDB
 */
export async function saveVoiceSession(session: VoiceSession): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
    const objectStore = transaction.objectStore(SESSIONS_STORE);
    const serializedSession = serializeSession(session);

    const request = objectStore.put(serializedSession);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save voice session'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get a specific voice session by ID
 */
export async function getVoiceSession(sessionId: string): Promise<VoiceSession | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readonly');
    const objectStore = transaction.objectStore(SESSIONS_STORE);
    const request = objectStore.get(sessionId);

    request.onsuccess = () => {
      if (request.result) {
        resolve(deserializeSession(request.result));
      } else {
        resolve(null);
      }
    };

    request.onerror = () => {
      reject(new Error('Failed to get voice session'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get all voice sessions for a specific project
 */
export async function getProjectVoiceSessions(projectId: string): Promise<VoiceSession[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readonly');
    const objectStore = transaction.objectStore(SESSIONS_STORE);
    const index = objectStore.index('projectId');
    const request = index.getAll(projectId);

    request.onsuccess = () => {
      const sessions = request.result.map(deserializeSession);
      // Sort by start time (most recent first)
      sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      resolve(sessions);
    };

    request.onerror = () => {
      reject(new Error('Failed to get project voice sessions'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get all voice sessions (across all projects)
 */
export async function getAllVoiceSessions(): Promise<VoiceSession[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readonly');
    const objectStore = transaction.objectStore(SESSIONS_STORE);
    const request = objectStore.getAll();

    request.onsuccess = () => {
      const sessions = request.result.map(deserializeSession);
      // Sort by start time (most recent first)
      sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      resolve(sessions);
    };

    request.onerror = () => {
      reject(new Error('Failed to get all voice sessions'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete a voice session
 */
export async function deleteVoiceSession(sessionId: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
    const objectStore = transaction.objectStore(SESSIONS_STORE);
    const request = objectStore.delete(sessionId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete voice session'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Update an existing voice session
 */
export async function updateVoiceSession(session: VoiceSession): Promise<void> {
  // Same as save - put() will update if exists
  return saveVoiceSession(session);
}

/**
 * Add an interaction to an existing session
 */
export async function addInteractionToSession(
  sessionId: string,
  interaction: VoiceSessionInteraction
): Promise<void> {
  const session = await getVoiceSession(sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  session.interactions.push(interaction);
  session.totalInteractions = session.interactions.length;

  await updateVoiceSession(session);
}

/**
 * Clear all voice sessions (use with caution)
 */
export async function clearAllVoiceSessions(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
    const objectStore = transaction.objectStore(SESSIONS_STORE);
    const request = objectStore.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to clear voice sessions'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}
