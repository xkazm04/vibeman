import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.join(__dirname, '..', 'src', 'app/db/repositories');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'app/db/index.ts');

// Metadata for special cases that don't follow the standard pattern
const SPECIAL_CASES = {
  'session.repository.ts': {
    dbName: 'sessionDb',
    structure: `{
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
}`,
    description: 'Claude Code Session Database Operations\n * Manages Claude Code sessions with --resume flag support',
  },
  'annette.repository.ts': {
    dbName: 'annetteDb',
    structure: `{
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
}`,
    description: "Annette 2.0 Database Operations\n * Manages conversation sessions, messages, memory, preferences, and audio cache",
  },
  'persona.repository.ts': {
    dbName: 'personaDb',
    structure: `{
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
  events: personaEventRepository,
  eventSubscriptions: eventSubscriptionRepository,
  designReviews: designReviewRepository,
  designPatterns: designPatternRepository,
  metrics: personaMetricsRepository,
  promptVersions: personaPromptVersionRepository,
  teams: personaTeamRepository,
  teamMembers: personaTeamMemberRepository,
  teamConnections: personaTeamConnectionRepository,
  healingIssues: healingIssueRepository,
  groups: personaGroupRepository,
  memories: personaMemoryRepository,
  close: closeDatabase,
}`,
    description: 'Persona Agent System Database Operations\n * Manages AI persona agents, tools, triggers, executions, and credentials',
  },
  'agent.repository.ts': {
    dbName: 'agentDb',
    structure: `{
  goals: agentGoalRepository,
  steps: agentStepRepository,
  close: closeDatabase,
}`,
    description: 'Autonomous Agent Database Operations\n * Manages goal-driven autonomous execution with step decomposition',
  },
  'schema-intelligence.repository.ts': {
    dbName: 'schemaIntelligenceDb',
    structure: `{
  patterns: queryPatternRepository,
  recommendations: schemaRecommendationRepository,
  history: optimizationHistoryRepository,
  close: closeDatabase,
}`,
    description: 'Schema Intelligence Database Operations\n * Self-optimizing database: query patterns, recommendations, optimization history',
  },
  'annette-memory.repository.ts': {
    skipStandard: true
  },
  'goal-lifecycle.repository.ts': {
    dbName: 'goalLifecycleDb', // Note: current index.ts exports them as goalSignalDb and goalSubGoalDb
    skipStandard: true
  }
};

// Manual additions that don't come from repositories or need specific grouping
const MANUAL_GROUPS = [
  {
    dbName: 'goalDb',
    repo: 'goalRepository',
    description: 'Goal Database Operations\n * Handles development goals and objectives'
  },
  {
    dbName: 'goalCandidateDb',
    repo: 'goalCandidateRepository',
    description: 'Goal Candidate Database Operations\n * Handles AI-generated goal suggestions'
  },
  {
    dbName: 'goalSignalDb',
    repo: 'goalSignalRepository',
    description: 'Goal Signal Database Operations\n * Tracks evidence of goal progress for lifecycle engine'
  },
  {
    dbName: 'goalSubGoalDb',
    repo: 'goalSubGoalRepository',
    description: 'Goal Sub-Goal Database Operations\n * AI-decomposed sub-objectives within goals'
  },
  {
    dbName: 'insightEffectivenessCache',
    repo: 'insightEffectivenessCacheRepository',
    description: 'Insight Effectiveness Cache\n * Caches computed scores to avoid O(n*m) recalculation per request',
    noClose: true
  }
];

const TYPE_EXPORTS = [
  'types',
  'conversation.types',
  'security-patch.types',
  'test-scenario.types',
  'scan-prediction.types',
  'debt-prediction.types',
  'standup.types',
  'session.types',
  'integration.types',
  'observability.types',
  'brain.types',
  'annette.types',
  'reflector.types',
  'cross-project-architecture.types',
  'cross-task.types',
  'group-health.types',
  'collective-memory.types',
  'persona.types',
];

async function generate() {
  const files = fs.readdirSync(REPO_DIR).filter(f => f.endsWith('.repository.ts') && !f.endsWith('.test.ts'));
  
  const imports = new Map();
  const dbExports = [];
  const processedRepos = new Set();

  // Pre-process files to find all exported repositories
  for (const file of files) {
    const content = fs.readFileSync(path.join(REPO_DIR, file), 'utf8');
    const repoMatches = content.matchAll(/export const (\w+Repository) =/g);
    const repos = Array.from(repoMatches).map(m => m[1]);
    
    if (repos.length > 0) {
      imports.set(file, repos);
    }
  }

  // Generate DB exports
  for (const file of files) {
    const repos = imports.get(file) || [];
    const special = SPECIAL_CASES[file];

    if (special) {
      if (special.skipStandard) continue;
      
      dbExports.push({
        name: special.dbName,
        structure: special.structure,
        description: special.description
      });
      repos.forEach(r => processedRepos.add(r));
    } else {
      // Standard case: 1 repo -> 1 Db object
      for (const repo of repos) {
        if (processedRepos.has(repo)) continue;
        
        // Skip repos handled in MANUAL_GROUPS
        if (MANUAL_GROUPS.some(g => g.repo === repo)) continue;

        const dbName = repo.replace('Repository', 'Db');
        dbExports.push({
          name: dbName,
          repo: repo,
          description: repo.replace('Repository', '') + ' Database Operations'
        });
        processedRepos.add(repo);
      }
    }
  }

  // Add manual groups
  MANUAL_GROUPS.forEach(g => {
    dbExports.push({
      name: g.dbName,
      repo: g.repo,
      description: g.description,
      noClose: g.noClose
    });
  });

  // Sort exports by name for consistency
  dbExports.sort((a, b) => a.name.localeCompare(b.name));

  // Build the file content
  let output = `/**
 * Database Module - Main Entry Point
 * Provides centralized database access with modular architecture
 *
 * GENERATED FILE - DO NOT EDIT MANUALLY
 * Run "node scripts/generate-db-index.mjs" to regenerate
 */

import { getDatabase, closeDatabase } from './connection';
import { initializeTables } from './schema';
`;

  // Sort imports by file name
  const sortedImportFiles = Array.from(imports.keys()).sort();
  for (const file of sortedImportFiles) {
    const repos = imports.get(file);
    const importPath = `./repositories/${file.replace('.ts', '')}`;
    output += `import {
  ${repos.join(',\n  ')}
} from '${importPath}';\n`;
  }

  output += `\n// Export types\n`;
  for (const type of TYPE_EXPORTS) {
    output += `export * from './models/${type}';\n`;
  }

  output += `\n// Export connection utilities
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
`;

  for (const exp of dbExports) {
    output += `\n/**
 * ${exp.description.replace('\n', '\n * ')}
 */
export const ${exp.name} = `;
    
    if (exp.structure) {
      output += exp.structure;
    } else {
      output += `{
  ...${exp.repo},`;
      if (!exp.noClose) {
        output += `\n  close: closeDatabase`;
      }
      output += `\n}`;
    }
    output += `;\n`;
  }

  output += `\n// Cleanup handlers
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
`;

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`✅ Successfully generated ${OUTPUT_FILE}`);
}

generate().catch(console.error);
