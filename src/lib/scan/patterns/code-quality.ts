/**
 * Code quality pattern detection
 */

/**
 * Split content into lines
 */
function splitLines(content: string): string[] {
  return content.split('\n');
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects console.log statements
 */
export function detectConsoleStatements(content: string): number[] {
  const lines = splitLines(content);
  const consoleLines: number[] = [];

  lines.forEach((line, index) => {
    if (/console\.(log|warn|error|info|debug)/.test(line)) {
      consoleLines.push(index + 1);
    }
  });

  return consoleLines;
}

/**
 * Detects 'any' type usage
 */
export function detectAnyTypes(content: string): number[] {
  const lines = splitLines(content);
  const anyLines: number[] = [];

  lines.forEach((line, index) => {
    if (/:\s*any\b/.test(line)) {
      anyLines.push(index + 1);
    }
  });

  return anyLines;
}

/**
 * Detects potentially unused imports
 * Improved version that handles JSX components, type-only imports, and property access
 */
export function detectUnusedImports(content: string): number[] {
  const lines = splitLines(content);
  const importLines: number[] = [];

  // Skip type-only imports (they don't affect runtime bundle)
  const typeOnlyImportPattern = /^import\s+type\s+/;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip type-only imports
    if (typeOnlyImportPattern.test(trimmedLine)) {
      return;
    }

    if (/^import\s+.*from/.test(trimmedLine)) {
      // Extract imported names (handle default, named, and namespace imports)
      const namedMatch = trimmedLine.match(/import\s+\{([^}]+)\}/);
      const defaultMatch = trimmedLine.match(/^import\s+(\w+)\s+from/);
      const namespaceMatch = trimmedLine.match(/import\s+\*\s+as\s+(\w+)/);

      const imports: string[] = [];

      if (namedMatch) {
        imports.push(...namedMatch[1].split(',').map(i => {
          // Handle "name as alias" syntax - we care about the alias
          const parts = i.trim().split(/\s+as\s+/);
          return parts.length > 1 ? parts[1].trim() : parts[0].trim();
        }));
      }
      if (defaultMatch && !namespaceMatch) {
        imports.push(defaultMatch[1].trim());
      }
      if (namespaceMatch) {
        imports.push(namespaceMatch[1].trim());
      }

      if (imports.length > 0) {
        // Get the rest of the file content for analysis
        const restOfFile = content.split('\n').slice(index + 1).join('\n');

        // Check if any import is not used in the file
        const hasUnused = imports.some(imp => {
          // Escape special regex characters
          const escaped = escapeRegex(imp);

          // Multiple usage patterns to check:
          const patterns = [
            new RegExp(`\\b${escaped}\\b`),              // Regular usage: functionName()
            new RegExp(`<${escaped}[\\s/>]`),            // JSX usage: <ComponentName>
            new RegExp(`<${escaped}\\.`),                 // JSX namespaced: <Namespace.Component>
            new RegExp(`${escaped}\\.\\w+`),             // Property access: object.property
            new RegExp(`\\.\\.\\.\s*${escaped}\\b`),     // Spread: ...props
            new RegExp(`:\\s*${escaped}\\b`),            // Type annotation: var: TypeName
            new RegExp(`<[^>]*\\b${escaped}\\b[^>]*>`),  // Generic type: Array<TypeName>
            new RegExp(`extends\\s+${escaped}\\b`),      // Inheritance: extends BaseClass
            new RegExp(`implements\\s+${escaped}\\b`),   // Implementation: implements Interface
          ];

          // Check if the import is used in any of these patterns
          const isUsed = patterns.some(pattern => pattern.test(restOfFile));

          return !isUsed;
        });

        if (hasUnused) {
          importLines.push(index + 1);
        }
      }
    }
  });

  return importLines;
}
