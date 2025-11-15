/**
 * Database Module - Main Entry Point
 * Provides centralized database access with modular architecture
 */

import { getDatabase, closeDatabase } from './connection';
import { initializeTables } from './schema';
import { goalRepository } from './repositories/goal.repository';
import { goalCandidateRepository } from './repositories/goal-candidate.repository';
import { backlogRepository } from './repositories/backlog.repository';
import { contextGroupRepository } from './repositories/context-group.repository';
import { contextRepository } from './repositories/context.repository';
import { eventRepository } from './repositories/event.repository';
import { scanRepository } from './repositories/scan.repository';
import { ideaRepository } from './repositories/idea.repository';
import { implementationLogRepository } from './repositories/implementation-log.repository';
import { featureRequestRepository } from './repositories/feature-request.repository';
import { conversationRepository } from './repositories/conversation.repository';
import { techDebtRepository } from './repositories/tech-debt.repository';
import { scanQueueRepository } from './repositories/scanQueue.repository';
import { testSelectorRepository } from './repositories/test-selector.repository';
import {
  testScenarioRepository,
  testExecutionRepository,
  visualDiffRepository
} from './repositories/test-scenario.repository';
import {
  securityScanRepository,
  securityPatchRepository,
  securityPrRepository
} from './repositories/security-patch.repository';
import {
  scanHistoryRepository,
  scanPredictionRepository,
  fileChangePatternRepository,
} from './repositories/scan-prediction.repository';

// Export types
export * from './models/types';
export * from './models/feature-request.types';
export * from './models/conversation.types';
export * from './models/tech-debt.types';
export * from './models/security-patch.types';
export * from './models/test-scenario.types';
export * from './models/scan-prediction.types';

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
 * Goal Candidate Database Operations
 * Handles AI-generated goal suggestions
 */
export const goalCandidateDb = {
  ...goalCandidateRepository,
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

/**
 * Conversation Database Operations
 * Handles Annette's conversation memory
 */
export const conversationDb = {
  ...conversationRepository,
  close: closeDatabase
};

/**
 * Technical Debt Database Operations
 * Handles technical debt tracking and remediation
 */
export const techDebtDb = {
  ...techDebtRepository,
  close: closeDatabase
};

/**
 * Scan Queue Database Operations
 * Handles scan queue, progress tracking, notifications, and file watch config
 */
export const scanQueueDb = {
  ...scanQueueRepository,
  close: closeDatabase
};

/**
 * Test Selector Database Operations
 * Handles test selectors for automated testing
 */
export const testSelectorDb = {
  ...testSelectorRepository,
  close: closeDatabase
};

/**
 * Security Scan Database Operations
 * Handles security vulnerability scans
 */
export const securityScanDb = {
  ...securityScanRepository,
  close: closeDatabase
};

/**
 * Security Patch Database Operations
 * Handles security patches and vulnerability fixes
 */
export const securityPatchDb = {
  ...securityPatchRepository,
  close: closeDatabase
};

/**
 * Security PR Database Operations
 * Handles pull requests for security patches
 */
export const securityPrDb = {
  ...securityPrRepository,
  close: closeDatabase
};

/**
 * Test Scenario Database Operations
 * Handles AI-generated test scenarios
 */
export const testScenarioDb = {
  ...testScenarioRepository,
  close: closeDatabase
};

/**
 * Test Execution Database Operations
 * Handles test run results and execution history
 */
export const testExecutionDb = {
  ...testExecutionRepository,
  close: closeDatabase
};

/**
 * Visual Diff Database Operations
 * Handles screenshot comparison and visual regression
 */
export const visualDiffDb = {
  ...visualDiffRepository,
  close: closeDatabase
};

/**
 * Scan History Database Operations
 * Handles scan execution history tracking
 */
export const scanHistoryDb = {
  ...scanHistoryRepository,
  close: closeDatabase
};

/**
 * Scan Prediction Database Operations
 * Handles AI-generated scan recommendations
 */
export const scanPredictionDb = {
  ...scanPredictionRepository,
  close: closeDatabase
};

/**
 * File Change Pattern Database Operations
 * Handles file change pattern tracking for predictive scheduling
 */
export const fileChangePatternDb = {
  ...fileChangePatternRepository,
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
