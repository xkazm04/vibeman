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
 * Helper to get version comparison styling
 */
function getVersionComparisonStyle(
  comparison: number,
  upToDateStyle: string,
  outdatedStyle: string,
  unknownStyle: string
): string {
  if (comparison === 0) return upToDateStyle;
  if (comparison < 0) return outdatedStyle;
  return unknownStyle;
}

/**
 * Helper to get styled version state (reduces duplication)
 */
function getVersionStateStyle(
  isShared: boolean,
  currentVersion: string | null,
  latestVersion: string | null,
  noVersionStyle: string,
  uniqueStyle: string,
  upToDateStyle: string,
  outdatedStyle: string,
  unknownStyle: string
): string {
  if (!currentVersion) return noVersionStyle;
  if (!isShared) return uniqueStyle;

  if (latestVersion) {
    const comparison = compareVersions(currentVersion, latestVersion);
    return getVersionComparisonStyle(comparison, upToDateStyle, outdatedStyle, unknownStyle);
  }

  return unknownStyle;
}

/**
 * Get version color based on comparison with other projects
 */
export function getVersionColor(
  isShared: boolean,
  currentVersion: string | null,
  latestVersion: string | null
): string {
  return getVersionStateStyle(
    isShared,
    currentVersion,
    latestVersion,
    'text-gray-600',
    'text-gray-300',
    'text-green-400',
    'text-red-400',
    'text-yellow-400'
  );
}

/**
 * Get background color for cell
 */
export function getCellBackground(
  isShared: boolean,
  currentVersion: string | null,
  latestVersion: string | null
): string {
  return getVersionStateStyle(
    isShared,
    currentVersion,
    latestVersion,
    'bg-gray-900/20',
    'bg-gray-800/40',
    'bg-green-500/10',
    'bg-red-500/10',
    'bg-yellow-500/10'
  );
}

/**
 * Check if a package version is outdated
 * Uses semantic versioning comparison (e.g., ^20 equals 20)
 */
export function isPackageOutdated(
  currentVersion: string | null,
  latestVersion: string | null
): boolean {
  if (!currentVersion || !latestVersion) return false;
  // Use semantic version comparison instead of string comparison
  return compareVersions(currentVersion, latestVersion) < 0;
}

/**
 * Common open-source software (OSS) licenses
 */
const OSS_LICENSES = [
  'MIT',
  'Apache-2.0',
  'Apache',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BSD',
  'GPL-2.0',
  'GPL-3.0',
  'LGPL-2.1',
  'LGPL-3.0',
  'ISC',
  'MPL-2.0',
  'CC0-1.0',
  'Unlicense',
  'WTFPL',
  '0BSD',
  'Artistic-2.0',
  'EPL-1.0',
  'EPL-2.0',
  'EUPL-1.2',
  'AGPL-3.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'Python-2.0',
  'PSF',
  'Zlib',
  'BlueOak-1.0.0',
];

/**
 * Licenses that may have restrictions or require careful review
 */
const RESTRICTED_LICENSES = [
  'GPL', // Copyleft - may require derived works to be GPL
  'AGPL', // Network copyleft
  'SSPL', // Server Side Public License
  'Commons Clause', // Not OSI-approved
  'BSL', // Business Source License
  'Elastic License', // Proprietary
  'BUSL', // Business Source License
];

/**
 * License compliance status
 */
export type LicenseStatus = 'oss' | 'restricted' | 'proprietary' | 'unknown';

/**
 * Evaluate if a license string is OSS-compliant
 * Returns the compliance status of the license
 */
export function evaluateLicense(license: string | null | undefined): LicenseStatus {
  if (!license || license.trim() === '' || license === 'UNLICENSED') {
    return 'unknown';
  }

  const normalizedLicense = license.toUpperCase().trim();

  // Check for proprietary indicators
  if (
    normalizedLicense.includes('PROPRIETARY') ||
    normalizedLicense.includes('PRIVATE') ||
    normalizedLicense.includes('ALL RIGHTS RESERVED')
  ) {
    return 'proprietary';
  }

  // Check for restricted licenses
  for (const restricted of RESTRICTED_LICENSES) {
    if (normalizedLicense.includes(restricted.toUpperCase())) {
      return 'restricted';
    }
  }

  // Check for OSS licenses
  for (const oss of OSS_LICENSES) {
    if (normalizedLicense.includes(oss.toUpperCase())) {
      return 'oss';
    }
  }

  // If we can't categorize it, mark as unknown
  return 'unknown';
}

/**
 * Get a human-readable description of the license status
 */
export function getLicenseStatusDescription(status: LicenseStatus): string {
  switch (status) {
    case 'oss':
      return 'Open Source';
    case 'restricted':
      return 'Restricted';
    case 'proprietary':
      return 'Proprietary';
    case 'unknown':
      return 'Unknown License';
  }
}

/**
 * Get color classes for license status badge
 */
export function getLicenseStatusColor(status: LicenseStatus): {
  text: string;
  bg: string;
  border: string;
} {
  switch (status) {
    case 'oss':
      return {
        text: 'text-green-400',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
      };
    case 'restricted':
      return {
        text: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
      };
    case 'proprietary':
      return {
        text: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
      };
    case 'unknown':
      return {
        text: 'text-gray-400',
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
      };
  }
}
