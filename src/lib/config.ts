/**
 * @module config
 *
 * Application-wide configuration constants.
 *
 * All values are compile-time constants — they are not read from environment
 * variables or config files. Override them by editing this file directly.
 */

/**
 * Recommended port ranges for different environments.
 *
 * Used by the project creation UI to suggest a default port and by
 * {@link projectDb.getNextAvailablePort} when scanning for a free port.
 *
 * @example
 * ```ts
 * import { DEFAULT_PORT_RANGES } from '@/lib/config';
 * const devPort = DEFAULT_PORT_RANGES.development.start; // 3000
 * ```
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
 * Sensible defaults applied when creating a new project without
 * explicitly providing these fields.
 */
export const DEFAULT_PROJECT_SETTINGS = {
  /** Whether the project supports running multiple instances simultaneously. */
  allowMultipleInstances: false,
  /** Default git branch name. */
  gitBranch: 'main',
  /** Whether to auto-pull on project switch. */
  gitAutoSync: false,
};

/**
 * Hard limits and timeouts used across the application.
 */
export const APP_CONSTANTS = {
  /** Maximum allowed length for a project name. */
  maxProjectNameLength: 50,
  /** Maximum allowed length for a project description. */
  maxDescriptionLength: 200,
  /** Default HTTP / process timeout in milliseconds. */
  defaultTimeout: 30000,
};