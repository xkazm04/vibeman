/**
 * Compare semantic versions and return the latest
 * Simplified version comparison - handles basic semver
 */
export function getLatestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  if (versions.length === 1) return versions[0];

  return versions.reduce((latest, current) => {
    if (compareVersions(current, latest) > 0) {
      return current;
    }
    return latest;
  });
}

/**
 * Compare two semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  // Remove any non-numeric prefixes (like ^, ~, >=, etc.)
  const cleanV1 = v1.replace(/[^0-9.]/g, '');
  const cleanV2 = v2.replace(/[^0-9.]/g, '');

  const parts1 = cleanV1.split('.').map(Number);
  const parts2 = cleanV2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

/**
 * Get version color based on comparison with other projects
 */
export function getVersionColor(
  isShared: boolean,
  currentVersion: string | null,
  latestVersion: string | null
): string {
  if (!currentVersion) return 'text-gray-600';
  if (!isShared) return 'text-gray-300'; // Default for unique libraries

  // Compare with latest version
  if (latestVersion && currentVersion === latestVersion) {
    return 'text-green-400'; // Latest version
  } else if (latestVersion && currentVersion !== latestVersion) {
    return 'text-red-400'; // Outdated version
  }

  return 'text-yellow-400'; // Unknown comparison
}

/**
 * Get background color for cell
 */
export function getCellBackground(
  isShared: boolean,
  currentVersion: string | null,
  latestVersion: string | null
): string {
  if (!currentVersion) return 'bg-gray-900/20';
  if (!isShared) return 'bg-gray-800/40';

  if (latestVersion && currentVersion === latestVersion) {
    return 'bg-green-500/10';
  } else if (latestVersion && currentVersion !== latestVersion) {
    return 'bg-red-500/10';
  }

  return 'bg-yellow-500/10';
}

/**
 * Check if a package version is outdated
 */
export function isPackageOutdated(
  currentVersion: string | null,
  latestVersion: string | null
): boolean {
  if (!currentVersion || !latestVersion) return false;
  return currentVersion !== latestVersion;
}
