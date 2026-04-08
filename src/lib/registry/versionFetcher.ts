/**
 * Shared registry version fetching logic for NPM and PyPI packages.
 * Used by both the registry-versions API route and the dependency scan route.
 */

export type ProjectType = 'nextjs' | 'react' | 'nodejs' | 'python' | 'fastapi' | 'other';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const PYPI_REGISTRY = 'https://pypi.org/pypi';

/**
 * Get registry URL based on project type
 */
export function getRegistryUrl(projectType: string): string {
  switch (projectType) {
    case 'nextjs':
    case 'react':
    case 'nodejs':
      return NPM_REGISTRY;
    case 'python':
    case 'fastapi':
      return PYPI_REGISTRY;
    default:
      return NPM_REGISTRY;
  }
}

/**
 * Fetch latest version of a single package from its registry
 */
export async function fetchLatestVersion(packageName: string, registryUrl: string): Promise<string | null> {
  if (registryUrl === NPM_REGISTRY) {
    const response = await fetch(`${registryUrl}/${packageName}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch package info: ${response.statusText}`);
    }

    const data = await response.json();
    return data['dist-tags']?.latest || null;
  }

  if (registryUrl === PYPI_REGISTRY) {
    const response = await fetch(`${registryUrl}/${packageName}/json`, {
      headers: { 'Accept': 'application/json' },
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

/**
 * Fetch latest versions for a batch of packages from the appropriate registry.
 * Returns a map of package name to latest version (or null on failure).
 */
export async function fetchRegistryVersions(
  packages: string[],
  projectType: string
): Promise<Record<string, string | null>> {
  const registryUrl = getRegistryUrl(projectType);

  const results = await Promise.all(
    packages.map(async (packageName) => {
      try {
        const version = await fetchLatestVersion(packageName, registryUrl);
        return { packageName, version };
      } catch {
        return { packageName, version: null };
      }
    })
  );

  const versionsMap: Record<string, string | null> = {};
  for (const { packageName, version } of results) {
    versionsMap[packageName] = version;
  }
  return versionsMap;
}
