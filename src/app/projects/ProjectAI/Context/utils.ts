import { ContextFile } from './types';

// Extract files from context content
export const extractFilesFromContent = (content: string): ContextFile[] => {
  const files: ContextFile[] = [];
  
  // Look for Location Map section
  const locationMapMatch = content.match(/##\s*(?:Architecture\s*)?(?:###\s*)?Location Map\s*\n(.*?)(?=\n##|\n#|$)/s);

  if (locationMapMatch) {
    const locationContent = locationMapMatch[1];
    const pathMatches = locationContent.matchAll(/([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)/g);

    for (const match of pathMatches) {
      const path = match[1];
      if (path && !files.some(f => f.path === path)) {
        files.push({
          path,
          type: path.split('.').pop() || 'file'
        });
      }
    }
  }

  // Also look for file references in bullet points
  const bulletMatches = content.matchAll(/[-*]\s+([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)/g);
  for (const match of bulletMatches) {
    const path = match[1];
    if (path && !files.some(f => f.path === path)) {
      files.push({
        path,
        type: path.split('.').pop() || 'file'
      });
    }
  }

  return files;
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
    'css': { component: 'Settings', color: 'text-pink-400' },
    'scss': { component: 'Settings', color: 'text-pink-400' },
    'html': { component: 'Code', color: 'text-orange-400' },
    'json': { component: 'Database', color: 'text-green-400' },
    'md': { component: 'FileText', color: 'text-purple-400' },
    'py': { component: 'Code', color: 'text-green-500' },
    'png': { component: 'Image', color: 'text-indigo-400' },
    'jpg': { component: 'Image', color: 'text-indigo-400' },
    'jpeg': { component: 'Image', color: 'text-indigo-400' },
    'svg': { component: 'Image', color: 'text-indigo-400' },
  };

  const info = iconMap[type.toLowerCase()] || { component: 'FileText', color: 'text-gray-400' };
  
  // Return a placeholder for now - the actual icon will be handled in the component
  return {
    icon: null, // Will be replaced with actual icon component
    color: info.color
  };
};