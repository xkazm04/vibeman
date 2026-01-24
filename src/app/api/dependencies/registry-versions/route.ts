import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';

/**
 * POST /api/dependencies/registry-versions
 * Fetch latest versions from npm registry for given packages
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

    // Determine registry based on project type
    const registryUrl = getRegistryUrl(projectType);

    // Fetch versions for all packages
    const versionPromises = packages.map(async (packageName: string) => {
      try {
        const version = await fetchLatestVersion(packageName, registryUrl);
        return { packageName, version };
      } catch (error) {
        return { packageName, version: null };
      }
    });

    const results = await Promise.all(versionPromises);

    // Convert to object for easier lookup
    const versionsMap: Record<string, string | null> = {};
    results.forEach(({ packageName, version }) => {
      versionsMap[packageName] = version;
    });

    return NextResponse.json({ versions: versionsMap });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch registry versions', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Get registry URL based on project type
 */
function getRegistryUrl(projectType: string): string {
  switch (projectType) {
    case 'nextjs':
    case 'react':
    case 'nodejs':
      return 'https://registry.npmjs.org';
    case 'python':
    case 'fastapi':
      return 'https://pypi.org/pypi';
    default:
      return 'https://registry.npmjs.org';
  }
}

/**
 * Fetch latest version from npm registry
 */
async function fetchLatestVersion(packageName: string, registryUrl: string): Promise<string | null> {
  // For npm registry
  if (registryUrl === 'https://registry.npmjs.org') {
    const response = await fetch(`${registryUrl}/${packageName}`, {
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch package info: ${response.statusText}`);
    }

    const data = await response.json();
    return data['dist-tags']?.latest || null;
  }

  // For PyPI
  if (registryUrl === 'https://pypi.org/pypi') {
    const response = await fetch(`${registryUrl}/${packageName}/json`, {
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch package info: ${response.statusText}`);
    }

    const data = await response.json();
    return data.info?.version || null;
  }

  return null;
}

export const POST = withObservability(handlePost, '/api/dependencies/registry-versions');
