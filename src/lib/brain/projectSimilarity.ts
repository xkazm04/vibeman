/**
 * Project Similarity
 * Computes tech stack fingerprints per project and Jaccard similarity between projects.
 * Used for weighted cross-project best practice transfer.
 */

import { contextDb, projectArchitectureMetadataDb } from '@/app/db';

// In-memory cache with 5-minute TTL
const CACHE_TTL_MS = 5 * 60 * 1000;
const fingerprintCache = new Map<string, { fingerprint: Set<string>; ts: number }>();

/**
 * Compute a tech fingerprint for a project by aggregating tech_stack from all
 * contexts plus framework metadata. Result is cached for 5 minutes.
 */
export function computeTechFingerprint(projectId: string): Set<string> {
  const cached = fingerprintCache.get(projectId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.fingerprint;
  }

  const techs = new Set<string>();

  try {
    // Gather tech_stack from all contexts
    const contexts = contextDb.getContextsByProject(projectId);
    for (const ctx of contexts) {
      if (ctx.tech_stack) {
        try {
          const stack: string[] = JSON.parse(ctx.tech_stack);
          for (const t of stack) {
            if (t) techs.add(t.toLowerCase().trim());
          }
        } catch { /* malformed JSON — skip */ }
      }
    }

    // Add framework from project architecture metadata
    try {
      const meta = projectArchitectureMetadataDb.getByProject(projectId);
      if (meta?.framework) {
        techs.add(meta.framework.toLowerCase().trim());
      }
      if (meta?.framework_category) {
        techs.add(meta.framework_category.toLowerCase().trim());
      }
    } catch { /* metadata unavailable — skip */ }
  } catch {
    // Context lookup failed — return empty fingerprint
  }

  fingerprintCache.set(projectId, { fingerprint: techs, ts: Date.now() });
  return techs;
}

/**
 * Compute Jaccard similarity between two tech fingerprints.
 * Returns 0-1 float. Returns 0 if both are empty.
 */
export function computeSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;

  let intersectionSize = 0;
  for (const item of a) {
    if (b.has(item)) intersectionSize++;
  }

  const unionSize = a.size + b.size - intersectionSize;
  if (unionSize === 0) return 0;

  return intersectionSize / unionSize;
}

/**
 * Invalidate cached fingerprint for a project.
 * Call when context data or project metadata changes.
 */
export function invalidateFingerprintCache(projectId: string): void {
  fingerprintCache.delete(projectId);
}
