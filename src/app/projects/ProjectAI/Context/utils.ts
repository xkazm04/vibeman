import { ContextFile } from './types';

// Valid file extensions for context files
const VALID_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.vue', '.py', '.java', '.cs', '.php', '.rb', '.go', '.rs', '.cpp', '.c', '.h', '.css', '.scss', '.sass', '.less', '.html', '.md', '.json', '.yaml', '.yml', '.xml', '.sql']);

/**
 * Check if a file path is valid and not a duplicate
 */
function isValidFile(path: string, existingFiles: ContextFile[]): boolean {
  if (!path) return false;
  const extension = path.substring(path.lastIndexOf('.'));
  return VALID_EXTENSIONS.has(extension) && !existingFiles.some(f => f.path === path);
}

/**
 * Create a ContextFile object from a path
 */
function createContextFile(path: string): ContextFile {
  return {
    path,
    type: path.split('.').pop() || 'file'
  };
}

// Extract files from context content
export const extractFilesFromContent = (content: string): ContextFile[] => {
  const files: ContextFile[] = [];
  
  // Look for Location Map section
  const locationMapMatch = content.match(/##\s*(?:Architecture\s*)?(?:###\s*)?Location Map\s*\n(.*?)(?=\n##|\n#|$)/s);

  if (locationMapMatch) {
    const locationContent = locationMapMatch[1];
    // Enhanced regex to catch files in tree structures and tables
    const pathMatches = locationContent.matchAll(/(?:├──\s*|└──\s*|│\s*└──\s*|│\s*├──\s*|\|\s*`|`|[-*]\s+|^|\s)([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)/gm);

    for (const match of pathMatches) {
      const path = match[1];
      if (isValidFile(path, files)) {
        files.push(createContextFile(path));
      }
    }
  }

  // Look for file references in tables (Key Files by Layer section)
  const tableMatches = content.matchAll(/\|\s*`([^`]+\.[a-zA-Z0-9]+)`/g);
  for (const match of tableMatches) {
    const path = match[1];
    if (isValidFile(path, files)) {
      files.push(createContextFile(path));
    }
  }

  // Look for file references in bullet points and code blocks
  const bulletMatches = content.matchAll(/(?:[-*]\s+`([^`]+\.[a-zA-Z0-9]+)`|[-*]\s+([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))/g);
  for (const match of bulletMatches) {
    const path = match[1] || match[2];
    if (isValidFile(path, files)) {
      files.push(createContextFile(path));
    }
  }

  // Look for files in code blocks (project structure)
  const codeBlockMatches = content.matchAll(/```[\w]*\n([^`]+)```/g);
  for (const match of codeBlockMatches) {
    const codeContent = match[1];
    const pathMatches = codeContent.matchAll(/(?:├──\s*|└──\s*|│\s*└──\s*|│\s*├──\s*|^|\s)([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)/gm);
    for (const pathMatch of pathMatches) {
      const path = pathMatch[1];
      if (isValidFile(path, files)) {
        files.push(createContextFile(path));
      }
    }
  }

  return files.slice(0, 20); // Limit to 20 files to prevent UI overload
};

// Extract title from content
export const extractTitleFromContent = (content: string): string | null => {
  const titleMatch = content.match(/^#\s*(?:Feature Context:\s*)?(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : null;
};

// Update context content with current file list
export const updateContentWithFiles = (content: string, files: ContextFile[]): string => {
  // Find and replace the Location Map section
  const locationMapRegex = /(##\s*(?:Architecture\s*)?(?:###\s*)?Location Map\s*\n)(.*?)(?=\n##|\n#|$)/s;

  if (files.length === 0) {
    return content.replace(locationMapRegex, '$1\nNo files associated with this context.\n');
  }

  const fileList = files.map(file => `- ${file.path}`).join('\n');
  const newLocationMap = `$1\n${fileList}\n`;

  if (locationMapRegex.test(content)) {
    return content.replace(locationMapRegex, newLocationMap);
  } else {
    // Add Location Map section if it doesn't exist
    return content + `\n\n## Location Map\n\n${fileList}\n`;
  }
};

// Helper function to get file type icon and color
export const getFileTypeInfo = (type: string): { icon: React.ReactNode; color: string } => {
  const iconMap: Record<string, { component: string; color: string }> = {
    'tsx': { component: 'Code', color: 'text-blue-400' },
    'jsx': { component: 'Code', color: 'text-blue-400' },
    'ts': { component: 'Code', color: 'text-yellow-400' },
    'js': { component: 'Code', color: 'text-yellow-400' },
    'css': { component: 'Settings', color: 'text-red-400' },
    'scss': { component: 'Settings', color: 'text-red-400' },
    'html': { component: 'Code', color: 'text-orange-400' },
    'json': { component: 'Database', color: 'text-green-400' },
    'md': { component: 'FileText', color: 'text-blue-400' },
    'py': { component: 'Code', color: 'text-green-500' },
    'png': { component: 'Image', color: 'text-slate-400' },
    'jpg': { component: 'Image', color: 'text-slate-400' },
    'jpeg': { component: 'Image', color: 'text-slate-400' },
    'svg': { component: 'Image', color: 'text-slate-400' },
  };

  const info = iconMap[type.toLowerCase()] || { component: 'FileText', color: 'text-gray-400' };
  
  // Return a placeholder for now - the actual icon will be handled in the component
  return {
    icon: null, // Will be replaced with actual icon component
    color: info.color
  };
};