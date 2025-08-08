// Language detection based on file extensions
export const getLanguageFromFilename = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    
    // Web technologies
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'svg': 'xml',
    
    // Python
    'py': 'python',
    'pyw': 'python',
    'pyi': 'python',
    
    // Java/Kotlin/Scala
    'java': 'java',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'scala': 'scala',
    'sc': 'scala',
    
    // C/C++
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'hxx': 'cpp',
    
    // C#
    'cs': 'csharp',
    
    // Go
    'go': 'go',
    
    // Rust
    'rs': 'rust',
    
    // PHP
    'php': 'php',
    'phtml': 'php',
    
    // Ruby
    'rb': 'ruby',
    'rbw': 'ruby',
    
    // Shell
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    
    // Config files
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'conf': 'ini',
    'config': 'ini',
    
    // Markdown
    'md': 'markdown',
    'markdown': 'markdown',
    'mdown': 'markdown',
    'mkd': 'markdown',
    
    // SQL
    'sql': 'sql',
    
    // Docker
    'dockerfile': 'dockerfile',
    
    // Other
    'txt': 'plaintext',
    'log': 'plaintext',
    'gitignore': 'plaintext',
    'env': 'plaintext',
  };
  
  return languageMap[extension || ''] || 'plaintext';
};

// Get file icon based on language/extension
export const getFileIcon = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();
  const language = getLanguageFromFilename(filename);
  
  const iconMap: Record<string, string> = {
    // Languages
    'javascript': '🟨',
    'typescript': '🔷',
    'python': '🐍',
    'java': '☕',
    'go': '🐹',
    'rust': '🦀',
    'php': '🐘',
    'ruby': '💎',
    'csharp': '🔷',
    'cpp': '⚙️',
    'c': '⚙️',
    
    // Web
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'sass': '🎨',
    'less': '🎨',
    'json': '📋',
    'xml': '📄',
    'svg': '🖼️',
    
    // Config
    'yaml': '⚙️',
    'toml': '⚙️',
    'ini': '⚙️',
    'dockerfile': '🐳',
    
    // Documentation
    'markdown': '📝',
    'plaintext': '📄',
    
    // Database
    'sql': '🗄️',
    
    // Shell
    'shell': '💻',
  };
  
  return iconMap[language] || '📄';
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Get file name without extension
export const getFileNameWithoutExtension = (filename: string): string => {
  return filename.replace(/\.[^/.]+$/, '');
};

// Get file extension
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop() || '';
};

// Check if file is binary (basic check)
export const isBinaryFile = (filename: string): boolean => {
  const binaryExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'svg',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'rar', '7z', 'tar', 'gz',
    'exe', 'dll', 'so', 'dylib',
    'mp3', 'mp4', 'avi', 'mov', 'wav',
    'ttf', 'otf', 'woff', 'woff2',
  ];
  
  const extension = filename.split('.').pop()?.toLowerCase();
  return binaryExtensions.includes(extension || '');
};

// Truncate text for display
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};