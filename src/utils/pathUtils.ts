/**
 * Utility functions for normalizing file paths between different formats
 */

/**
 * Normalize path to use forward slashes (Unix format)
 * Converts Windows backslashes to forward slashes
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * FilePath value object — parse once, access semantic properties via getters.
 * Immutable: all properties derived at construction time from a normalized path string.
 */
export class FilePath {
  readonly normalized: string;
  readonly fileName: string;
  readonly extension: string | undefined;
  readonly directory: string;
  readonly isAbsolute: boolean;

  constructor(raw: string) {
    this.normalized = normalizePath(raw);
    const lastSlash = this.normalized.lastIndexOf('/');
    this.fileName = lastSlash >= 0 ? this.normalized.slice(lastSlash + 1) : this.normalized;
    const dotIdx = this.fileName.lastIndexOf('.');
    this.extension = dotIdx > 0 ? this.fileName.slice(dotIdx + 1) : undefined;
    this.directory = lastSlash >= 0 ? this.normalized.slice(0, lastSlash) : '';
    this.isAbsolute = isAbsolutePath(raw);
  }

  get parentFolder(): string {
    const parts = this.normalized.split('/');
    return parts.length > 1 ? parts[parts.length - 2] : '';
  }

  get stem(): string {
    const dotIdx = this.fileName.lastIndexOf('.');
    return dotIdx > 0 ? this.fileName.slice(0, dotIdx) : this.fileName;
  }

  matches(other: string | FilePath): boolean {
    const otherNorm = other instanceof FilePath ? other.normalized : normalizePath(other);
    return this.normalized === otherNorm;
  }

  toString(): string {
    return this.normalized;
  }

  static from(raw: string): FilePath {
    return new FilePath(raw);
  }

  static fromMany(paths: string[]): FilePath[] {
    return paths.map(p => new FilePath(p));
  }
}

/**
 * Browser-compatible path join
 * Joins path segments and normalizes slashes
 */
export function joinPath(...parts: string[]): string {
  return parts
    .join('/')
    .replace(/\/+/g, '/') // Remove duplicate slashes
    .replace(/\\/g, '/'); // Normalize backslashes to forward slashes
}

/**
 * Check if path is absolute (Windows drive letter or Unix root)
 */
export function isAbsolutePath(path: string): boolean {
  return /^[A-Za-z]:[\\\/]/.test(path) || path.startsWith('/');
}

/**
 * Convert path to Windows format (backslashes)
 */
export function toWindowsPath(path: string): string {
  return path.replace(/\//g, '\\');
}

/**
 * Check if two paths are equivalent regardless of slash direction
 */
export function pathsMatch(path1: string, path2: string): boolean {
  return normalizePath(path1) === normalizePath(path2);
}

/**
 * Find matching path in an array, ignoring slash direction
 */
export function findMatchingPath(targetPath: string, pathArray: string[]): string | undefined {
  const normalizedTarget = normalizePath(targetPath);
  return pathArray.find(path => normalizePath(path) === normalizedTarget);
}

/**
 * Convert an array of paths to normalized format (forward slashes)
 */
export function normalizePathArray(paths: string[]): string[] {
  return paths.map(normalizePath);
}

/**
 * Remove common prefix from path for display purposes
 * e.g., "src/app/layout.tsx" -> "app/layout.tsx" if prefix is "src/"
 */
export function removePathPrefix(path: string, prefix: string): string {
  const normalizedPath = normalizePath(path);
  const normalizedPrefix = normalizePath(prefix);
  
  if (normalizedPath.startsWith(normalizedPrefix)) {
    return normalizedPath.substring(normalizedPrefix.length);
  }
  
  return normalizedPath;
}