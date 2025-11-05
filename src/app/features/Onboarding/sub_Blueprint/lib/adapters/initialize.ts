/**
 * Adapter Initialization Module
 *
 * Handles automatic registration of all available scan adapters.
 * This module should be called once during application startup.
 */

import { ScanRegistry, getScanRegistry } from './ScanRegistry';
import { getAllNextJSAdapters } from './nextjs';
import { getAllFastAPIAdapters } from './fastapi';

let initialized = false;

/**
 * Initialize and register all available scan adapters
 *
 * This function registers:
 * - NextJS adapters (build, structure, contexts)
 * - FastAPI adapters (build, structure)
 * - Future adapters (Express, React Native, etc.)
 *
 * Call this once during application startup
 */
export function initializeAdapters(debug = false): ScanRegistry {
  if (initialized) {
    console.log('[AdapterInit] Already initialized, returning existing registry');
    return getScanRegistry();
  }

  const registry = getScanRegistry({ debug });

  // Register NextJS adapters
  const nextjsAdapters = getAllNextJSAdapters();
  let results = registry.registerMany(nextjsAdapters);

  // Register FastAPI adapters
  const fastapiAdapters = getAllFastAPIAdapters();
  results = [...results, ...registry.registerMany(fastapiAdapters)];

  // Log registration results
  if (debug) {
    console.log('[AdapterInit] Registration results:', results);
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(
    `[AdapterInit] ✅ Registered ${successCount} adapters (${failCount} failed)`
  );

  if (debug && failCount > 0) {
    const errors = results.filter((r) => !r.success);
    console.error('[AdapterInit] Failed registrations:', errors);
  }

  // TODO: Register Express adapters when ready
  // const expressAdapters = getAllExpressAdapters();
  // registry.registerMany(expressAdapters);

  // TODO: Register React Native adapters when ready
  // const reactNativeAdapters = getAllReactNativeAdapters();
  // registry.registerMany(reactNativeAdapters);

  initialized = true;

  if (debug) {
    console.log('[AdapterInit] Registry stats:', registry.getStats());
  }

  return registry;
}

/**
 * Get the initialized registry (initializes if not done yet)
 */
export function getInitializedRegistry(debug = false): ScanRegistry {
  if (!initialized) {
    return initializeAdapters(debug);
  }
  return getScanRegistry();
}

/**
 * Reset initialization state (mainly for testing)
 */
export function resetInitialization(): void {
  initialized = false;
  ScanRegistry.reset();
  console.log('[AdapterInit] Reset initialization state');
}
