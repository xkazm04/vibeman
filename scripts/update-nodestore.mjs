import fs from 'fs';

const filePath = 'C:/Users/kazda/kiro/vibeman/src/stores/nodeStore.ts';

// Read current content
let content = fs.readFileSync(filePath, 'utf8');

// Add normalizePath helper if not present
if (!content.includes('const normalizePath =')) {
  content = content.replace(
    '  // Helper function to get all child file nodes from a folder',
    `  // Helper function to normalize paths for comparison
  const normalizePath = (path: string): string => {
    return path.replace(/\\\\/g, '/');
  };

  // Helper function to get all child file paths from a folder`
  );
}

// Update getAllChildFiles to use path instead of id
content = content.replace(
  /childFiles\.push\(currentNode\.id\);/g,
  'childFiles.push(currentNode.path);'
);

// Update getSelectedFilePaths to use normalizePath
content = content.replace(
  /const normalizedPath = node\.id\.replace\(\/\\\\/g, '\/'\);/g,
  'const normalizedPath = normalizePath(node.path);'
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Successfully updated nodeStore.ts to use TreeNode.path consistently');
