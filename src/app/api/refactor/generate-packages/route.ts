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

    const response: GeneratePackagesResponse = {
      packages: [],
      context: null,
      dependencyGraph: null,
    };
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, 'refactor generate-packages POST', undefined, requestContext);
  }
}
