/**
 * API Access Control Module
 *
 * Provides role-based access control (RBAC) and resource ownership verification
 * for all API endpoints. Enforces that:
 * - Project IDs are valid (project actually exists in the database)
 * - Resources belong to the claimed project
 * - Operations are permitted for the current access role
 *
 * Design context:
 * This is a localhost-only application (single user), so the role system
 * defaults to 'admin' for all local requests. The infrastructure is built
 * to support multi-user deployment in the future by simply replacing the
 * role resolution logic in `resolveAccessContext()`.
 *
 * Usage:
 *   export const POST = withAccessControl(handlePost, '/api/goals', {
 *     requireProject: 'body',   // Extract projectId from request body
 *     minRole: 'developer',     // Minimum role required
 *   });
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// ROLES & PERMISSIONS
// ============================================================================

export type AccessRole = 'admin' | 'developer' | 'viewer';

/** Role hierarchy — higher index = more privileges */
const ROLE_HIERARCHY: AccessRole[] = ['viewer', 'developer', 'admin'];

/**
 * Check if a role meets the minimum required role level.
 */
export function hasMinimumRole(current: AccessRole, required: AccessRole): boolean {
  return ROLE_HIERARCHY.indexOf(current) >= ROLE_HIERARCHY.indexOf(required);
}

/**
 * Permission definitions per operation type.
 * Maps HTTP methods to minimum required roles.
 */
export const METHOD_PERMISSIONS: Record<string, AccessRole> = {
  GET: 'viewer',
  POST: 'developer',
  PUT: 'developer',
  PATCH: 'developer',
  DELETE: 'admin',
};

// ============================================================================
// ACCESS CONTEXT
// ============================================================================

export interface AccessContext {
  /** The resolved role for the current request */
  role: AccessRole;
  /** The validated project ID (if project was required and resolved) */
  projectId?: string;
  /** Whether the project was verified to exist */
  projectVerified: boolean;
}

/**
 * Resolve the access context for a request.
 *
 * Current implementation: Localhost single-user mode — always returns 'admin'.
 * Future: Extract user identity from auth header/session and look up role.
 *
 * Override via X-Access-Role header in development for testing role restrictions.
 */
export function resolveAccessContext(request: NextRequest): AccessContext {
  let role: AccessRole = 'admin'; // Default: full access for localhost

  // Allow role override in development via header (for testing RBAC)
  if (process.env.NODE_ENV === 'development') {
    const override = request.headers.get('x-access-role');
    if (override && ROLE_HIERARCHY.includes(override as AccessRole)) {
      role = override as AccessRole;
    }
  }

  return { role, projectVerified: false };
}

// ============================================================================
// PROJECT VERIFICATION
// ============================================================================

/**
 * Verify that a project ID corresponds to an actual registered project.
 * Uses lazy import to avoid circular dependency with db module.
 */
export function verifyProjectExists(projectId: string): boolean {
  try {
    // Lazy require to avoid circular imports at module load time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { projectDb } = require('@/lib/project_database');
    const project = projectDb.getProject(projectId);
    return !!project;
  } catch {
    // If project DB isn't available yet (during startup), allow through
    return true;
  }
}

/**
 * Verify multiple project IDs (for workspace/multi-project queries).
 * Returns the list of IDs that are valid.
 */
export function verifyProjectIds(projectIds: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const id of projectIds) {
    if (verifyProjectExists(id)) {
      valid.push(id);
    } else {
      invalid.push(id);
    }
  }

  return { valid, invalid };
}

// ============================================================================
// PROJECT ID EXTRACTION
// ============================================================================

export type ProjectSource =
  | 'query'    // GET ?projectId=xxx
  | 'body'     // POST/PUT body.projectId or body.project_id
  | 'param'    // URL path param (for [id] routes — resolved externally)
  | 'none';    // No project context needed

/**
 * Extract projectId from request based on the specified source.
 */
export async function extractProjectId(
  request: NextRequest,
  source: ProjectSource
): Promise<string | null> {
  if (source === 'none') return null;

  if (source === 'query') {
    const url = new URL(request.url);
    const raw = url.searchParams.get('projectId');
    if (!raw || raw === 'all') return null; // 'all' = no specific project
    // For comma-separated multi-project, return first for verification
    if (raw.includes(',')) return raw.split(',')[0];
    return raw;
  }

  if (source === 'body') {
    try {
      const cloned = request.clone();
      const body = await cloned.json();
      return body.projectId || body.project_id || null;
    } catch {
      return null;
    }
  }

  return null;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

export interface AccessControlOptions {
  /** Where to find the project ID. Default: 'query' for GET, 'body' for POST/PUT/DELETE */
  requireProject?: ProjectSource;
  /** Minimum role required. Default: derived from HTTP method */
  minRole?: AccessRole;
  /** Skip project verification (for routes that don't need it) */
  skipProjectCheck?: boolean;
}

/**
 * Access control middleware wrapper.
 * Composes with withObservability — place it inside:
 *
 *   export const GET = withObservability(
 *     withAccessControl(handleGet, '/api/goals', { requireProject: 'query' }),
 *     '/api/goals'
 *   );
 *
 * Or use standalone:
 *   export const GET = withAccessControl(handleGet, '/api/goals', { requireProject: 'query' });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAccessControl<T extends (request: NextRequest, ...args: any[]) => Promise<NextResponse<any>>>(
  handler: T,
  endpoint: string,
  options: AccessControlOptions = {}
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (request: NextRequest, ...args: any[]) => {
    // 1. Resolve access context (role)
    const ctx = resolveAccessContext(request);

    // 2. Check role permission
    const requiredRole = options.minRole ?? METHOD_PERMISSIONS[request.method] ?? 'viewer';
    if (!hasMinimumRole(ctx.role, requiredRole)) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          required: requiredRole,
          current: ctx.role,
          endpoint,
        },
        { status: 403 }
      );
    }

    // 3. Project verification (if required)
    if (!options.skipProjectCheck) {
      const source = options.requireProject ?? (
        request.method === 'GET' ? 'query' : 'body'
      );

      const projectId = await extractProjectId(request, source);

      if (projectId) {
        if (!verifyProjectExists(projectId)) {
          return NextResponse.json(
            {
              error: 'Project not found',
              projectId,
              endpoint,
            },
            { status: 404 }
          );
        }
        ctx.projectId = projectId;
        ctx.projectVerified = true;
      }
    }

    // 4. Pass through to handler
    return handler(request, ...args);
  }) as T;
}

// ============================================================================
// INLINE HELPERS (for routes that can't use the middleware wrapper)
// ============================================================================

/**
 * Quick inline check for use inside route handlers that already have
 * the projectId extracted. Returns a NextResponse error or null (= OK).
 *
 * @example
 *   const denied = checkProjectAccess(projectId, request);
 *   if (denied) return denied;
 */
export function checkProjectAccess(
  projectId: string,
  request: NextRequest
): NextResponse | null {
  const ctx = resolveAccessContext(request);
  const requiredRole = METHOD_PERMISSIONS[request.method] ?? 'viewer';

  if (!hasMinimumRole(ctx.role, requiredRole)) {
    return NextResponse.json(
      { error: 'Insufficient permissions', required: requiredRole },
      { status: 403 }
    );
  }

  if (!verifyProjectExists(projectId)) {
    return NextResponse.json(
      { error: 'Project not found', projectId },
      { status: 404 }
    );
  }

  return null; // Access granted
}

/**
 * Verify that a resource belongs to the expected project.
 * Use after fetching a resource to ensure it matches the claimed project.
 *
 * @example
 *   const goal = goalDb.getById(goalId);
 *   if (goal && !verifyResourceOwnership(goal.project_id, claimedProjectId)) {
 *     return NextResponse.json({ error: 'Resource does not belong to project' }, { status: 403 });
 *   }
 */
export function verifyResourceOwnership(
  resourceProjectId: string,
  claimedProjectId: string
): boolean {
  return resourceProjectId === claimedProjectId;
}
