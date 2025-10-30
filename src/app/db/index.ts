/**
 * Database Module - Main Entry Point
 * Provides centralized database access with modular architecture
 */

import { getDatabase, closeDatabase } from './connection';
import { initializeTables } from './schema';
import { goalRepository } from './repositories/goal.repository';
import { backlogRepository } from './repositories/backlog.repository';
import { contextGroupRepository } from './repositories/context-group.repository';
import { contextRepository } from './repositories/context.repository';
import { eventRepository } from './repositories/event.repository';
import { scanRepository } from './repositories/scan.repository';
import { ideaRepository } from './repositories/idea.repository';
import { implementationLogRepository } from './repositories/implementation-log.repository';
import { featureRequestRepository } from './repositories/feature-request.repository';

// Export types
export * from './models/types';
export * from './models/feature-request.types';

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
 * Goal Database Operations
 * Handles development goals and objectives
 */
export const goalDb = {
  ...goalRepository,
  close: closeDatabase
};

/**
 * Backlog Database Operations
 * Handles backlog items and proposals
 */
export const backlogDb = {
  ...backlogRepository,
  close: closeDatabase
};

/**
 * Context Group Database Operations
 * Handles organization of contexts into groups
 */
export const contextGroupDb = {
  ...contextGroupRepository,
  close: closeDatabase
};

/**
 * Context Database Operations
 * Handles file contexts and documentation
 */
export const contextDb = {
  ...contextRepository,
  close: closeDatabase
};

/**
 * Event Database Operations
 * Handles system events and logging
 */
export const eventDb = {
  ...eventRepository,
  close: closeDatabase
};

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

/**
 * Implementation Log Database Operations
 * Handles implementation tracking and history
 */
export const implementationLogDb = {
  ...implementationLogRepository,
  close: closeDatabase
};

/**
 * Feature Request Database Operations
 * Handles AI Code Concierge feature requests
 */
export const featureRequestDb = {
  ...featureRequestRepository,
  close: closeDatabase
};

// Cleanup handlers
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    closeDatabase();
  });

  process.on('SIGINT', () => {
    closeDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    closeDatabase();
    process.exit(0);
  });
}
