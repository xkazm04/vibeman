/**
 * Theme Hook Injector
 * 
 * Detects if a file already imports useThemeStore and adds the import
 * and hook usage if missing.
 * 
 * Requirements: 3.1, 3.2, 6.1
 */

/**
 * Result of analyzing a file for theme hook usage
 */
export interface ThemeHookAnalysis {
  hasImport: boolean;
  hasHookUsage: boolean;
  importLine: number | null;
  hookUsageLine: number | null;
}

/**
 * Result of injecting theme hook into a file
 */
export interface InjectionResult {
  originalContent: string;
  transformedContent: string;
  importAdded: boolean;
  hookUsageAdded: boolean;
  changes: InjectionChange[];
}

export interface InjectionChange {
  type: 'import' | 'hook-usage';
  line: number;
  content: string;
}

/**
 * The import statement for useThemeStore
 */
export const THEME_STORE_IMPORT = "import { useThemeStore } from '@/stores/themeStore';";

/**
 * The hook usage statement
 */
export const THEME_HOOK_USAGE = 'const { getThemeColors } = useThemeStore();';

/**
 * Regex patterns for detecting existing theme store usage
 */
const IMPORT_PATTERN = /import\s*\{[^}]*useThemeStore[^}]*\}\s*from\s*['"]@\/stores\/themeStore['"]/;
const HOOK_USAGE_PATTERN = /const\s*\{[^}]*getThemeColors[^}]*\}\s*=\s*useThemeStore\s*\(\s*\)/;


/**
 * Analyzes file content to determine if it already has theme hook imports and usage
 */
export function analyzeThemeHookUsage(content: string): ThemeHookAnalysis {
  const lines = content.split('\n');
  
  let hasImport = false;
  let hasHookUsage = false;
  let importLine: number | null = null;
  let hookUsageLine: number | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (IMPORT_PATTERN.test(line)) {
      hasImport = true;
      importLine = i + 1;
    }
    
    if (HOOK_USAGE_PATTERN.test(line)) {
      hasHookUsage = true;
      hookUsageLine = i + 1;
    }
  }
  
  return {
    hasImport,
    hasHookUsage,
    importLine,
    hookUsageLine,
  };
}

/**
 * Finds the best position to insert the import statement.
 * Looks for existing imports and places it after them.
 */
export function findImportInsertPosition(content: string): number {
  const lines = content.split('\n');
  let lastImportLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for import statements
    if (line.startsWith('import ') || line.startsWith("import{")) {
      lastImportLine = i + 1;
    }
    
    // Stop if we hit non-import code (excluding comments and empty lines)
    if (lastImportLine > 0 && 
        line.length > 0 && 
        !line.startsWith('import') && 
        !line.startsWith('//') && 
        !line.startsWith('/*') && 
        !line.startsWith('*')) {
      break;
    }
  }
  
  return lastImportLine;
}

/**
 * Finds the position to insert the hook usage statement.
 * Looks for the first function component body.
 */
export function findHookInsertPosition(content: string): number {
  const lines = content.split('\n');
  
  // Look for function component patterns
  const componentPatterns = [
    /^export\s+(?:default\s+)?function\s+\w+/,
    /^(?:const|let)\s+\w+\s*=\s*(?:\([^)]*\)|[^=])*=>\s*\{?/,
    /^export\s+(?:default\s+)?(?:const|let)\s+\w+\s*=\s*(?:\([^)]*\)|[^=])*=>/,
    /^function\s+\w+/,
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    for (const pattern of componentPatterns) {
      if (pattern.test(line)) {
        // Find the opening brace of the function body
        let braceCount = 0;
        let foundOpenBrace = false;
        
        for (let j = i; j < lines.length; j++) {
          const searchLine = lines[j];
          
          for (const char of searchLine) {
            if (char === '{') {
              braceCount++;
              foundOpenBrace = true;
            } else if (char === ')' && !foundOpenBrace) {
              // Still in parameters
              continue;
            }
          }
          
          if (foundOpenBrace && braceCount > 0) {
            // Return the line after the opening brace
            return j + 2; // +1 for 0-index, +1 for next line
          }
        }
      }
    }
  }
  
  return 0;
}


/**
 * Injects the theme store import into the content if not already present
 */
export function injectImport(content: string): { content: string; added: boolean; line: number } {
  const analysis = analyzeThemeHookUsage(content);
  
  if (analysis.hasImport) {
    return { content, added: false, line: 0 };
  }
  
  const insertPosition = findImportInsertPosition(content);
  const lines = content.split('\n');
  
  // Insert the import after the last import
  lines.splice(insertPosition, 0, THEME_STORE_IMPORT);
  
  return {
    content: lines.join('\n'),
    added: true,
    line: insertPosition + 1,
  };
}

/**
 * Injects the hook usage into the content if not already present
 */
export function injectHookUsage(content: string): { content: string; added: boolean; line: number } {
  const analysis = analyzeThemeHookUsage(content);
  
  if (analysis.hasHookUsage) {
    return { content, added: false, line: 0 };
  }
  
  const insertPosition = findHookInsertPosition(content);
  
  if (insertPosition === 0) {
    // Could not find a suitable position
    return { content, added: false, line: 0 };
  }
  
  const lines = content.split('\n');
  
  // Determine indentation from surrounding code
  const indentation = getIndentation(lines[insertPosition - 1] || '');
  const hookLine = indentation + THEME_HOOK_USAGE;
  
  // Insert the hook usage
  lines.splice(insertPosition - 1, 0, hookLine);
  
  return {
    content: lines.join('\n'),
    added: true,
    line: insertPosition,
  };
}

/**
 * Gets the indentation from a line of code
 */
function getIndentation(line: string): string {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '  ';
}

/**
 * Injects both import and hook usage into a file
 */
export function injectThemeHook(content: string): InjectionResult {
  const changes: InjectionChange[] = [];
  let transformedContent = content;
  let importAdded = false;
  let hookUsageAdded = false;
  
  // First inject the import
  const importResult = injectImport(transformedContent);
  transformedContent = importResult.content;
  importAdded = importResult.added;
  
  if (importAdded) {
    changes.push({
      type: 'import',
      line: importResult.line,
      content: THEME_STORE_IMPORT,
    });
  }
  
  // Then inject the hook usage
  const hookResult = injectHookUsage(transformedContent);
  transformedContent = hookResult.content;
  hookUsageAdded = hookResult.added;
  
  if (hookUsageAdded) {
    changes.push({
      type: 'hook-usage',
      line: hookResult.line + (importAdded ? 1 : 0), // Adjust for added import line
      content: THEME_HOOK_USAGE,
    });
  }
  
  return {
    originalContent: content,
    transformedContent,
    importAdded,
    hookUsageAdded,
    changes,
  };
}

/**
 * Checks if a file needs theme hook injection based on whether it uses theme colors
 */
export function needsThemeHook(content: string, hasColorPatterns: boolean): boolean {
  if (!hasColorPatterns) {
    return false;
  }
  
  const analysis = analyzeThemeHookUsage(content);
  return !analysis.hasImport || !analysis.hasHookUsage;
}
