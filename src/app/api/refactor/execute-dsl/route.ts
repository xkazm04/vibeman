/**
 * API Route: Refactor Execute DSL
 *
 * POST /api/refactor/execute-dsl - Execute a refactoring DSL spec against a
 * project.
 *
 * NOTE: This is a valid-shape stub. The DSL execution engine that this route
 * would call does not currently exist in the codebase (the former RefactorWizard
 * lib modules are now type-only stubs). The route returns a well-formed,
 * not-yet-implemented `ExecutionResult` so the live store's `executeDSLSpec()`
 * action stops 404-ing and resolves cleanly instead of throwing. Wire up real
 * execution here once a DSL runner is reintroduced.
 *
 * Request body (sent by dslSlice.executeDSLSpec):
 * {
 *   spec: RefactorSpec;
 *   projectPath: string;
 *   projectId: string;
 * }
 *
 * Response (200) — the store reads `data.result`:
 * {
 *   result: ExecutionResult;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import type { RefactorSpec, ExecutionResult } from '@/app/features/RefactorWizard/lib/dslTypes';
import {
  validateRequiredFields,
  handleApiError,
  extractRequestContext,
} from '@/lib/api-errors';

interface ExecuteDSLRequestBody {
  spec?: RefactorSpec;
  projectPath?: string;
  projectId?: string;
}

interface ExecuteDSLResponse {
  result: ExecutionResult;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestContext = extractRequestContext(request);

  try {
    const body = (await request.json()) as ExecuteDSLRequestBody;
    const { projectPath } = body;

    const validationResponse = validateRequiredFields(
      { projectPath },
      ['projectPath']
    );
    if (validationResponse) {
      return validationResponse;
    }

    const result: ExecutionResult = {
      success: false,
      message: 'DSL execution is not yet implemented on the server.',
      filesModified: [],
      errors: [],
      duration: 0,
    };
    const response: ExecuteDSLResponse = { result };
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, 'refactor execute-dsl POST', undefined, requestContext);
  }
}
