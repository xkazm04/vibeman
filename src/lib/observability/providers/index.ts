/**
 * Observability Provider Factory
 * Creates the appropriate provider based on configuration
 */

export * from './types';
export { LocalProvider } from './localProvider';
export { SentryProvider } from './sentryProvider';

import { ObservabilityProvider, ProviderConfig } from './types';
import { LocalProvider } from './localProvider';
import { SentryProvider } from './sentryProvider';

interface FullConfig extends ProviderConfig {
  provider: 'local' | 'sentry';
  sentry_dsn?: string;
}

/**
 * Create an observability provider based on configuration
 */
export function createObservabilityProvider(config: FullConfig): ObservabilityProvider {
  if (config.provider === 'sentry' && config.sentry_dsn) {
    return new SentryProvider({
      ...config,
      dsn: config.sentry_dsn
    });
  }

  return new LocalProvider(config);
}

// Singleton provider instance per project
const providers: Map<string, ObservabilityProvider> = new Map();

/**
 * Get or create a provider for a project
 */
export async function getProviderForProject(
  projectId: string,
  config: FullConfig
): Promise<ObservabilityProvider> {
  const existing = providers.get(projectId);
  if (existing) {
    return existing;
  }

  const provider = createObservabilityProvider(config);
  await provider.init();
  providers.set(projectId, provider);

  return provider;
}

/**
 * Close all providers (for cleanup)
 */
export async function closeAllProviders(): Promise<void> {
  const closePromises = Array.from(providers.values()).map(p => p.close());
  await Promise.all(closePromises);
  providers.clear();
}
