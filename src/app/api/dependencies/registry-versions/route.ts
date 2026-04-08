import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';
import { fetchRegistryVersions } from '@/lib/registry/versionFetcher';

/**
 * POST /api/dependencies/registry-versions
 * Fetch latest versions from npm/pypi registry for given packages
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { packages, projectType } = body;

    if (!packages || !Array.isArray(packages)) {
      return NextResponse.json(
        { error: 'Packages array is required' },
        { status: 400 }
      );
    }

    const versionsMap = await fetchRegistryVersions(packages, projectType);

    return NextResponse.json({ versions: versionsMap });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch registry versions', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/dependencies/registry-versions');
