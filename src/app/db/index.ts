/**
 * Database Module - Main Entry Point
 * Provides centralized database access with modular architecture
 */

import { getDatabase, closeDatabase } from './connection';
import { initializeTables } from './schema';
import { scanRepository } from './repositories/scan.repository';
import { ideaRepository } from './repositories/idea.repository';

// Export types
export * from './models/types';

// Export connection utilities
export { getDatabase, closeDatabase };

// Initialize database on first import
let initialized = false;

function ensureInitialized() {
  if (!initialized) {
    initializeTables();
    initialized = true;
  }
}

// Auto-initialize
ensureInitialized();

/**
 * Scan Database Operations
 * Handles scans with LLM token tracking
 */
export const scanDb = {
  ...scanRepository,
  close: closeDatabase
};

/**
 * Idea Database Operations
 * Handles LLM-generated ideas
 */
export const ideaDb = {
  ...ideaRepository,
  close: closeDatabase
};

// Note: Other repositories (goals, contexts, etc.) should be imported from @/lib/database
// This module focuses on scan and idea operations with the new token tracking feature

// Cleanup handlers
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    scanDb.close();
    ideaDb.close();
  });

  process.on('SIGINT', () => {
    scanDb.close();
    ideaDb.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    scanDb.close();
    ideaDb.close();
    process.exit(0);
  });
}
