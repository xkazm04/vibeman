/**
 * CRUD Route Factory
 *
 * Generates GET/POST (list) and GET/PUT/DELETE ([id]) handlers from a config object.
 * Eliminates ~70% boilerplate shared between Questions and Directions API routes:
 *   - projectId extraction & validation
 *   - status filtering & validation
 *   - context-map grouping
 *   - error serialization (including InvalidTransitionError)
 *   - observability wrapping via createRouteHandler
 *   - duplicate ID checks, 404 lookups, delete patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { groupByContextMap } from '@/lib/api-helpers/groupByContextMap';
import { createRouteHandler, type HttpMethod } from '@/lib/api-helpers/createRouteHandler';
import { InvalidTransitionError } from '@/lib/stateMachine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal DB repository contract expected by the factory */
export interface CrudRepository<T> {
  getById(id: string): T | undefined;
  getByProject(projectId: string): T[];
  create(data: Record<string, unknown>): T;
  update(id: string, data: Record<string, unknown>): T | undefined;
  delete(id: string): boolean;
}

/** Config for the list+create route (e.g. /api/questions) */
export interface ListRouteConfig<T> {
  /** Entity name for logs and response keys (e.g. 'question', 'direction') */
  entityName: string;
  /** API endpoint path */
  endpoint: string;
  /** Valid status values for filtering */
  statusValues: string[];
  /** Validate a status string */
  validateStatus: (s: string) => boolean;
  /** ID prefix for auto-generated IDs (e.g. 'question', 'direction') */
  idPrefix: string;

  /** Fetch items based on parsed query params. Return the items array. */
  fetchItems: (projectId: string, params: {
    status: string | null;
    contextMapId: string | null;
    searchParams: URLSearchParams;
  }) => T[];

  /** Fetch counts for the response. Receives projectId, items, and query params. */
  fetchCounts: (projectId: string, items: T[], params: {
    status: string | null;
    contextMapId: string | null;
    searchParams: URLSearchParams;
  }) => Record<string, number>;

  /** Extra fields to include in the list response beyond items/grouped/counts */
  extraListFields?: (projectId: string, items: T[]) => Record<string, unknown>;

  /** Extract and validate required fields from POST body. Return error string or null. */
  validateCreate: (body: Record<string, unknown>) => string | null;

  /** Build the creation payload from the POST body + generated ID */
  buildCreatePayload: (id: string, body: Record<string, unknown>) => Record<string, unknown>;

  /** Hook called after successful creation. Non-throwing — errors are swallowed. */
  afterCreate?: (created: T, body: Record<string, unknown>) => void;

  /** Repository with at minimum getById and create */
  repo: {
    getById: (id: string) => T | null | undefined;
    create: (data: Record<string, unknown>) => T;
  };
}

/** Config for the [id] CRUD route (e.g. /api/questions/[id]) */
export interface EntityRouteConfig<T> {
  /** Entity name for logs and response keys */
  entityName: string;
  /** API endpoint path pattern */
  endpoint: string;

  /** Repository with getById, update, delete */
  repo: {
    getById: (id: string) => T | null | undefined;
    update: (id: string, data: Record<string, unknown>) => T | null | undefined;
    delete: (id: string) => boolean;
  };

  /** Build update payload from request body + existing entity. Return the fields to update. */
  buildUpdatePayload: (body: Record<string, unknown>, existing: T) => Record<string, unknown>;

  /**
   * Optional custom PUT handler for complex update logic (e.g. direction rejection with
   * brain signals). If provided, replaces the default update flow entirely.
   * Return null to fall through to the default update logic.
   */
  customPut?: (
    id: string,
    body: Record<string, unknown>,
    existing: T
  ) => Promise<NextResponse | null>;

  /** Hook called after successful update. Non-throwing. */
  afterUpdate?: (updated: T, body: Record<string, unknown>) => void;

  /** Hook called after successful deletion. Non-throwing. */
  afterDelete?: (entity: T) => void;
}

// ---------------------------------------------------------------------------
// List + Create factory
// ---------------------------------------------------------------------------

type NextRouteHandler = (req: NextRequest) => Promise<NextResponse>;

/**
 * Creates GET and POST handlers for a list/create route.
 *
 * GET: projectId extraction → status validation → fetch → groupByContextMap → response
 * POST: body parsing → validation → duplicate check → create → response
 */
export function createListHandlers<T extends { context_map_id: string; context_map_title: string }>(
  config: ListRouteConfig<T>
): { GET: NextRouteHandler; POST: NextRouteHandler } {
  const {
    entityName,
    endpoint,
    statusValues,
    validateStatus,
    idPrefix,
    fetchItems,
    fetchCounts,
    extraListFields,
    validateCreate,
    buildCreatePayload,
    afterCreate,
    repo,
  } = config;

  const handleGet: NextRouteHandler = async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const contextMapId = searchParams.get('contextMapId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    if (status !== null && !validateStatus(status)) {
      return NextResponse.json(
        { error: `Invalid status '${status}'. Valid values: ${statusValues.join(', ')}` },
        { status: 400 }
      );
    }

    const items = fetchItems(projectId, { status, contextMapId, searchParams });
    const counts = fetchCounts(projectId, items, { status, contextMapId, searchParams });
    const extra = extraListFields ? extraListFields(projectId, items) : {};

    return NextResponse.json({
      success: true,
      items,
      grouped: groupByContextMap(items),
      counts,
      ...extra,
    });
  };

  const handlePost: NextRouteHandler = async (request) => {
    const body = await request.json();

    const validationError = validateCreate(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const id = body.id || `${idPrefix}_${uuidv4()}`;

    // Duplicate ID check
    if (body.id && repo.getById(body.id)) {
      return NextResponse.json(
        { error: `${entityName} with ID '${body.id}' already exists`, code: 'DUPLICATE_ID' },
        { status: 409 }
      );
    }

    const payload = buildCreatePayload(id, body);
    const created = repo.create(payload);

    logger.info(`[API] ${entityName} created:`, { id, context_map_id: body.context_map_id });

    if (afterCreate) {
      try { afterCreate(created, body); } catch { /* must never break main flow */ }
    }

    return NextResponse.json({
      success: true,
      [entityName]: created,
    });
  };

  return {
    GET: createRouteHandler(handleGet, { endpoint, method: 'GET' }),
    POST: createRouteHandler(handlePost, { endpoint, method: 'POST' }),
  };
}

// ---------------------------------------------------------------------------
// Entity [id] CRUD factory
// ---------------------------------------------------------------------------

type NextParamsHandler = (
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) => Promise<NextResponse>;

/**
 * Creates GET, PUT, DELETE handlers for an entity [id] route.
 *
 * GET:    lookup → 404 or return
 * PUT:    lookup → 404 → update (custom or default) → InvalidTransitionError handling
 * DELETE: lookup → 404 → delete → afterDelete hook
 */
export function createEntityHandlers<T>(
  config: EntityRouteConfig<T>
): { GET: NextParamsHandler; PUT: NextParamsHandler; DELETE: NextParamsHandler } {
  const { entityName, endpoint, repo, buildUpdatePayload, customPut, afterUpdate, afterDelete } = config;

  const handleGet: NextParamsHandler = async (_request, { params }) => {
    const { id } = await params;
    const entity = repo.getById(id);

    if (!entity) {
      return NextResponse.json(
        { error: `${entityName} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, [entityName]: entity });
  };

  const handlePut: NextParamsHandler = async (request, { params }) => {
    try {
      const { id } = await params;
      const body = await request.json();

      const existing = repo.getById(id);
      if (!existing) {
        return NextResponse.json(
          { error: `${entityName} not found` },
          { status: 404 }
        );
      }

      // Allow custom PUT logic (e.g. rejection with brain signals)
      if (customPut) {
        const customResponse = await customPut(id, body, existing);
        if (customResponse) return customResponse;
      }

      const updateData = buildUpdatePayload(body, existing);
      const updated = repo.update(id, updateData);

      if (!updated) {
        return NextResponse.json(
          { error: `Failed to update ${entityName}` },
          { status: 500 }
        );
      }

      logger.info(`[API] ${entityName} updated:`, { id });

      if (afterUpdate) {
        try { afterUpdate(updated, body); } catch { /* must never break main flow */ }
      }

      return NextResponse.json({ success: true, [entityName]: updated });
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error; // Re-throw for outer error handler
    }
  };

  const handleDelete: NextParamsHandler = async (_request, { params }) => {
    const { id } = await params;

    const entity = repo.getById(id);
    if (!entity) {
      return NextResponse.json(
        { error: `${entityName} not found` },
        { status: 404 }
      );
    }

    const deleted = repo.delete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: `${entityName} not found` },
        { status: 404 }
      );
    }

    logger.info(`[API] ${entityName} deleted:`, { id });

    if (afterDelete) {
      try { afterDelete(entity); } catch { /* must never break main flow */ }
    }

    return NextResponse.json({ success: true, deleted: true });
  };

  // Wrap with createRouteHandler for observability + error handling.
  // For [id] routes we need to preserve the params signature, so we wrap manually.
  const wrapWithErrorHandling = (
    handler: NextParamsHandler,
    method: HttpMethod
  ): NextParamsHandler => {
    // Register in createRouteHandler for audit, but we handle params ourselves
    const label = `${method} ${endpoint}`;
    return async (req, ctx) => {
      try {
        return await handler(req, ctx);
      } catch (error) {
        logger.error(`[API] ${label} error:`, { error });
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    };
  };

  return {
    GET: wrapWithErrorHandling(handleGet, 'GET'),
    PUT: wrapWithErrorHandling(handlePut, 'PUT'),
    DELETE: wrapWithErrorHandling(handleDelete, 'DELETE'),
  };
}
