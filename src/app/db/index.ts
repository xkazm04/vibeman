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
// Adaptive learning repositories removed - feature deprecated
import {
  debtPatternRepository,
  debtPredictionRepository,
  complexityHistoryRepository,
  opportunityCardRepository,
  preventionActionRepository,
  codeChangeEventRepository,
} from './repositories/debt-prediction.repository';
// Security Intelligence repositories removed - feature deprecated
// Developer Mind-Meld repositories removed - feature deprecated
// Hypothesis Testing repositories removed - feature deprecated
import { standupRepository } from './repositories/standup.repository';
// Red Team repositories removed - feature deprecated
// Focus Mode repositories removed - feature deprecated
// Offload repository removed - migrated to Supabase
import {
  sessionRepository,
  sessionTaskRepository,
} from './repositories/session.repository';
import {
  integrationRepository,
  integrationEventRepository,
  webhookRepository,
} from './repositories/integration.repository';
import { questionRepository } from './repositories/question.repository';
import { directionRepository } from './repositories/direction.repository';
import { hallOfFameRepository } from './repositories/hall-of-fame.repository';
import { observabilityRepository } from './repositories/observability.repository';
import { contextApiRouteRepository } from './repositories/context-api-route.repository';
import { xrayRepository } from './repositories/xray.repository';
import { behavioralSignalRepository } from './repositories/behavioral-signal.repository';
import { directionOutcomeRepository } from './repositories/direction-outcome.repository';
import { brainReflectionRepository } from './repositories/brain-reflection.repository';
import { brainInsightRepository } from './repositories/brain-insight.repository';
import {
  annetteSessionRepository,
  annetteMessageRepository,
  annetteMemoryTopicRepository,
  annettePreferenceRepository,
  annetteAudioCacheRepository,
} from './repositories/annette.repository';
import {
  annetteMemoryRepository,
  annetteKnowledgeNodeRepository,
  annetteKnowledgeEdgeRepository,
  annetteMemoryConsolidationRepository,
} from './repositories/annette-memory.repository';
import { workspaceRepository } from './repositories/workspace.repository';
import { executiveAnalysisRepository } from './repositories/executive-analysis.repository';
import { crossProjectRelationshipRepository } from './repositories/cross-project-relationship.repository';
import { architectureAnalysisRepository } from './repositories/architecture-analysis.repository';
import { projectArchitectureMetadataRepository } from './repositories/project-architecture-metadata.repository';
import { crossTaskPlanRepository } from './repositories/cross-task.repository';
import { groupHealthRepository } from './repositories/group-health.repository';
import { collectiveMemoryRepository } from './repositories/collective-memory.repository';
import {
  personaRepository,
  personaToolDefRepository,
  personaToolRepository,
  personaTriggerRepository,
  personaExecutionRepository,
  personaCredentialRepository,
  credentialEventRepository,
  manualReviewRepository,
  connectorDefinitionRepository,
  personaMessageRepository,
  personaMessageDeliveryRepository,
  personaToolUsageRepository,
} from './repositories/persona.repository';

// Export types
export * from './models/types';
export * from './models/conversation.types';
export * from './models/security-patch.types';
export * from './models/test-scenario.types';
export * from './models/scan-prediction.types';
export * from './models/debt-prediction.types';
// Security Intelligence types removed - feature deprecated
export * from './models/standup.types';
// Offload types removed - migrated to Supabase
export * from './models/session.types';
export * from './models/integration.types';
export * from './models/observability.types';
export * from './models/brain.types';
export * from './models/annette.types';
export * from './models/reflector.types';
export * from './models/cross-project-architecture.types';
export * from './models/cross-task.types';
export * from './models/group-health.types';
export * from './models/collective-memory.types';
export * from './models/persona.types';

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

// Security Intelligence DB exports removed - feature deprecated
// Developer Mind-Meld DB exports removed - feature deprecated
// Hypothesis Testing DB exports removed - feature deprecated


/**
 * Standup Summary Database Operations
 * Manages daily/weekly standup summaries and reports
 */
export const standupDb = {
  ...standupRepository,
  close: closeDatabase,
};

// Red Team DB exports removed - feature deprecated
// Focus Mode DB exports removed - feature deprecated




// Device Pair and Offload Queue removed - migrated to Supabase Realtime

/**
 * Claude Code Session Database Operations
 * Manages Claude Code sessions with --resume flag support
 */
export const sessionDb = {
  // Session operations
  ...sessionRepository,

  // Task operations (flattened for ease of use)
  getTasksBySessionId: sessionTaskRepository.getBySessionId,
  getNextPending: sessionTaskRepository.getNextPending,
  getTaskById: sessionTaskRepository.getById,
  getTaskByTaskId: sessionTaskRepository.getByTaskId,
  updateTaskStatus: sessionTaskRepository.updateStatus,
  getTaskStats: sessionTaskRepository.getStats,

  // Nested access for explicit usage
  tasks: sessionTaskRepository,
  close: closeDatabase,
};


/**
 * Integration Database Operations
 * Manages external service integrations (GitHub, Slack, webhooks, etc.)
 */
export const integrationDb = {
  ...integrationRepository,
  close: closeDatabase,
};

/**
 * Integration Event Database Operations
 * Manages integration event logs and delivery tracking
 */
export const integrationEventDb = {
  ...integrationEventRepository,
  close: closeDatabase,
};

/**
 * Webhook Database Operations
 * Manages custom webhook configurations
 */
export const webhookDb = {
  ...webhookRepository,
  close: closeDatabase,
};


/**
 * Question Database Operations
 * Manages questions for guided idea generation
 * Questions are generated per context_map entry and when answered, auto-create Goals
 */
export const questionDb = {
  ...questionRepository,
  close: closeDatabase,
};

/**
 * Direction Database Operations
 * Manages directions for actionable development guidance
 * Directions are generated per context_map entry and when accepted, create Claude Code requirements
 */
export const directionDb = {
  ...directionRepository,
  close: closeDatabase,
};

/**
 * Hall of Fame Database Operations
 * Manages starred/featured component selections for component showcase
 */
export const hallOfFameDb = {
  ...hallOfFameRepository,
  close: closeDatabase,
};

/**
 * API Observability Database Operations
 * Tracks API endpoint usage, response times, and error rates
 */
export const observabilityDb = {
  ...observabilityRepository,
  close: closeDatabase,
};

/**
 * Context API Route Database Operations
 * Maps API endpoints to contexts for X-Ray visualization and observability
 */
export const contextApiRouteDb = {
  ...contextApiRouteRepository,
  close: closeDatabase,
};

/**
 * X-Ray Event Database Operations
 * Persists API traffic events with context mapping for real-time visualization
 */
export const xrayDb = {
  ...xrayRepository,
  close: closeDatabase,
};

/**
 * Behavioral Signal Database Operations
 * Tracks user behavior patterns (git activity, API usage, context focus)
 */
export const behavioralSignalDb = {
  ...behavioralSignalRepository,
  close: closeDatabase,
};

/**
 * Direction Outcome Database Operations
 * Tracks implementation outcomes for directions (success, failure, reverts)
 */
export const directionOutcomeDb = {
  ...directionOutcomeRepository,
  close: closeDatabase,
};

/**
 * Brain Reflection Database Operations
 * Manages autonomous reflection sessions for pattern learning
 */
export const brainReflectionDb = {
  ...brainReflectionRepository,
  close: closeDatabase,
};

/**
 * Brain Insight Database Operations (first-class insights table)
 */
export const brainInsightDb = {
  ...brainInsightRepository,
  close: closeDatabase,
};

/**
 * Annette 2.0 Database Operations
 * Manages conversation sessions, messages, memory, preferences, and audio cache
 */
export const annetteDb = {
  sessions: annetteSessionRepository,
  messages: annetteMessageRepository,
  topics: annetteMemoryTopicRepository,
  preferences: annettePreferenceRepository,
  audioCache: annetteAudioCacheRepository,
  // Memory System
  memories: annetteMemoryRepository,
  knowledgeNodes: annetteKnowledgeNodeRepository,
  knowledgeEdges: annetteKnowledgeEdgeRepository,
  consolidations: annetteMemoryConsolidationRepository,
  close: closeDatabase,
};

/**
 * Workspace Database Operations
 * Manages workspace-based project grouping and assignment
 */
export const workspaceDb = {
  ...workspaceRepository,
  close: closeDatabase,
};

/**
 * Executive Analysis Database Operations
 * Manages AI-driven executive insight analysis sessions
 */
export const executiveAnalysisDb = {
  ...executiveAnalysisRepository,
  close: closeDatabase,
};

/**
 * Cross-Project Relationship Database Operations
 * Manages workspace-level cross-project relationships for architecture visualization
 */
export const crossProjectRelationshipDb = {
  ...crossProjectRelationshipRepository,
  close: closeDatabase,
};

/**
 * Architecture Analysis Database Operations
 * Manages AI-driven architecture analysis sessions
 */
export const architectureAnalysisDb = {
  ...architectureAnalysisRepository,
  close: closeDatabase,
};

/**
 * Project Architecture Metadata Database Operations
 * Manages project tier, framework, and visualization metadata
 */
export const projectArchitectureMetadataDb = {
  ...projectArchitectureMetadataRepository,
  close: closeDatabase,
};

/**
 * Cross Task Plan Database Operations
 * Manages cross-project requirement analysis and implementation planning
 */
export const crossTaskPlanDb = {
  ...crossTaskPlanRepository,
  close: closeDatabase,
};

/**
 * Group Health Database Operations
 * Manages code health scans for context groups
 */
export const groupHealthDb = {
  ...groupHealthRepository,
  close: closeDatabase,
};

/**
 * Collective Memory Database Operations
 * Cross-session knowledge graph for learned patterns and approaches
 */
export const collectiveMemoryDb = {
  ...collectiveMemoryRepository,
  close: closeDatabase,
};

/**
 * Persona Agent System Database Operations
 * Manages AI persona agents, tools, triggers, executions, and credentials
 */
export const personaDb = {
  personas: personaRepository,
  toolDefs: personaToolDefRepository,
  tools: personaToolRepository,
  triggers: personaTriggerRepository,
  executions: personaExecutionRepository,
  credentials: personaCredentialRepository,
  credentialEvents: credentialEventRepository,
  manualReviews: manualReviewRepository,
  connectors: connectorDefinitionRepository,
  messages: personaMessageRepository,
  messageDeliveries: personaMessageDeliveryRepository,
  toolUsage: personaToolUsageRepository,
  close: closeDatabase,
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
