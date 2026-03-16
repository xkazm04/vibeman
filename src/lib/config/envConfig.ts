/**
 * Centralized Environment Configuration
 *
 * All environment variable reads go through this module.
 * Variables are validated and typed at access time with clear defaults.
 * Server-only variables throw if accessed on the client side.
 *
 * Usage:
 *   import { env } from '@/lib/config/envConfig';
 *   const key = env.anthropicApiKey();
 */

import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isServer(): boolean {
  return typeof window === 'undefined';
}

/** Read an env var, returning undefined when blank. */
function read(name: string): string | undefined {
  const val = process.env[name];
  return val && val.trim() !== '' ? val.trim() : undefined;
}

/** Read an env var or return a default. */
function readOr(name: string, fallback: string): string {
  return read(name) ?? fallback;
}

/** Read an env var, parsing as integer. Returns undefined when missing. */
function readInt(name: string): number | undefined {
  const raw = read(name);
  if (raw === undefined) return undefined;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Read an env var as boolean. Missing = default, 'false'/'0' = false. */
function readBool(name: string, fallback: boolean): boolean {
  const raw = read(name);
  if (raw === undefined) return fallback;
  return raw !== 'false' && raw !== '0';
}

/**
 * Guard that throws when a server-only getter is called on the client.
 * NEXT_PUBLIC_ vars are safe on both sides — everything else is server-only.
 */
function serverOnly(name: string): void {
  if (!isServer()) {
    throw new Error(
      `[envConfig] "${name}" is a server-only variable and cannot be accessed on the client.`
    );
  }
}

// ---------------------------------------------------------------------------
// Exported env namespace
// ---------------------------------------------------------------------------

export const env = {
  // =========================================================================
  // Node / App
  // =========================================================================

  nodeEnv: () => readOr('NODE_ENV', 'development'),

  isProduction: () => read('NODE_ENV') === 'production',

  isDevelopment: () => read('NODE_ENV') !== 'production',

  /** npm package version (injected by Next.js build). */
  packageVersion: () => readOr('npm_package_version', '1.0.0'),

  // =========================================================================
  // App URLs
  // =========================================================================

  /** Client-safe app URL. */
  appUrl: () => readOr('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),

  /** Client-safe API URL. */
  apiUrl: () => readOr('NEXT_PUBLIC_API_URL', 'http://localhost:3000'),

  /** Client-safe base URL for fetch calls. */
  baseUrl: () => readOr('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000'),

  /** Server-side preferred API URL, falls back to NEXT_PUBLIC_API_URL. */
  vibemanApiUrl: () => {
    serverOnly('VIBEMAN_API_URL');
    return read('VIBEMAN_API_URL') ?? readOr('NEXT_PUBLIC_API_URL', 'http://localhost:3000');
  },

  port: () => readInt('PORT') ?? 3000,

  // =========================================================================
  // Database
  // =========================================================================

  dbPath: () => {
    serverOnly('DB_PATH');
    return readOr('DB_PATH', path.join(process.cwd(), 'database', 'goals.db'));
  },

  dbWalMode: () => {
    serverOnly('DB_WAL_MODE');
    return readBool('DB_WAL_MODE', true);
  },

  hotWritesDbPath: () => {
    serverOnly('HOT_WRITES_DB_PATH');
    return read('HOT_WRITES_DB_PATH');
  },

  // =========================================================================
  // LLM Provider API Keys
  // =========================================================================

  anthropicApiKey: () => {
    serverOnly('ANTHROPIC_API_KEY');
    return read('ANTHROPIC_API_KEY');
  },

  anthropicBaseUrl: () => {
    serverOnly('ANTHROPIC_BASE_URL');
    return read('ANTHROPIC_BASE_URL');
  },

  openaiApiKey: () => {
    serverOnly('OPENAI_API_KEY');
    return read('OPENAI_API_KEY');
  },

  openaiBaseUrl: () => {
    serverOnly('OPENAI_BASE_URL');
    return read('OPENAI_BASE_URL');
  },

  geminiApiKey: () => {
    serverOnly('GEMINI_API_KEY');
    return read('GEMINI_API_KEY');
  },

  geminiBaseUrl: () => {
    serverOnly('GEMINI_BASE_URL');
    return readOr('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta');
  },

  groqApiKey: () => {
    serverOnly('GROQ_API_KEY');
    return read('GROQ_API_KEY');
  },

  groqBaseUrl: () => {
    serverOnly('GROQ_BASE_URL');
    return read('GROQ_BASE_URL');
  },

  ollamaBaseUrl: () => readOr('OLLAMA_BASE_URL', 'http://localhost:11434'),

  internalApiBaseUrl: () => {
    serverOnly('INTERNAL_API_BASE_URL');
    return read('INTERNAL_API_BASE_URL');
  },

  // =========================================================================
  // Supabase
  // =========================================================================

  /** Client-safe Supabase URL. */
  supabaseUrl: () =>
    readOr('NEXT_PUBLIC_SUPABASE_URL', 'https://your-project.supabase.co'),

  /** Client-safe Supabase anon key. */
  supabaseAnonKey: () =>
    readOr('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'your-anon-key'),

  supabaseServiceRoleKey: () => {
    serverOnly('SUPABASE_SERVICE_ROLE_KEY');
    return read('SUPABASE_SERVICE_ROLE_KEY');
  },

  /** Returns true when Supabase has a real URL and at least one key set. */
  isSupabaseConfigured: () => {
    const url = read('NEXT_PUBLIC_SUPABASE_URL');
    if (!url || url === 'https://your-project.supabase.co') return false;
    const clientKey = read('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const serverKey = isServer() ? read('SUPABASE_SERVICE_ROLE_KEY') : undefined;
    return !!(clientKey || serverKey);
  },

  // =========================================================================
  // Remote Supabase (server-only)
  // =========================================================================

  remoteSupabaseUrl: () => {
    serverOnly('REMOTE_SUPABASE_URL');
    return read('REMOTE_SUPABASE_URL');
  },

  remoteSupabaseAnonKey: () => {
    serverOnly('REMOTE_SUPABASE_ANON_KEY');
    return read('REMOTE_SUPABASE_ANON_KEY');
  },

  remoteSupabaseServiceRoleKey: () => {
    serverOnly('REMOTE_SUPABASE_SERVICE_ROLE_KEY');
    return read('REMOTE_SUPABASE_SERVICE_ROLE_KEY');
  },

  // =========================================================================
  // GitHub Integration
  // =========================================================================

  githubToken: () => {
    serverOnly('GITHUB_TOKEN');
    return read('GITHUB_TOKEN');
  },

  githubProjectId: () => {
    serverOnly('GITHUB_PROJECT_ID');
    return read('GITHUB_PROJECT_ID');
  },

  githubProjectOwner: () => {
    serverOnly('GITHUB_PROJECT_OWNER');
    return readOr('GITHUB_PROJECT_OWNER', '');
  },

  githubProjectNumber: () => {
    serverOnly('GITHUB_PROJECT_NUMBER');
    return readInt('GITHUB_PROJECT_NUMBER');
  },

  githubStatusFieldId: () => {
    serverOnly('GITHUB_STATUS_FIELD_ID');
    return read('GITHUB_STATUS_FIELD_ID');
  },

  githubTargetDateFieldId: () => {
    serverOnly('GITHUB_TARGET_DATE_FIELD_ID');
    return read('GITHUB_TARGET_DATE_FIELD_ID');
  },

  githubStatusTodoId: () => {
    serverOnly('GITHUB_STATUS_TODO_ID');
    return read('GITHUB_STATUS_TODO_ID');
  },

  githubStatusInProgressId: () => {
    serverOnly('GITHUB_STATUS_IN_PROGRESS_ID');
    return read('GITHUB_STATUS_IN_PROGRESS_ID');
  },

  githubStatusDoneId: () => {
    serverOnly('GITHUB_STATUS_DONE_ID');
    return read('GITHUB_STATUS_DONE_ID');
  },

  githubOwner: () => {
    serverOnly('GITHUB_OWNER');
    return readOr('GITHUB_OWNER', '');
  },

  githubRepo: () => {
    serverOnly('GITHUB_REPO');
    return readOr('GITHUB_REPO', '');
  },

  isGitHubConfigured: () => {
    if (!isServer()) return false;
    return !!read('GITHUB_TOKEN');
  },

  // =========================================================================
  // Voice & Audio
  // =========================================================================

  elevenLabsApiKey: () => {
    serverOnly('ELEVENLABS_API_KEY');
    return read('ELEVENLABS_API_KEY');
  },

  awsNovaRegion: () => {
    serverOnly('AWS_NOVA_REGION');
    return readOr('AWS_NOVA_REGION', 'eu-north-1');
  },

  awsNovaAccessKeyId: () => {
    serverOnly('AWS_NOVA_ACCESS_KEY_ID');
    return read('AWS_NOVA_ACCESS_KEY_ID');
  },

  awsNovaSecretAccessKey: () => {
    serverOnly('AWS_NOVA_SECRET_ACCESS_KEY');
    return read('AWS_NOVA_SECRET_ACCESS_KEY');
  },

  // =========================================================================
  // AI & Image Generation
  // =========================================================================

  leonardoApiKey: () => {
    serverOnly('LEONARDO_API_KEY');
    return read('LEONARDO_API_KEY');
  },

  // =========================================================================
  // Testing & Automation
  // =========================================================================

  browserbaseApiKey: () => {
    serverOnly('BROWSERBASE_API_KEY');
    return read('BROWSERBASE_API_KEY');
  },

  browserbaseProjectId: () => {
    serverOnly('BROWSERBASE_PROJECT_ID');
    return read('BROWSERBASE_PROJECT_ID');
  },

  // =========================================================================
  // Social & Discovery
  // =========================================================================

  grokApiKey: () => {
    serverOnly('GROK_API_KEY');
    return read('GROK_API_KEY') ?? read('XAI_API_KEY');
  },

  socialEncryptionSecret: () => {
    serverOnly('SOCIAL_ENCRYPTION_SECRET');
    return readOr('SOCIAL_ENCRYPTION_SECRET', 'vibeman-social-config-2024');
  },

  // =========================================================================
  // Observability
  // =========================================================================

  observabilityEnabled: () => readBool('OBSERVABILITY_ENABLED', true),

  vibemanProjectId: () =>
    readOr('VIBEMAN_PROJECT_ID', ''),

  vibemanUrl: () => {
    serverOnly('VIBEMAN_URL');
    return read('VIBEMAN_URL');
  },

  // =========================================================================
  // MCP Server
  // =========================================================================

  mcpBaseUrl: () => readOr('VIBEMAN_BASE_URL', 'http://localhost:3000'),

  mcpProjectId: () => readOr('VIBEMAN_PROJECT_ID', ''),

  mcpContextId: () => read('VIBEMAN_CONTEXT_ID'),

  mcpTaskId: () => read('VIBEMAN_TASK_ID'),

  mcpProjectPort: () => readInt('VIBEMAN_PROJECT_PORT'),

  mcpRunScript: () => read('VIBEMAN_RUN_SCRIPT'),

  // =========================================================================
  // Logging
  // =========================================================================

  logLevel: () => readOr('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',

  // =========================================================================
  // Cloud Execution (future)
  // =========================================================================

  executionMode: () => readOr('EXECUTION_MODE', 'local') as 'local' | 'cloud',

  cloudOrchestratorUrl: () => {
    serverOnly('CLOUD_ORCHESTRATOR_URL');
    return read('CLOUD_ORCHESTRATOR_URL');
  },

  cloudApiKey: () => {
    serverOnly('CLOUD_API_KEY');
    return read('CLOUD_API_KEY');
  },
} as const;

// Re-export types for consumers that need them
export type EnvConfig = typeof env;
