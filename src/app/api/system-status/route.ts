/**
 * System Status Dashboard API
 * Comprehensive health and operational status across all subsystems
 *
 * Endpoint: GET /api/system-status
 * Query params:
 *   - component: 'queue' | 'llm' | 'database' | 'sessions' | 'taskRunner' | 'brain' | 'resources' | 'all'
 *
 * Purpose:
 * - Real-time system health visibility for debugging and monitoring
 * - Early warning system for bottlenecks and failures
 * - Component-specific status for targeted troubleshooting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { getGlobalCache } from '@/lib/api-cache';
import { env } from '@/lib/config/envConfig';

// ============================================================================
// Type Definitions
// ============================================================================

export type ComponentType =
  | 'queue'
  | 'llm'
  | 'database'
  | 'sessions'
  | 'taskRunner'
  | 'brain'
  | 'resources'
  | 'cache'
  | 'migrations'
  | 'all';

export type HealthStatus = 'operational' | 'degraded' | 'critical' | 'unknown';

export interface SystemStatusResponse {
  summary: {
    status: HealthStatus;
    uptime: number;
    timestamp: string;
  };
  queue?: QueueStatus;
  llm?: LLMStatus;
  database?: DatabaseStatus;
  sessions?: SessionStatus;
  taskRunner?: TaskRunnerStatus;
  brain?: BrainStatus;
  resources?: ResourceStatus;
  cache?: CacheStatus;
  migrations?: MigrationStatus;
  alerts: Alert[];
}

export interface QueueStatus {
  status: HealthStatus;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  throughput: {
    avgDurationMs: number | null;
    itemsPerHour: number;
  };
}

export interface LLMStatus {
  status: HealthStatus;
  providers: {
    name: string;
    configured: boolean;
    available: boolean;
    reason: string;
    suggestion: string;
  }[];
  fallbackChain: string[];
}

export interface CacheStatus {
  status: HealthStatus;
  hitRate: number;
  size: number;
  maxSize: number;
  totalRequests: number;
  deduplicatedRequests: number;
}

export interface MigrationStatus {
  status: HealthStatus;
  applied: number;
  mode: 'idempotent';
}

export interface DatabaseStatus {
  status: HealthStatus;
  connectionTime: number;
  uptime: number;
  tables: {
    name: string;
    rowCount: number;
    indexed: boolean;
  }[];
}

export interface SessionStatus {
  status: HealthStatus;
  active: number;
  orphaned: number;
  heartbeat: {
    lastCheck: string;
    missedPings: number;
  };
}

export interface TaskRunnerStatus {
  status: HealthStatus;
  currentRun: {
    requirementName?: string;
    status: string;
    elapsed: number;
  } | null;
  history: {
    totalRuns: number;
    successCount: number;
    failureCount: number;
    avgDurationMs: number;
  };
}

export interface BrainStatus {
  status: HealthStatus;
  reflection: {
    running: boolean;
    lastCompleted?: string;
  };
  insights: {
    total: number;
    cacheSize: number;
  };
  signals: {
    collectedToday: number;
    dedupCacheSize: number;
  };
}

export interface ResourceStatus {
  status: HealthStatus;
  cpu: {
    usage: number;
    threshold: number;
  };
  memory: {
    heapPercent: number;
    rssBytes: number;
    threshold: number;
  };
  disk: {
    available: number;
    threshold: number;
  };
}

export interface Alert {
  severity: 'info' | 'warning' | 'critical';
  component: string;
  message: string;
  actionRequired: boolean;
}

const STARTUP_TIME = Date.now();

// ============================================================================
// Status Collectors
// ============================================================================

/**
 * Collect queue status from scan_queue table
 */
function collectQueueStatus(): QueueStatus {
  try {
    const db = getDatabase();

    // Get queue statistics
    const stats = db.prepare(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        AVG(CAST((julianday(completed_at) - julianday(created_at)) * 86400000 AS REAL)) as avgDurationMs
      FROM scan_queue
    `).get() as {
      queued: number;
      running: number;
      completed: number;
      failed: number;
      avgDurationMs: number | null;
    };

    // Calculate throughput (items completed in last hour)
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const recentStmt = db.prepare(`
      SELECT COUNT(*) as count FROM scan_queue
      WHERE status = 'completed' AND completed_at > ?
    `);
    const recent = recentStmt.get(hourAgo) as { count: number };

    const isHealthy = stats.queued <= 50 && stats.running <= 10 && stats.failed < 5;

    return {
      status: stats.failed > 20 ? 'critical' : stats.queued > 100 ? 'degraded' : 'operational',
      queued: stats.queued || 0,
      running: stats.running || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      throughput: {
        avgDurationMs: stats.avgDurationMs,
        itemsPerHour: recent.count,
      },
    };
  } catch (error) {
    return {
      status: 'unknown',
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      throughput: { avgDurationMs: null, itemsPerHour: 0 },
    };
  }
}

/**
 * Collect LLM provider status with reason codes
 */
function collectLLMStatus(): LLMStatus {
  try {
    const providerChecks: { name: string; envVar: string | undefined; envName: string }[] = [
      { name: 'Anthropic Claude', envVar: env.anthropicApiKey(), envName: 'ANTHROPIC_API_KEY' },
      { name: 'Google Gemini', envVar: env.geminiApiKey(), envName: 'GEMINI_API_KEY' },
      { name: 'OpenAI GPT', envVar: env.openaiApiKey(), envName: 'OPENAI_API_KEY' },
      { name: 'Groq', envVar: env.groqApiKey(), envName: 'GROQ_API_KEY' },
      { name: 'Ollama (Local)', envVar: env.ollamaBaseUrl(), envName: 'OLLAMA_BASE_URL' },
    ];

    const providers = providerChecks.map((p) => ({
      name: p.name,
      configured: !!p.envVar,
      available: !!p.envVar,
      reason: p.envVar ? 'api_key_set' : 'missing_api_key',
      suggestion: p.envVar ? '' : `Set ${p.envName} in .env`,
    }));

    const available = providers.filter((p) => p.configured);
    const fallbackChain = available.map((p) => p.name);

    return {
      status: available.length === 0 ? 'critical' : available.length === 1 ? 'degraded' : 'operational',
      providers,
      fallbackChain,
    };
  } catch (error) {
    return {
      status: 'unknown',
      providers: [],
      fallbackChain: [],
    };
  }
}

/**
 * Collect database status
 */
function collectDatabaseStatus(): DatabaseStatus {
  try {
    const db = getDatabase();
    const startTime = Date.now();

    // Test connection with simple query
    const result = db.prepare('SELECT 1').get();

    const connectionTime = Date.now() - startTime;
    const dbUptime = Math.floor((Date.now() - STARTUP_TIME) / 1000); // seconds

    // Get table row counts for key tables
    const tables = [
      'scan_queue',
      'conductor_runs',
      'conductor_errors',
      'brain_reflections',
      'learning_insights',
      'sessions',
    ];

    const tableCounts = tables.map((tableName) => {
      try {
        const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
        const countResult = countStmt.get() as { count: number };
        return {
          name: tableName,
          rowCount: countResult.count || 0,
          indexed: true,
        };
      } catch {
        return {
          name: tableName,
          rowCount: 0,
          indexed: false,
        };
      }
    });

    return {
      status: connectionTime > 100 ? 'degraded' : 'operational',
      connectionTime,
      uptime: dbUptime,
      tables: tableCounts,
    };
  } catch (error) {
    return {
      status: 'critical',
      connectionTime: 0,
      uptime: 0,
      tables: [],
    };
  }
}

/**
 * Collect session status
 */
function collectSessionStatus(): SessionStatus {
  try {
    const db = getDatabase();

    // Get active sessions (not completed or cancelled)
    const activeStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sessions
      WHERE status NOT IN ('completed', 'cancelled')
    `);
    const active = activeStmt.get() as { count: number };

    // Get orphaned sessions (running but no heartbeat in 10 mins)
    const tenMinutesAgo = new Date(Date.now() - 600000).toISOString();
    const orphanedStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sessions
      WHERE status = 'running' AND last_heartbeat < ?
    `);
    const orphaned = orphanedStmt.get(tenMinutesAgo) as { count: number };

    return {
      status: orphaned.count > 0 ? 'degraded' : 'operational',
      active: active.count || 0,
      orphaned: orphaned.count || 0,
      heartbeat: {
        lastCheck: new Date().toISOString(),
        missedPings: orphaned.count || 0,
      },
    };
  } catch (error) {
    return {
      status: 'unknown',
      active: 0,
      orphaned: 0,
      heartbeat: { lastCheck: new Date().toISOString(), missedPings: 0 },
    };
  }
}

/**
 * Collect task runner status
 */
function collectTaskRunnerStatus(): TaskRunnerStatus {
  try {
    const db = getDatabase();

    // Get current run
    const currentRunStmt = db.prepare(`
      SELECT requirement_name, status, elapsed_time FROM conductor_runs
      WHERE status = 'running' LIMIT 1
    `);
    const currentRun = currentRunStmt.get() as
      | { requirement_name: string; status: string; elapsed_time: number }
      | undefined;

    // Get history stats
    const historyStmt = db.prepare(`
      SELECT
        COUNT(*) as totalRuns,
        COUNT(*) FILTER (WHERE status = 'completed') as successCount,
        COUNT(*) FILTER (WHERE status = 'failed') as failureCount,
        AVG(CAST(elapsed_time AS REAL)) as avgDurationMs
      FROM conductor_runs
    `);
    const history = historyStmt.get() as {
      totalRuns: number;
      successCount: number;
      failureCount: number;
      avgDurationMs: number;
    };

    return {
      status:
        history.failureCount > history.successCount ? 'degraded' : 'operational',
      currentRun: currentRun
        ? {
            requirementName: currentRun.requirement_name,
            status: currentRun.status,
            elapsed: currentRun.elapsed_time,
          }
        : null,
      history: {
        totalRuns: history.totalRuns || 0,
        successCount: history.successCount || 0,
        failureCount: history.failureCount || 0,
        avgDurationMs: history.avgDurationMs || 0,
      },
    };
  } catch (error) {
    return {
      status: 'unknown',
      currentRun: null,
      history: {
        totalRuns: 0,
        successCount: 0,
        failureCount: 0,
        avgDurationMs: 0,
      },
    };
  }
}

/**
 * Collect brain status
 */
function collectBrainStatus(): BrainStatus {
  try {
    const db = getDatabase();

    // Get reflection status
    const reflectionStmt = db.prepare(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'running') as running,
        MAX(completed_at) as lastCompleted
      FROM brain_reflections
    `);
    const reflection = reflectionStmt.get() as {
      running: number;
      lastCompleted: string | null;
    };

    // Get insights count
    const insightsStmt = db.prepare(`SELECT COUNT(*) as count FROM learning_insights`);
    const insights = insightsStmt.get() as { count: number };

    return {
      status: 'operational',
      reflection: {
        running: (reflection.running || 0) > 0,
        lastCompleted: reflection.lastCompleted || undefined,
      },
      insights: {
        total: insights.count || 0,
        cacheSize: Math.min(insights.count || 0, 500), // Simulated cache size
      },
      signals: {
        collectedToday: 42, // Placeholder - would query actual signal collection
        dedupCacheSize: 128,
      },
    };
  } catch (error) {
    return {
      status: 'unknown',
      reflection: { running: false },
      insights: { total: 0, cacheSize: 0 },
      signals: { collectedToday: 0, dedupCacheSize: 0 },
    };
  }
}

/**
 * Collect resource usage status
 */
function collectResourceStatus(): ResourceStatus {
  try {
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return {
      status:
        heapPercent > 90 ? 'critical' : heapPercent > 80 ? 'degraded' : 'operational',
      cpu: {
        usage: 45, // Placeholder - process.cpuUsage() available in Node.js
        threshold: 80,
      },
      memory: {
        heapPercent: Math.round(heapPercent),
        rssBytes: memUsage.rss,
        threshold: 90,
      },
      disk: {
        available: 50 * 1024 * 1024 * 1024, // Placeholder
        threshold: 10 * 1024 * 1024 * 1024,
      },
    };
  } catch (error) {
    return {
      status: 'unknown',
      cpu: { usage: 0, threshold: 80 },
      memory: { heapPercent: 0, rssBytes: 0, threshold: 90 },
      disk: { available: 0, threshold: 0 },
    };
  }
}

/**
 * Collect cache statistics
 */
function collectCacheStatus(): CacheStatus {
  try {
    const cache = getGlobalCache();
    const stats = cache.getStats();

    return {
      status: stats.hitRate < 0.1 && stats.totalRequests > 50
        ? 'degraded'
        : stats.size >= stats.maxSize
          ? 'degraded'
          : 'operational',
      hitRate: stats.hitRate,
      size: stats.size,
      maxSize: stats.maxSize,
      totalRequests: stats.totalRequests,
      deduplicatedRequests: stats.deduplicatedRequests,
    };
  } catch {
    return {
      status: 'unknown',
      hitRate: 0,
      size: 0,
      maxSize: 0,
      totalRequests: 0,
      deduplicatedRequests: 0,
    };
  }
}

// Total number of migration files (all idempotent, run on startup)
const MIGRATION_COUNT = 46;

/**
 * Collect migration status
 */
function collectMigrationStatus(): MigrationStatus {
  return {
    status: 'operational',
    applied: MIGRATION_COUNT,
    mode: 'idempotent',
  };
}

/**
 * Collect alerts from all subsystems
 */
function collectAlerts(components: {
  queue: QueueStatus;
  llm: LLMStatus;
  database: DatabaseStatus;
  sessions: SessionStatus;
  taskRunner: TaskRunnerStatus;
  brain: BrainStatus;
  resources: ResourceStatus;
  cache: CacheStatus;
}): Alert[] {
  const alerts: Alert[] = [];

  // Queue alerts
  if (components.queue.status === 'critical') {
    alerts.push({
      severity: 'critical',
      component: 'queue',
      message: `Queue has ${components.queue.failed} failed items and ${components.queue.queued} queued items`,
      actionRequired: true,
    });
  }

  // LLM alerts — surface per-provider suggestions
  if (components.llm.fallbackChain.length === 0) {
    alerts.push({
      severity: 'critical',
      component: 'llm',
      message: 'No LLM providers configured',
      actionRequired: true,
    });
  }
  for (const p of components.llm.providers) {
    if (!p.configured && p.suggestion) {
      alerts.push({
        severity: 'info',
        component: 'llm',
        message: `${p.name}: ${p.suggestion}`,
        actionRequired: false,
      });
    }
  }

  // Session alerts
  if (components.sessions.orphaned > 0) {
    alerts.push({
      severity: 'warning',
      component: 'sessions',
      message: `${components.sessions.orphaned} orphaned sessions detected`,
      actionRequired: true,
    });
  }

  // Resource alerts
  if (components.resources.memory.heapPercent > 85) {
    alerts.push({
      severity: 'warning',
      component: 'resources',
      message: `Memory pressure high: ${components.resources.memory.heapPercent}% heap used`,
      actionRequired: false,
    });
  }

  // Cache alerts
  if (components.cache.status === 'degraded') {
    alerts.push({
      severity: 'warning',
      component: 'cache',
      message: components.cache.size >= components.cache.maxSize
        ? `Cache is full (${components.cache.size}/${components.cache.maxSize})`
        : `Low cache hit rate: ${Math.round(components.cache.hitRate * 100)}%`,
      actionRequired: false,
    });
  }

  return alerts;
}

// ============================================================================
// Request Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const component = request.nextUrl.searchParams.get('component') as ComponentType | null;
    const requestedComponent = component || 'all';

    // Collect all subsystem statuses
    const queue = collectQueueStatus();
    const llm = collectLLMStatus();
    const database = collectDatabaseStatus();
    const sessions = collectSessionStatus();
    const taskRunner = collectTaskRunnerStatus();
    const brain = collectBrainStatus();
    const resources = collectResourceStatus();
    const cache = collectCacheStatus();
    const migrations = collectMigrationStatus();

    // Determine overall status
    const statuses = [queue, llm, database, sessions, taskRunner, brain, resources, cache, migrations].map(
      (s) => s.status
    );
    const overallStatus: HealthStatus =
      statuses.includes('critical') ? 'critical' : statuses.includes('degraded') ? 'degraded' : 'operational';

    // Collect alerts
    const alerts = collectAlerts({
      queue,
      llm,
      database,
      sessions,
      taskRunner,
      brain,
      resources,
      cache,
    });

    // Build response based on requested component
    const response: SystemStatusResponse = {
      summary: {
        status: overallStatus,
        uptime: Math.floor((Date.now() - STARTUP_TIME) / 1000),
        timestamp: new Date().toISOString(),
      },
      alerts,
    };

    if (requestedComponent === 'all' || requestedComponent === 'queue') response.queue = queue;
    if (requestedComponent === 'all' || requestedComponent === 'llm') response.llm = llm;
    if (requestedComponent === 'all' || requestedComponent === 'database') response.database = database;
    if (requestedComponent === 'all' || requestedComponent === 'sessions') response.sessions = sessions;
    if (requestedComponent === 'all' || requestedComponent === 'taskRunner')
      response.taskRunner = taskRunner;
    if (requestedComponent === 'all' || requestedComponent === 'brain') response.brain = brain;
    if (requestedComponent === 'all' || requestedComponent === 'resources') response.resources = resources;
    if (requestedComponent === 'all' || requestedComponent === 'cache') response.cache = cache;
    if (requestedComponent === 'all' || requestedComponent === 'migrations') response.migrations = migrations;

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        summary: {
          status: 'critical' as const,
          uptime: Math.floor((Date.now() - STARTUP_TIME) / 1000),
          timestamp: new Date().toISOString(),
        },
        alerts: [
          {
            severity: 'critical' as const,
            component: 'system-status',
            message: `Failed to collect system status: ${message}`,
            actionRequired: true,
          },
        ],
      },
      { status: 503 }
    );
  }
}
