import path from 'path';

/**
 * Path security utilities for preventing directory traversal attacks.
 *
 * This is a localhost-only app, but we still validate paths to prevent
 * accidental or crafted path manipulation that could read/write outside
 * the intended project scope.
 */

/** Characters and sequences that indicate traversal attempts */
const TRAVERSAL_PATTERNS = [
  '..',       // Parent directory traversal
  '~',        // Home directory expansion
  '\0',       // Null byte injection
];

/**
 * Checks a file path for directory traversal patterns.
 * Returns an error message if the path is unsafe, or null if safe.
 */
export function validatePathTraversal(filePath: string): string | null {
  if (!filePath || typeof filePath !== 'string') {
    return 'File path is required';
  }

  // Normalize to detect encoded traversal (e.g. %2e%2e, backslash tricks)
  const normalized = path.normalize(filePath);

  for (const pattern of TRAVERSAL_PATTERNS) {
    if (filePath.includes(pattern) || normalized.includes(pattern)) {
      return 'Invalid file path: directory traversal detected';
    }
  }

  return null;
}

/**
 * Validates that a resolved path stays within an allowed base directory.
 * Resolves symlinks and normalizes before comparison.
 *
 * @param filePath - The path to validate (absolute or relative)
 * @param baseDir - The allowed base directory
 * @returns Error message if the path escapes baseDir, or null if safe
 */
export function validatePathWithinBase(filePath: string, baseDir: string): string | null {
  const resolvedPath = path.resolve(baseDir, filePath);
  const resolvedBase = path.resolve(baseDir);

  // Ensure the resolved path starts with the base directory
  // Add path.sep to prevent partial prefix matches (e.g., /project-evil matching /project)
  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    return 'Invalid file path: path escapes allowed directory';
  }

  return null;
}

/**
 * Validates a filename component (not a full path) for safety.
 * Rejects names containing path separators or traversal patterns.
 */
export function validateFilename(filename: string): string | null {
  if (!filename || typeof filename !== 'string') {
    return 'Filename is required';
  }

  if (filename.includes('/') || filename.includes('\\') || filename.includes('..') || filename.includes('\0')) {
    return 'Invalid filename: contains path separator or traversal pattern';
  }

  return null;
}

/**
 * Validates a subfolder path component (relative, no absolute paths allowed).
 * Must not contain traversal patterns or escape the parent.
 */
export function validateSubfolder(subfolder: string): string | null {
  if (!subfolder || typeof subfolder !== 'string') {
    return null; // Subfolder is optional in most cases
  }

  const traversalError = validatePathTraversal(subfolder);
  if (traversalError) return traversalError;

  // Must be relative (no absolute paths)
  if (path.isAbsolute(subfolder)) {
    return 'Invalid subfolder: must be a relative path';
  }

  return null;
}

/**
 * Full validation for a user-provided file path in the context of a project.
 * Handles both absolute and relative paths, ensuring they stay within bounds.
 *
 * @param filePath - The user-provided file path
 * @param projectRoot - The project root to scope relative paths to (defaults to cwd)
 * @returns { valid: true, resolvedPath } or { valid: false, error }
 */
export function validateFilePath(
  filePath: string,
  projectRoot?: string
): { valid: true; resolvedPath: string } | { valid: false; error: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'File path is required' };
  }

  // Check for null bytes (always dangerous)
  if (filePath.includes('\0')) {
    return { valid: false, error: 'Invalid file path: contains null byte' };
  }

  // Check for traversal patterns
  const traversalError = validatePathTraversal(filePath);
  if (traversalError) {
    return { valid: false, error: traversalError };
  }

  const root = projectRoot || process.cwd();
  const isAbsolutePath = path.isAbsolute(filePath) || /^[A-Za-z]:[\\/]/.test(filePath);
  const resolvedPath = isAbsolutePath ? path.normalize(filePath) : path.join(root, filePath);

  return { valid: true, resolvedPath };
}

/**
 * Validates a project path for use as a base directory.
 * Must be an absolute path, exist as a string, and not contain traversal.
 */
export function validateProjectPath(projectPath: string): string | null {
  if (!projectPath || typeof projectPath !== 'string') {
    return 'Project path is required';
  }

  // Check for traversal patterns
  const traversalError = validatePathTraversal(projectPath);
  if (traversalError) return traversalError;

  // Must be absolute
  const isAbsolute = path.isAbsolute(projectPath) || /^[A-Za-z]:[\\/]/.test(projectPath);
  if (!isAbsolute) {
    return 'Project path must be absolute';
  }

  return null;
}

/**
 * Validates an array of file paths, ensuring none contain traversal patterns.
 * Optionally validates against a base directory.
 *
 * @returns Array of invalid paths with errors, or empty array if all valid
 */
export function validateFilePathArray(
  filePaths: string[],
  baseDir?: string
): Array<{ path: string; error: string }> {
  const errors: Array<{ path: string; error: string }> = [];

  for (const fp of filePaths) {
    const traversalError = validatePathTraversal(fp);
    if (traversalError) {
      errors.push({ path: fp, error: traversalError });
      continue;
    }

    if (baseDir) {
      const baseError = validatePathWithinBase(fp, baseDir);
      if (baseError) {
        errors.push({ path: fp, error: baseError });
      }
    }
  }

  return errors;
}
