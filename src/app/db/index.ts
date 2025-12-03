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
import { contextGroupRelationshipRepository } from './repositories/context-group-relationship.repository';
import { contextRepository } from './repositories/context.repository';
import { eventRepository } from './repositories/event.repository';
import { scanRepository } from './repositories/scan.repository';
import { ideaRepository } from './repositories/idea.repository';
import { implementationLogRepository } from './repositories/implementation-log.repository';
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
import {
  marketplaceUserRepository,
  refactoringPatternRepository,
  patternRatingRepository,
  patternApplicationRepository,
  badgeRepository,
  patternFavoriteRepository,
  patternCollectionRepository,
  patternVersionRepository,
} from './repositories/marketplace.repository';
import {
  ideaExecutionOutcomeRepository,
  scoringWeightRepository,
  scoringThresholdRepository,
} from './repositories/adaptive-learning.repository';
import {
  debtPatternRepository,
  debtPredictionRepository,
  complexityHistoryRepository,
  opportunityCardRepository,
  preventionActionRepository,
  codeChangeEventRepository,
} from './repositories/debt-prediction.repository';
import {
  securityIntelligenceRepository,
  securityAlertRepository,
  staleBranchRepository,
  communitySecurityScoreRepository,
} from './repositories/security-intelligence.repository';
import {
  developerProfileRepository,
  developerDecisionRepository,
  learningInsightRepository,
  codePatternUsageRepository,
  consistencyRuleRepository,
  skillTrackingRepository,
} from './repositories/developer-mind-meld.repository';

// Export types
export * from './models/types';
export * from './models/conversation.types';
export * from './models/tech-debt.types';
export * from './models/security-patch.types';
export * from './models/test-scenario.types';
export * from './models/scan-prediction.types';
export * from './models/marketplace.types';
export * from './models/debt-prediction.types';
export * from './models/security-intelligence.types';

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
 * Context Group Relationship Database Operations
 * Handles connections between context groups for Architecture Explorer
 */
export const contextGroupRelationshipDb = {
  ...contextGroupRelationshipRepository,
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

/**
 * Marketplace User Database Operations
 * Handles marketplace user profiles and reputation
 */
export const marketplaceUserDb = {
  ...marketplaceUserRepository,
  close: closeDatabase
};

/**
 * Refactoring Pattern Database Operations
 * Handles community refactoring patterns
 */
export const refactoringPatternDb = {
  ...refactoringPatternRepository,
  close: closeDatabase
};

/**
 * Pattern Rating Database Operations
 * Handles pattern ratings and reviews
 */
export const patternRatingDb = {
  ...patternRatingRepository,
  close: closeDatabase
};

/**
 * Pattern Application Database Operations
 * Handles pattern application tracking
 */
export const patternApplicationDb = {
  ...patternApplicationRepository,
  close: closeDatabase
};

/**
 * Badge Database Operations
 * Handles badges and achievements
 */
export const badgeDb = {
  ...badgeRepository,
  close: closeDatabase
};

/**
 * Pattern Favorite Database Operations
 * Handles user pattern favorites
 */
export const patternFavoriteDb = {
  ...patternFavoriteRepository,
  close: closeDatabase
};

/**
 * Pattern Collection Database Operations
 * Handles pattern collections
 */
export const patternCollectionDb = {
  ...patternCollectionRepository,
  close: closeDatabase
};

/**
 * Pattern Version Database Operations
 * Handles pattern version history
 */
export const patternVersionDb = {
  ...patternVersionRepository,
  close: closeDatabase
};

/**
 * Idea Execution Outcome Database Operations
 * Tracks idea execution results for adaptive learning
 */
export const ideaExecutionOutcomeDb = {
  ...ideaExecutionOutcomeRepository,
  close: closeDatabase
};

/**
 * Scoring Weight Database Operations
 * Manages adaptive scoring weights per category/scan type
 */
export const scoringWeightDb = {
  ...scoringWeightRepository,
  close: closeDatabase
};

/**
 * Scoring Threshold Database Operations
 * Manages auto-accept/reject/priority thresholds
 */
export const scoringThresholdDb = {
  ...scoringThresholdRepository,
  close: closeDatabase
};

/**
 * Debt Pattern Database Operations
 * Manages learned patterns that predict technical debt
 */
export const debtPatternDb = {
  ...debtPatternRepository,
  close: closeDatabase
};

/**
 * Debt Prediction Database Operations
 * Manages real-time debt predictions for code
 */
export const debtPredictionDb = {
  ...debtPredictionRepository,
  close: closeDatabase
};

/**
 * Complexity History Database Operations
 * Tracks file complexity metrics over time
 */
export const complexityHistoryDb = {
  ...complexityHistoryRepository,
  close: closeDatabase
};

/**
 * Opportunity Card Database Operations
 * Manages real-time refactoring opportunity cards
 */
export const opportunityCardDb = {
  ...opportunityCardRepository,
  close: closeDatabase
};

/**
 * Prevention Action Database Operations
 * Tracks actions taken to prevent debt
 */
export const preventionActionDb = {
  ...preventionActionRepository,
  close: closeDatabase
};

/**
 * Code Change Event Database Operations
 * Tracks code changes for pattern detection
 */
export const codeChangeEventDb = {
  ...codeChangeEventRepository,
  close: closeDatabase
};

/**
 * Security Intelligence Database Operations
 * Manages cross-project security metrics and risk scores
 */
export const securityIntelligenceDb = {
  ...securityIntelligenceRepository,
  close: closeDatabase
};

/**
 * Security Alert Database Operations
 * Manages security alerts and notifications
 */
export const securityAlertDb = {
  ...securityAlertRepository,
  close: closeDatabase
};

/**
 * Stale Branch Database Operations
 * Tracks and manages stale branches across projects
 */
export const staleBranchDb = {
  ...staleBranchRepository,
  close: closeDatabase
};

/**
 * Community Security Score Database Operations
 * Manages community-driven security scoring
 */
export const communitySecurityScoreDb = {
  ...communitySecurityScoreRepository,
  close: closeDatabase
};

/**
 * Developer Profile Database Operations
 * Manages personalized developer profiles for AI learning
 */
export const developerProfileDb = {
  ...developerProfileRepository,
  close: closeDatabase
};

/**
 * Developer Decision Database Operations
 * Tracks developer decisions for preference learning
 */
export const developerDecisionDb = {
  ...developerDecisionRepository,
  close: closeDatabase
};

/**
 * Learning Insight Database Operations
 * Manages AI-generated learning insights
 */
export const learningInsightDb = {
  ...learningInsightRepository,
  close: closeDatabase
};

/**
 * Code Pattern Usage Database Operations
 * Tracks code pattern usage for consistency learning
 */
export const codePatternUsageDb = {
  ...codePatternUsageRepository,
  close: closeDatabase
};

/**
 * Consistency Rule Database Operations
 * Manages consistency rules for code style enforcement
 */
export const consistencyRuleDb = {
  ...consistencyRuleRepository,
  close: closeDatabase
};

/**
 * Skill Tracking Database Operations
 * Tracks developer skill development and areas for improvement
 */
export const skillTrackingDb = {
  ...skillTrackingRepository,
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
