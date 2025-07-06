export const validatePath = (path: string): { isValid: boolean; message: string } => {
  if (!path) {
    return { isValid: false, message: 'Path is required' };
  }
  
  // Check for common issues
  if (path.includes('//') || path.includes('\\\\')) {
    return { isValid: false, message: 'Path contains double slashes' };
  }
  
  // More lenient validation for Windows paths
  if (typeof window !== 'undefined' || process.platform === 'win32') {
    // Check if it's a valid Windows path format
    if (!path.match(/^[A-Za-z]:[\\\/]/) && !path.startsWith('\\\\')) {
      return { isValid: false, message: 'Windows path should start with drive letter (e.g., C:\\)' };
    }
  }
  
  // Check if path looks like it's in the expected workspace
  if (!path.toLowerCase().includes('mk')) {
    return { isValid: false, message: 'Path should be in the mk workspace directory' };
  }
  
  // Check for valid project directory names
  const pathParts = path.split(/[\\\/]/);
  const projectName = pathParts[pathParts.length - 1];
  if (projectName && !projectName.match(/^[a-zA-Z0-9_-]+$/)) {
    return { isValid: false, message: 'Project name should contain only letters, numbers, hyphens, and underscores' };
  }
  
  return { isValid: true, message: 'Path looks valid' };
};

export const constructFullPath = (basePath: string, relativePath: string): string => {
  if (!basePath || !relativePath) return relativePath;
  
  // Remove trailing slashes from base path
  const cleanBasePath = basePath.replace(/[\\\/]+$/, '');
  
  // Remove leading slashes from relative path
  const cleanRelativePath = relativePath.replace(/^[\\\/]+/, '');
  
  // Determine separator based on platform or existing path format
  let separator = '\\'; // Default to Windows separator
  
  // Check if we're in a browser environment or explicitly on Windows
  if (typeof window !== 'undefined' || (typeof process !== 'undefined' && process.platform === 'win32')) {
    separator = '\\';
  } else if (typeof process !== 'undefined' && process.platform !== 'win32') {
    separator = '/';
  } else if (basePath.includes('\\')) {
    // If basePath contains backslashes, assume Windows
    separator = '\\';
  } else if (basePath.includes('/')) {
    // If basePath contains forward slashes, assume Unix
    separator = '/';
  }
  
  return `${cleanBasePath}${separator}${cleanRelativePath}`;
};

export const extractRelativePath = (fullPath: string, basePath: string): string => {
  if (!fullPath || !basePath) return fullPath;
  
  // Normalize paths for comparison
  const normalizedFullPath = fullPath.replace(/[\\\/]/g, '/').toLowerCase();
  const normalizedBasePath = basePath.replace(/[\\\/]/g, '/').toLowerCase();
  
  if (normalizedFullPath.startsWith(normalizedBasePath)) {
    const relativePath = fullPath.substring(basePath.length);
    return relativePath.replace(/^[\\\/]+/, '');
  }
  
  return fullPath;
}; 