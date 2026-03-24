/**
 * Unit Tests: Insight Effectiveness Cache
 * Tests cache versioning and invalidation logic
 *
 * Note: These are integration tests with the actual SQLite database.
 * The database connection is shared across all repositories.
 */

import { describe, it, expect } from 'vitest';
import { insightEffectivenessCacheRepository } from '@/app/db/repositories/insight-effectiveness-cache.repository';

describe('Insight Effectiveness Cache', () => {
  describe('Cache Versioning', () => {
    it('should increment version on subsequent writes', () => {
      const projectId = `test-version-${Date.now()}`;
      const minDirections = 3;
      const insights = JSON.stringify([]);
      const summary = JSON.stringify({ overallScore: 0 });

      // First write
      insightEffectivenessCacheRepository.set(projectId, minDirections, 90, insights, summary);
      let cached = insightEffectivenessCacheRepository.get(projectId, minDirections);
      const firstVersion = cached?.version || 0;
      expect(firstVersion).toBeGreaterThan(0);

      // Second write
      insightEffectivenessCacheRepository.set(projectId, minDirections, 90, insights, summary);
      cached = insightEffectivenessCacheRepository.get(projectId, minDirections);
      expect(cached?.version).toBe(firstVersion + 1);

      // Third write
      insightEffectivenessCacheRepository.set(projectId, minDirections, 90, insights, summary);
      cached = insightEffectivenessCacheRepository.get(projectId, minDirections);
      expect(cached?.version).toBe(firstVersion + 2);

      // Cleanup
      insightEffectivenessCacheRepository.invalidate(projectId);
    });

    it('should maintain separate versions per project', () => {
      const project1 = `test-sep-proj-1-${Date.now()}`;
      const project2 = `test-sep-proj-2-${Date.now()}`;
      const insights = JSON.stringify([]);
      const summary = JSON.stringify({ overallScore: 0 });

      // Write to project 1
      insightEffectivenessCacheRepository.set(project1, 3, 90, insights, summary);
      insightEffectivenessCacheRepository.set(project1, 3, 90, insights, summary);

      // Write to project 2
      insightEffectivenessCacheRepository.set(project2, 3, 90, insights, summary);

      const cached1 = insightEffectivenessCacheRepository.get(project1, 3);
      const cached2 = insightEffectivenessCacheRepository.get(project2, 3);

      // Version should increment independently per project
      expect(cached1?.version).toBeGreaterThan((cached2?.version || 0));

      // Cleanup
      insightEffectivenessCacheRepository.invalidate(project1);
      insightEffectivenessCacheRepository.invalidate(project2);
    });

    it('should maintain separate versions per minDirections threshold', () => {
      const projectId = `test-sep-min-${Date.now()}`;
      const insights = JSON.stringify([]);
      const summary = JSON.stringify({ overallScore: 0 });

      // Write with minDirections = 3
      insightEffectivenessCacheRepository.set(projectId, 3, 90, insights, summary);
      insightEffectivenessCacheRepository.set(projectId, 3, 90, insights, summary);

      // Write with minDirections = 5
      insightEffectivenessCacheRepository.set(projectId, 5, 90, insights, summary);

      const cached3 = insightEffectivenessCacheRepository.get(projectId, 3);
      const cached5 = insightEffectivenessCacheRepository.get(projectId, 5);

      // Different thresholds should have independent versions
      expect(cached3?.version).toBeGreaterThan((cached5?.version || 0));

      // Cleanup
      insightEffectivenessCacheRepository.invalidate(projectId);
    });
  });

  describe('Cache Invalidation', () => {
    it('should clear all cache entries for a project', () => {
      const projectId = `test-inval-all-${Date.now()}`;
      const insights = JSON.stringify([]);
      const summary = JSON.stringify({ overallScore: 0 });

      // Write multiple cache entries
      insightEffectivenessCacheRepository.set(projectId, 3, 90, insights, summary);
      insightEffectivenessCacheRepository.set(projectId, 5, 90, insights, summary);
      insightEffectivenessCacheRepository.set(projectId, 10, 90, insights, summary);

      // Verify entries exist
      expect(insightEffectivenessCacheRepository.get(projectId, 3)).toBeTruthy();
      expect(insightEffectivenessCacheRepository.get(projectId, 5)).toBeTruthy();
      expect(insightEffectivenessCacheRepository.get(projectId, 10)).toBeTruthy();

      // Invalidate
      insightEffectivenessCacheRepository.invalidate(projectId);

      // Verify all entries are cleared
      expect(insightEffectivenessCacheRepository.get(projectId, 3)).toBeNull();
      expect(insightEffectivenessCacheRepository.get(projectId, 5)).toBeNull();
      expect(insightEffectivenessCacheRepository.get(projectId, 10)).toBeNull();
    });

    it('should only invalidate the specified project', () => {
      const project1 = `test-inval-1-${Date.now()}`;
      const project2 = `test-inval-2-${Date.now()}`;
      const insights = JSON.stringify([]);
      const summary = JSON.stringify({ overallScore: 0 });

      // Write to multiple projects
      insightEffectivenessCacheRepository.set(project1, 3, 90, insights, summary);
      insightEffectivenessCacheRepository.set(project2, 3, 90, insights, summary);

      // Invalidate only project-1
      insightEffectivenessCacheRepository.invalidate(project1);

      // Verify project-1 is cleared but project-2 remains
      expect(insightEffectivenessCacheRepository.get(project1, 3)).toBeNull();
      expect(insightEffectivenessCacheRepository.get(project2, 3)).toBeTruthy();

      // Cleanup
      insightEffectivenessCacheRepository.invalidate(project2);
    });

    it('should reset version counter after invalidation', () => {
      const projectId = `test-inval-reset-${Date.now()}`;
      const insights = JSON.stringify([]);
      const summary = JSON.stringify({ overallScore: 0 });

      // Write and increment version
      insightEffectivenessCacheRepository.set(projectId, 3, 90, insights, summary);
      insightEffectivenessCacheRepository.set(projectId, 3, 90, insights, summary);

      // Invalidate
      insightEffectivenessCacheRepository.invalidate(projectId);

      // Write again - version should restart at 1
      insightEffectivenessCacheRepository.set(projectId, 3, 90, insights, summary);
      const cached = insightEffectivenessCacheRepository.get(projectId, 3);
      expect(cached?.version).toBe(1);

      // Cleanup
      insightEffectivenessCacheRepository.invalidate(projectId);
    });
  });

  describe('Cache Data Integrity', () => {
    it('should return cached data correctly', () => {
      const projectId = `test-data-${Date.now()}`;
      const insights = JSON.stringify([{ test: 'data' }]);
      const summary = JSON.stringify({ overallScore: 85 });

      // Write cache entry
      insightEffectivenessCacheRepository.set(projectId, 3, 90, insights, summary);

      // Should return cached data
      const cached = insightEffectivenessCacheRepository.get(projectId, 3);
      expect(cached).toBeTruthy();
      expect(cached?.insightsJson).toBe(insights);
      expect(cached?.summaryJson).toBe(summary);
      expect(cached?.version).toBeGreaterThan(0);
      expect(cached?.cachedAt).toBeTruthy();

      // Cleanup
      insightEffectivenessCacheRepository.invalidate(projectId);
    });
  });
});
