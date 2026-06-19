/**
 * API Route: Refactor Generate Packages
 *
 * POST /api/refactor/generate-packages - Group detected opportunities into
 * actionable refactoring packages.
 *
 * NOTE: This is a valid-shape stub. The package-generation engine that this
 * route would call does not currently exist in the codebase (the former
 * RefactorWizard lib modules — refactorAnalyzer/wizardOptimizer — are now
 * type-only stubs). The route returns an empty-but-correctly-typed payload so
 * the live store's `generatePackages()` action stops 404-ing and completes
 * cleanly instead of erroring. Wire up real grouping logic here once a
 * package generator is reintroduced.
 *
 * Request body (sent by packagesSlice.generatePackages):
 * {
 *   opportunities: RefactorOpportunity[];
 *   projectPath: string;
 *   selectedFolders: string[];
 *   userPreferences: { provider: string; model: string };
 * }
 *
 * Response (200) — fields read by the store:
 * {
 *   packages: RefactoringPackage[];
 *   context: ProjectContext | null;
 *   dependencyGraph: DependencyGraph | null;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import type {
  RefactoringPackage,
  DependencyGraph,
  ProjectContext,
} from '@/app/features/RefactorWizard/lib/types';
import {
  validateRequiredFields,
  handleApiError,
  extractRequestContext,
} from '@/lib/api-errors';

interface GeneratePackagesRequestBody {
  opportunities?: RefactorOpportunity[];
  projectPath?: string;
  selectedFolders?: string[];
  userPreferences?: { provider?: string; model?: string };
}

interface GeneratePackagesResponse {
  packages: RefactoringPackage[];
  context: ProjectContext | null;
  dependencyGraph: DependencyGraph | null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestContext = extractRequestContext(request);

  try {
    const body = (await request.json()) as GeneratePackagesRequestBody;
    const { projectPath } = body;

    const validationResponse = validateRequiredFields(
      { projectPath },
      ['projectPath']
    );
    if (validationResponse) {
      return validationResponse;
    }

    // The package-generation engine does not exist (the RefactorWizard libs are
    // type-only stubs). Previously this returned an empty 200 payload, so the store
    // set packageGenerationStatus:'completed' with 0 packages — indistinguishable from
    // "no debt found", presenting a dead marquee feature as healthy. Signal it honestly:
    // 501 makes the store's !response.ok path set status:'error' + a message.
    return NextResponse.json(
      {
        error: 'Refactoring package generation is not available — the package generator was removed with the RefactorWizard and has not been reintroduced.',
        notImplemented: true,
      },
      { status: 501 }
    );
  } catch (error) {
    return handleApiError(error, 'refactor generate-packages POST', undefined, requestContext);
  }
}
