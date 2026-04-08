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
import { contextGroupRepository } from './repositories/context-group.repository';
import { contextGroupRelationshipRepository } from './repositories/context-group-relationship.repository';
import { contextRepository } from './repositories/context.repository';
import { eventRepository } from './repositories/event.repository';
import { scanRepository } from './repositories/scan.repository';
import { ideaRepository } from './repositories/idea.repository';
import { implementationLogRepository } from './repositories/implementation-log.repository';
import { scanQueueRepository } from './repositories/scanQueue.repository';
import { standupRepository } from './repositories/standup.repository';
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
import { insightAnnotationRepository } from './repositories/insight-annotation.repository';
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
import { goalSignalRepository, goalSignalSummaryRepository, goalSubGoalRepository } from './repositories/goal-lifecycle.repository';
import { goalCheckinRepository } from './repositories/goal-checkin.repository';
import { goalDependencyRepository } from './repositories/goal-dependency.repository';
import { fileWriteQueueRepository } from './repositories/file-write-queue.repository';
import { scanResultRepository } from './repositories/scanResult.repository';
import { triageRuleRepository } from './repositories/triage-rule.repository';
import { savedViewRepository } from './repositories/saved-view.repository';

// Export types
export * from './models/types';
export * from './models/standup.types';
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
export * from './models/knowledge.types';
export { queryIdeas } from './repositories/ideaQueryBuilder';

// Export connection utilities
export { getDatabase, closeDatabase };
export { getHotWritesDatabase, closeHotWritesDatabase } from './hot-writes';

/**
 * Factory: spreads a repository and appends `close: closeDatabase`.
 * Replaces the repetitive `{ ...repo, close: closeDatabase }` pattern.
 */
function createDbExport<T extends object>(repository: T): T & { close: typeof closeDatabase } {
  return { ...repository, close: closeDatabase };
}

// Initialize database on first import.
// Store flag on globalThis so it survives Next.js HMR module reloads —
// without this, each HMR cycle re-runs initializeTables and spawns a
// duplicate aggregation worker.
// Use a distinct key to prevent TOCTOU race when multiple API routes
// import db/index.ts concurrently during Next.js server startup.
const GLOBAL_DB_INIT_KEY = '__dbInitialized';

function ensureInitialized() {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_DB_INIT_KEY]) {
    // Set flag BEFORE initializing so concurrent callers skip immediately
    g[GLOBAL_DB_INIT_KEY] = true;
    try {
      initializeTables();
      // Start hot-writes aggregation worker (rolls up obs_api_calls -> obs_endpoint_stats)
      startAggregationWorker();
    } catch (err) {
      // Reset flag so next import retries initialization
      g[GLOBAL_DB_INIT_KEY] = undefined;
      throw err;
    }
  }
}

// Auto-initialize
ensureInitialized();

export const goalDb = createDbExport(goalRepository);
export const goalCandidateDb = createDbExport(goalCandidateRepository);
export const goalSignalDb = createDbExport(goalSignalRepository);
export const goalSignalSummaryDb = createDbExport(goalSignalSummaryRepository);
export const goalSubGoalDb = createDbExport(goalSubGoalRepository);
export const goalCheckinDb = createDbExport(goalCheckinRepository);
export const goalDependencyDb = createDbExport(goalDependencyRepository);
export const contextGroupDb = createDbExport(contextGroupRepository);
export const contextGroupRelationshipDb = createDbExport(contextGroupRelationshipRepository);
export const contextDb = createDbExport(contextRepository);
export const eventDb = createDbExport(eventRepository);
export const scanDb = createDbExport(scanRepository);
export const ideaDb = createDbExport(ideaRepository);
export const implementationLogDb = createDbExport(implementationLogRepository);
export const scanQueueDb = createDbExport(scanQueueRepository);
export const standupDb = createDbExport(standupRepository);

export const sessionDb = createDbExport({
  ...sessionRepository,
  getTasksBySessionId: sessionTaskRepository.getBySessionId,
  getNextPending: sessionTaskRepository.getNextPending,
  getTaskById: sessionTaskRepository.getById,
  getTaskByTaskId: sessionTaskRepository.getByTaskId,
  updateTaskStatus: sessionTaskRepository.updateStatus,
  getTaskStats: sessionTaskRepository.getStats,
  tasks: sessionTaskRepository,
});

export const integrationDb = createDbExport(integrationRepository);
export const integrationEventDb = createDbExport(integrationEventRepository);
export const webhookDb = createDbExport(webhookRepository);
export const questionDb = createDbExport(questionRepository);
export const directionDb = createDbExport(directionRepository);
export const hallOfFameDb = createDbExport(hallOfFameRepository);
export const observabilityDb = createDbExport(observabilityRepository);
export const contextApiRouteDb = createDbExport(contextApiRouteRepository);
export const xrayDb = createDbExport(xrayRepository);
export const behavioralSignalDb = createDbExport(behavioralSignalRepository);
export const directionOutcomeDb = createDbExport(directionOutcomeRepository);
export const brainReflectionDb = createDbExport(brainReflectionRepository);
export const brainInsightDb = createDbExport(brainInsightRepository);
export const insightAnnotationDb = createDbExport(insightAnnotationRepository);
export const insightEffectivenessCache = createDbExport(insightEffectivenessCacheRepository);
export const insightInfluenceDb = createDbExport(insightInfluenceRepository);
export const directionPreferenceDb = createDbExport(directionPreferenceRepository);
export const predictiveIntentDb = createDbExport(predictiveIntentRepository);

export const schemaIntelligenceDb = createDbExport({
  patterns: queryPatternRepository,
  recommendations: schemaRecommendationRepository,
  history: optimizationHistoryRepository,
});

export const scanProfileDb = createDbExport(scanProfileRepository);
export const ideaDependencyDb = createDbExport(ideaDependencyRepository);

export const annetteDb = createDbExport({
  sessions: annetteSessionRepository,
  messages: annetteMessageRepository,
  topics: annetteMemoryTopicRepository,
  preferences: annettePreferenceRepository,
  audioCache: annetteAudioCacheRepository,
  memories: annetteMemoryRepository,
  knowledgeNodes: annetteKnowledgeNodeRepository,
  knowledgeEdges: annetteKnowledgeEdgeRepository,
  consolidations: annetteMemoryConsolidationRepository,
  rapport: annetteRapportRepository,
});

export const workspaceDb = createDbExport(workspaceRepository);
export const executiveAnalysisDb = createDbExport(executiveAnalysisRepository);
export const crossProjectRelationshipDb = createDbExport(crossProjectRelationshipRepository);
export const architectureAnalysisDb = createDbExport(architectureAnalysisRepository);
export const projectArchitectureMetadataDb = createDbExport(projectArchitectureMetadataRepository);
export const crossTaskPlanDb = createDbExport(crossTaskPlanRepository);
export const groupHealthDb = createDbExport(groupHealthRepository);
export const collectiveMemoryDb = createDbExport(collectiveMemoryRepository);

export const agentDb = createDbExport({
  goals: agentGoalRepository,
  steps: agentStepRepository,
});

export const fileWriteQueueDb = createDbExport(fileWriteQueueRepository);
export const scanResultDb = createDbExport(scanResultRepository);
export const triageRuleDb = createDbExport(triageRuleRepository);
export const savedViewDb = createDbExport(savedViewRepository);

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
