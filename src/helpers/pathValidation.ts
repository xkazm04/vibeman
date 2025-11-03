// Helper to check if running on Windows
const isWindowsPlatform = (): boolean => {
  return typeof window !== 'undefined' || (typeof process !== 'undefined' && process.platform === 'win32');
};

// Helper to split path into parts
const splitPath = (path: string): string[] => {
  return path.split(/[\\\/]/);
};

// Helper to normalize path separators
const normalizePath = (path: string): string => {
  return path.replace(/[\\\/]/g, '/');
};

// Helper to remove trailing slashes
const removeTrailingSlashes = (path: string): string => {
  return path.replace(/[\\\/]+$/, '');
};

// Helper to remove leading slashes
const removeLeadingSlashes = (path: string): string => {
  return path.replace(/^[\\\/]+/, '');
};

// Helper to validate Windows path format
const validateWindowsPathFormat = (path: string): { isValid: boolean; message: string } => {
  if (!path.match(/^[A-Za-z]:[\\\/]/) && !path.startsWith('\\\\')) {
    return { isValid: false, message: 'Windows path should start with drive letter (e.g., C:\\)' };
  }
  return { isValid: true, message: '' };
};

export const validatePath = (path: string): { isValid: boolean; message: string } => {
  if (!path) {
    return { isValid: false, message: 'Path is required' };
  }

  // Check for common issues
  if (path.includes('//') || path.includes('\\\\')) {
    return { isValid: false, message: 'Path contains double slashes' };
  }

  // More lenient validation for Windows paths
  if (isWindowsPlatform()) {
    const windowsValidation = validateWindowsPathFormat(path);
    if (!windowsValidation.isValid) {
      return windowsValidation;
    }
  }

  // Check if path looks like it's in the expected workspace
  if (!path.toLowerCase().includes('mk')) {
    return { isValid: false, message: 'Path should be in the mk workspace directory' };
  }

  // Check for valid project directory names
  const pathParts = splitPath(path);
  const projectName = pathParts[pathParts.length - 1];
  if (projectName && !projectName.match(/^[a-zA-Z0-9_-]+$/)) {
    return { isValid: false, message: 'Project name should contain only letters, numbers, hyphens, and underscores' };
  }

  return { isValid: true, message: 'Path looks valid' };
};

// Helper to determine path separator
const getPathSeparator = (path: string): string => {
  if (isWindowsPlatform()) {
    return '\\';
  }
  if (typeof process !== 'undefined' && process.platform !== 'win32') {
    return '/';
  }
  if (path.includes('\\')) {
    return '\\';
  }
  if (path.includes('/')) {
    return '/';
  }
  return '\\'; // Default to Windows
};

export const constructFullPath = (basePath: string, relativePath: string): string => {
  if (!basePath || !relativePath) return relativePath;

  const cleanBasePath = removeTrailingSlashes(basePath);
  const cleanRelativePath = removeLeadingSlashes(relativePath);
  const separator = getPathSeparator(basePath);

  return `${cleanBasePath}${separator}${cleanRelativePath}`;
};

export const extractRelativePath = (fullPath: string, basePath: string): string => {
  if (!fullPath || !basePath) return fullPath;

  const normalizedFullPath = normalizePath(fullPath).toLowerCase();
  const normalizedBasePath = normalizePath(basePath).toLowerCase();

  if (normalizedFullPath.startsWith(normalizedBasePath)) {
    const relativePath = fullPath.substring(basePath.length);
    return removeLeadingSlashes(relativePath);
  }

  return fullPath;
}; 