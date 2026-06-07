/**
 * Schema Intelligence composite export — pattern/recommendation/history
 * repositories under one namespace. Lives outside the @/app/db barrel so
 * routes can import it without pulling the entire repository layer into
 * their module graph.
 */
import { closeDatabase } from '../connection';
import {
  queryPatternRepository,
  schemaRecommendationRepository,
  optimizationHistoryRepository,
} from '../repositories/schema-intelligence.repository';

export const schemaIntelligenceDb = {
  patterns: queryPatternRepository,
  recommendations: schemaRecommendationRepository,
  history: optimizationHistoryRepository,
  close: closeDatabase,
};
