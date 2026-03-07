/**
 * Database Module - Main Entry Point
 * Provides centralized database access with modular architecture
 */

import { getDatabase, closeDatabase } from './connection';
import { closeHotWritesDatabase } from './hot-writes';
import { initializeTables } from './schema';
import { startAggregationWorker, stopAggregationWorker } from '@/lib/db/hotWritesAggregator';
import { goalRepository } from './repositories/goal.repository';
import { goalCandidateRepository } from './repositories/goal-candidate.repository';
// Removed - feature deprecated (backlog)
import { contextGroupRepository } from './repositories/context-group.repository';
import { contextGroupRelationshipRepository } from './repositories/context-group-relationship.repository';
import { contextRepository } from './repositories/context.repository';
import { eventRepository } from './repositories/event.repository';
import { scanRepository } from './repositories/scan.repository';
import { ideaRepository } from './repositories/idea.repository';
import { implementationLogRepository } from './repositories/implementation-log.repository';
// Removed - feature deprecated (conversation)
import { scanQueueRepository } from './repositories/scanQueue.repository';
// Removed - feature deprecated (test-selector)
// Removed - feature deprecated (test-scenario)
// Removed - feature deprecated (security-patch)
// Removed - feature deprecated (scan-prediction)
// Adaptive learning repositories removed - feature deprecated
// Removed - feature deprecated (debt-prediction)
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
import { predictiveIntentRepository } from './repositories/predictive-intent.repository';
import {
  queryPatternRepository,
  schemaRecommendationRepository,
  optimizationHistoryRepository,
} from './repositories/schema-intelligence.repository';
import { scanProfileRepository } from './repositories/scan-profile.repository';
import { ideaDependencyRepository } from './repositories/idea-dependency.repository';
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
import { annetteRapportRepository } from './repositories/annette-rapport.repository';
import { groupHealthRepository } from './repositories/group-health.repository';
import { collectiveMemoryRepository } from './repositories/collective-memory.repository';
import { agentGoalRepository, agentStepRepository } from './repositories/agent.repository';
import { insightEffectivenessCacheRepository } from './repositories/insight-effectiveness-cache.repository';
import { insightInfluenceRepository } from './repositories/insight-influence.repository';
import { directionPreferenceRepository } from './repositories/direction-preference.repository';
import { goalSignalRepository, goalSubGoalRepository } from './repositories/goal-lifecycle.repository';
import { fileWriteQueueRepository } from './repositories/file-write-queue.repository';
import { scanResultRepository } from './repositories/scanResult.repository';
import { triageRuleRepository } from './repositories/triage-rule.repository';

// Export types
export * from './models/types';
// Removed - feature deprecated (conversation, security-patch, test-scenario, scan-prediction, debt-prediction types)
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

// Export connection utilities
export { getDatabase, closeDatabase };
export { getHotWritesDatabase, closeHotWritesDatabase } from './hot-writes';

// Initialize database on first import
let initialized = false;

function ensureInitialized() {
  if (!initialized) {
    initializeTables();
    // Start hot-writes aggregation worker (rolls up obs_api_calls → obs_endpoint_stats)
    startAggregationWorker();
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
 * Goal Signal Database Operations
 * Tracks evidence of goal progress for lifecycle engine
 */
export const goalSignalDb = {
  ...goalSignalRepository,
  close: closeDatabase
};

/**
 * Goal Sub-Goal Database Operations
 * AI-decomposed sub-objectives within goals
 */
export const goalSubGoalDb = {
  ...goalSubGoalRepository,
  close: closeDatabase
};

// Removed - feature deprecated (backlogDb)

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

// Removed - feature deprecated (conversationDb)

/**
 * Scan Queue Database Operations
 * Handles scan queue, progress tracking, notifications, and file watch config
 */
export const scanQueueDb = {
  ...scanQueueRepository,
  close: closeDatabase
};

// Removed - feature deprecated (testSelectorDb)

// Removed - feature deprecated (securityScanDb, securityPatchDb, securityPrDb)

// Removed - feature deprecated (testScenarioDb, testExecutionDb, visualDiffDb)

// Removed - feature deprecated (scanHistoryDb, scanPredictionDb, fileChangePatternDb)

// Removed - feature deprecated (debtPatternDb, debtPredictionDb, complexityHistoryDb, opportunityCardDb, preventionActionDb, codeChangeEventDb)

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
 * Insight Effectiveness Cache
 * Caches computed scores to avoid O(n*m) recalculation per request
 */
export const insightEffectivenessCache = {
  ...insightEffectivenessCacheRepository,
};

/**
 * Insight Influence Log
 * Tracks which insights were shown during direction decisions for causal validation
 */
export const insightInfluenceDb = {
  ...insightInfluenceRepository,
};

/**
 * Direction Preference Profile Cache
 * Caches learned approach preferences from historical pair decisions
 */
export const directionPreferenceDb = {
  ...directionPreferenceRepository,
};

/**
 * Predictive Intent Database Operations
 * Manages context transitions and intent predictions for Markov chain model
 */
export const predictiveIntentDb = {
  ...predictiveIntentRepository,
  close: closeDatabase,
};

/**
 * Schema Intelligence Database Operations
 * Self-optimizing database: query patterns, recommendations, optimization history
 */
export const schemaIntelligenceDb = {
  patterns: queryPatternRepository,
  recommendations: schemaRecommendationRepository,
  history: optimizationHistoryRepository,
  close: closeDatabase,
};

/**
 * Scan Profile Database Operations
 * Goal-driven scan configuration and profile management
 */
export const scanProfileDb = {
  ...scanProfileRepository,
  close: closeDatabase,
};

/**
 * Idea Dependency Database Operations
 * Manages idea relationships (blocks, enables, conflicts_with)
 */
export const ideaDependencyDb = {
  ...ideaDependencyRepository,
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
  rapport: annetteRapportRepository,
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
 * Autonomous Agent Database Operations
 * Manages goal-driven autonomous execution with step decomposition
 */
export const agentDb = {
  goals: agentGoalRepository,
  steps: agentStepRepository,
  close: closeDatabase,
};

/**
 * File Write Queue Database Operations
 * Manages pending file writes with retry logic
 */
export const fileWriteQueueDb = {
  ...fileWriteQueueRepository,
  close: closeDatabase,
};

/**
 * Scan Result Database Operations
 * Persists scan results to SQLite
 */
export const scanResultDb = {
  ...scanResultRepository,
  close: closeDatabase,
};

/**
 * Triage Rule Database Operations
 * Manages auto-triage rules (accept/reject/archive)
 */
export const triageRuleDb = {
  ...triageRuleRepository,
  close: closeDatabase,
};

// Cleanup handlers
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    stopAggregationWorker();
    closeHotWritesDatabase();
    closeDatabase();
  });

  process.on('SIGINT', () => {
    stopAggregationWorker();
    closeHotWritesDatabase();
    closeDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    stopAggregationWorker();
    closeHotWritesDatabase();
    closeDatabase();
    process.exit(0);
  });
}
