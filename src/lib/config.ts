/**
 * @module config
 *
 * Centralized configuration management for Vibeman.
 *
 * This module is the single entry point for all configuration:
 * - Environment variables (via `env` from envConfig.ts)
 * - Application constants (port ranges, project defaults, limits)
 * - Startup validation (`validateConfig()`)
 * - Typed singleton `config` object
 *
 * Usage:
 *   import { config, env, validateConfig } from '@/lib/config';
 *
 *   // Typed singleton (evaluated once, cached):
 *   config.port        // 3000
 *   config.db.path     // './database/goals.db'
 *   config.debug       // true in development
 *
 *   // Lazy env access (re-reads each call):
 *   env.anthropicApiKey()
 *
 *   // Startup validation (call once at server start):
 *   validateConfig()   // throws if critical vars are invalid
 */

// Re-export env for consumers that need lazy per-call reads
export { env } from '@/lib/config/envConfig';
export type { EnvConfig } from '@/lib/config/envConfig';

import { env } from '@/lib/config/envConfig';

// ---------------------------------------------------------------------------
// Application Constants
// ---------------------------------------------------------------------------

/**
 * Default port ranges for different execution environments.
 * Used by the project manager to assign non-conflicting ports.
 */
export const DEFAULT_PORT_RANGES = {
  /** Local development servers (Next.js, Vite, etc.). */
  development: { start: 3000, end: 3999 },
  /** Production-like preview builds. */
  production: { start: 4000, end: 4999 },
  /** Automated test runners and fixtures. */
  testing: { start: 5000, end: 5999 },
};

/**
 * Sensible defaults applied when creating a new project.
 * Can be overridden per-project via the project settings UI.
 */
export const DEFAULT_PROJECT_SETTINGS = {
  allowMultipleInstances: false,
  gitBranch: 'main',
  gitAutoSync: false,
};

/**
 * Application-wide limits and timeouts.
 */
export const APP_CONSTANTS = {
  maxProjectNameLength: 50,
  maxDescriptionLength: 200,
  defaultTimeout: 30000,
};

// ---------------------------------------------------------------------------
// Configuration Validation
// ---------------------------------------------------------------------------

/** A single validation finding from {@link validateConfig}. */
interface ValidationIssue {
  variable: string;
  level: 'error' | 'warning';
  message: string;
}

/**
 * Validate that the environment is correctly configured.
 *
 * - **Errors**: Critical issues that prevent the app from working at all
 *   (e.g. DB_PATH pointing to an unwritable location).
 * - **Warnings**: Missing optional keys that limit functionality
 *   (e.g. no LLM API key means AI features won't work).
 *
 * Call this once at server startup. Throws on errors, logs warnings.
 *
 * Required env vars (must be valid, have defaults):
 *   NODE_ENV, PORT, DB_PATH, DB_WAL_MODE, LOG_LEVEL
 *
 * Recommended env vars (warnings if missing):
 *   At least one LLM API key (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)
 *
 * @returns Object containing any non-fatal warnings found during validation.
 * @throws {Error} If any critical configuration variable is invalid.
 *
 * @example
 * ```ts
 * import { validateConfig } from '@/lib/config';
 *
 * // At server startup:
 * try {
 *   const { warnings } = validateConfig();
 *   if (warnings.length) console.log('Config warnings:', warnings);
 * } catch (err) {
 *   console.error('Invalid config — cannot start:', err.message);
 *   process.exit(1);
 * }
 * ```
 */
export function validateConfig(): { warnings: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  // -- Required: PORT must be a valid number --
  const port = env.port();
  if (port < 1 || port > 65535) {
    issues.push({
      variable: 'PORT',
      level: 'error',
      message: `PORT must be between 1 and 65535, got ${port}`,
    });
  }

  // -- Required: LOG_LEVEL must be a known value --
  const logLevel = env.logLevel();
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    issues.push({
      variable: 'LOG_LEVEL',
      level: 'error',
      message: `LOG_LEVEL must be debug|info|warn|error, got "${logLevel}"`,
    });
  }

  // -- Required: EXECUTION_MODE must be known --
  const execMode = env.executionMode();
  if (!['local', 'cloud'].includes(execMode)) {
    issues.push({
      variable: 'EXECUTION_MODE',
      level: 'error',
      message: `EXECUTION_MODE must be local|cloud, got "${execMode}"`,
    });
  }

  // -- Recommended: at least one LLM provider key --
  const hasAnyLlmKey = !!(
    env.anthropicApiKey() ||
    env.openaiApiKey() ||
    env.geminiApiKey() ||
    env.groqApiKey() ||
    env.internalApiBaseUrl()
  );
  if (!hasAnyLlmKey) {
    issues.push({
      variable: 'ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY / GROQ_API_KEY',
      level: 'warning',
      message:
        'No LLM API key configured. AI features (task execution, analysis, conductor) will not work. ' +
        'Set at least one provider key in .env.local — see .env.example for options.',
    });
  }

  // -- Cloud mode requires orchestrator URL --
  if (execMode === 'cloud' && !env.cloudOrchestratorUrl()) {
    issues.push({
      variable: 'CLOUD_ORCHESTRATOR_URL',
      level: 'error',
      message: 'EXECUTION_MODE=cloud requires CLOUD_ORCHESTRATOR_URL to be set',
    });
  }

  // Separate errors from warnings
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  // Log warnings
  for (const w of warnings) {
    console.warn(`[config] WARNING: ${w.variable} — ${w.message}`);
  }

  // Throw on errors
  if (errors.length > 0) {
    const summary = errors
      .map((e) => `  - ${e.variable}: ${e.message}`)
      .join('\n');
    throw new Error(
      `[config] Configuration validation failed:\n${summary}\n\n` +
        'Check your .env.local file. See .env.example for required variables.'
    );
  }

  return { warnings };
}

// ---------------------------------------------------------------------------
// Typed Config Singleton
// ---------------------------------------------------------------------------

/**
 * Evaluated configuration singleton.
 *
 * Unlike `env` (which re-reads process.env on each call), `config` is
 * evaluated once when first imported and cached. Use `config` for values
 * that don't change at runtime; use `env` for values that may be set
 * dynamically (e.g. in test setups).
 *
 * Server-only properties (db, llm keys, etc.) will throw if accessed
 * on the client — this is enforced by the underlying envConfig guards.
 */
export interface AppConfig {
  /** Current NODE_ENV */
  nodeEnv: string;
  /** True when NODE_ENV !== 'production' */
  debug: boolean;
  /** True when NODE_ENV === 'production' */
  isProduction: boolean;
  /** Server port */
  port: number;
  /** Log verbosity */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** local or cloud execution */
  executionMode: 'local' | 'cloud';

  /** Public URLs (safe on client and server) */
  urls: {
    app: string;
    api: string;
    base: string;
  };

  /** Database configuration (server-only) */
  db: {
    readonly path: string;
    readonly walMode: boolean;
    readonly hotWritesPath: string | undefined;
  };

  /** Available LLM providers (server-only key checks) */
  llm: {
    readonly hasAnthropic: boolean;
    readonly hasOpenai: boolean;
    readonly hasGemini: boolean;
    readonly hasGroq: boolean;
    readonly hasOllama: boolean;
    readonly hasInternal: boolean;
    readonly ollamaBaseUrl: string;
  };

  /** Integration status flags */
  integrations: {
    readonly supabase: boolean;
    readonly github: boolean;
    readonly observability: boolean;
  };

  /** Application constants */
  constants: typeof APP_CONSTANTS;
  portRanges: typeof DEFAULT_PORT_RANGES;
  projectDefaults: typeof DEFAULT_PROJECT_SETTINGS;
}

/**
 * Returns `true` when running on the server (Node.js) rather than in a browser.
 * Used to gate server-only config sections like `db` and `llm`.
 */
function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Constructs the singleton {@link AppConfig} object.
 *
 * Server-only sections (`db`, `llm`, `integrations`) use property getters
 * so that importing the config module on the client does not throw — the
 * error is deferred until a server-only property is actually read.
 *
 * @returns Fully populated config object.
 */
function buildConfig(): AppConfig {
  const base = {
    nodeEnv: env.nodeEnv(),
    debug: env.isDevelopment(),
    isProduction: env.isProduction(),
    port: env.port(),
    logLevel: env.logLevel(),
    executionMode: env.executionMode(),

    urls: {
      app: env.appUrl(),
      api: env.apiUrl(),
      base: env.baseUrl(),
    },

    constants: APP_CONSTANTS,
    portRanges: DEFAULT_PORT_RANGES,
    projectDefaults: DEFAULT_PROJECT_SETTINGS,
  };

  // Server-only sections use property getters to avoid throwing on import
  const serverDb = {
    get path() { return env.dbPath(); },
    get walMode() { return env.dbWalMode(); },
    get hotWritesPath() { return env.hotWritesDbPath(); },
  };

  const serverLlm = isServer()
    ? {
        get hasAnthropic() { return !!env.anthropicApiKey(); },
        get hasOpenai() { return !!env.openaiApiKey(); },
        get hasGemini() { return !!env.geminiApiKey(); },
        get hasGroq() { return !!env.groqApiKey(); },
        hasOllama: true, // Ollama is local, always "available"
        get hasInternal() { return !!env.internalApiBaseUrl(); },
        ollamaBaseUrl: env.ollamaBaseUrl(),
      }
    : {
        get hasAnthropic() { return false; },
        get hasOpenai() { return false; },
        get hasGemini() { return false; },
        get hasGroq() { return false; },
        hasOllama: true,
        get hasInternal() { return false; },
        ollamaBaseUrl: env.ollamaBaseUrl(),
      };

  const integrations = {
    get supabase() { return env.isSupabaseConfigured(); },
    get github() { return env.isGitHubConfigured(); },
    observability: env.observabilityEnabled(),
  };

  return {
    ...base,
    db: serverDb,
    llm: serverLlm,
    integrations,
  };
}

/** Singleton config — evaluated once on first import. */
export const config: AppConfig = buildConfig();
