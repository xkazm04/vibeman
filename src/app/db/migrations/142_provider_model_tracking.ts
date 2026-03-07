/**
 * Migration 142: Provider/Model Tracking
 * Adds provider and model columns to ideas, implementation_log, and scans tables
 * for multi-CLI provider awareness across the full data lifecycle.
 */

import { addColumnsIfNotExist, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate142ProviderModelTracking(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('providerModelTracking', () => {
    const providerModelColumns = [
      { name: 'provider', definition: 'TEXT' },
      { name: 'model', definition: 'TEXT' },
    ];

    addColumnsIfNotExist(db, 'ideas', providerModelColumns, logger);
    addColumnsIfNotExist(db, 'implementation_log', providerModelColumns, logger);
    addColumnsIfNotExist(db, 'scans', providerModelColumns, logger);

    logger?.info?.('Provider/model tracking columns added');
  }, logger);
}
