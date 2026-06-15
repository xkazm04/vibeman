/**
 * Migration 231: Context categorization metadata
 *
 * Finishes the half-built categorization fields (declared in DbContext but never
 * migrated) and adds the group "domain" axis (business role — distinct from the
 * architecture-layer `type`) plus an explicit relationship_type on group
 * relationships. Enables standardized, comparable context maps and parallel-CLI
 * partitioning.
 */

import type { DbConnection } from '../drivers/types';
import { addColumnsIfNotExist, addColumnIfNotExists, type MigrationLogger } from './migration.utils';

export function migrate231ContextCategorization(db: DbConnection, logger: MigrationLogger) {
  // contexts: technical category, business-feature name, owned API routes
  addColumnsIfNotExist(
    db,
    'contexts',
    [
      { name: 'category', definition: 'TEXT' },
      { name: 'business_feature', definition: 'TEXT' },
      { name: 'api_routes', definition: 'TEXT' },
    ],
    logger
  );

  // context_groups: business/domain axis (distinct from architecture-layer `type`)
  addColumnIfNotExists(db, 'context_groups', 'domain', 'TEXT', logger);

  // context_group_relationships: explicit relationship semantics
  addColumnIfNotExists(db, 'context_group_relationships', 'relationship_type', "TEXT DEFAULT 'uses'", logger);

  logger.info('[Migration 231] Context categorization columns ensured');
}
