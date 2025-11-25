/**
 * React Hooks dependency detection
 */

/**
 * Split content into lines
 */
function splitLines(content: string): string[] {
  return content.split('\n');
}

/**
 * Detects issues with React Hook dependencies (useEffect, useCallback, useMemo)
 */
export interface HookDependencyIssue {
  line: number;
  hookType: 'useEffect' | 'useCallback' | 'useMemo';
  issueType: 'missing-dependency' | 'unnecessary-dependency' | 'missing-array';
  details: string;
  missingDeps?: string[];
  unnecessaryDeps?: string[];
  severity: 'low' | 'medium' | 'high';
}

export function detectReactHookDeps(content: string): HookDependencyIssue[] {
  const lines = splitLines(content);
  const issues: HookDependencyIssue[] = [];

  // Pattern to detect hook calls
  const hookPattern = /(useEffect|useCallback|useMemo)\s*\(/g;

  let match;
  while ((match = hookPattern.exec(content)) !== null) {
    const hookType = match[1] as 'useEffect' | 'useCallback' | 'useMemo';
    const startPos = match.index;

    // Find the line number
    const beforeMatch = content.substring(0, startPos);
    const lineNumber = beforeMatch.split('\n').length;

    // Extract the hook call (find matching parentheses)
    let depth = 0;
    let endPos = startPos;
    let hookCallContent = '';

    for (let i = startPos; i < content.length; i++) {
      const char = content[i];
      hookCallContent += char;

      if (char === '(') depth++;
      if (char === ')') depth--;

      if (depth === 0 && char === ')') {
        endPos = i;
        break;
      }
    }

    // Parse the hook call to extract callback and dependency array
    const callContent = hookCallContent;

    // Extract callback function body
    const callbackMatch = callContent.match(/\(([^)]*)\)\s*=>\s*\{([\s\S]*?)\}(?=\s*,|\s*\))/);
    const callbackBody = callbackMatch ? callbackMatch[2] : '';

    // Extract dependency array
    const depsArrayMatch = callContent.match(/\[\s*([^\]]*?)\s*\]\s*\)/);
    const hasDepsArray = !!depsArrayMatch;
    const declaredDeps = depsArrayMatch
      ? depsArrayMatch[1]
          .split(',')
          .map(d => d.trim())
          .filter(d => d.length > 0)
      : [];

    // If no dependency array, check if one should exist
    if (!hasDepsArray && callbackBody) {
      // Check if callback uses any external variables
      const externalVarPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
      const usedVars = new Set<string>();

      let varMatch;
      while ((varMatch = externalVarPattern.exec(callbackBody)) !== null) {
        const varName = varMatch[1];

        // Skip JS keywords and common React/DOM APIs
        const skipKeywords = [
          'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
          'true', 'false', 'null', 'undefined', 'console', 'window', 'document',
          'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
        ];

        if (!skipKeywords.includes(varName)) {
          usedVars.add(varName);
        }
      }

      if (usedVars.size > 0) {
        issues.push({
          line: lineNumber,
          hookType,
          issueType: 'missing-array',
          details: `${hookType} is missing a dependency array. Consider adding dependencies: [${Array.from(usedVars).join(', ')}]`,
          severity: 'high',
        });
      }
      continue;
    }

    // Extract variables used in callback
    const usedInCallback = new Set<string>();
    if (callbackBody) {
      // Find all variable references
      const varPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
      let varMatch;

      while ((varMatch = varPattern.exec(callbackBody)) !== null) {
        const varName = varMatch[1];

        // Skip keywords, built-ins, and function parameters
        const skipList = [
          'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
          'true', 'false', 'null', 'undefined', 'this',
          'console', 'window', 'document', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
          'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Promise',
          'async', 'await', 'try', 'catch', 'finally', 'throw',
        ];

        // Also skip state setters (e.g., setCount)
        if (skipList.includes(varName) || /^set[A-Z]/.test(varName)) {
          continue;
        }

        usedInCallback.add(varName);
      }
    }

    // Compare declared deps with used variables
    const missingDeps: string[] = [];
    const unnecessaryDeps: string[] = [];

    // Check for missing dependencies
    for (const usedVar of usedInCallback) {
      // Check if it's in the dependency array (handle object destructuring like "dep.property")
      const isDeclared = declaredDeps.some(dep => {
        const depName = dep.split('.')[0].trim();
        return depName === usedVar || dep.includes(usedVar);
      });

      if (!isDeclared) {
        missingDeps.push(usedVar);
      }
    }

    // Check for unnecessary dependencies
    for (const declaredDep of declaredDeps) {
      if (!declaredDep) continue;

      const depName = declaredDep.split('.')[0].trim();
      if (!usedInCallback.has(depName)) {
        unnecessaryDeps.push(declaredDep);
      }
    }

    // Report issues
    if (missingDeps.length > 0) {
      issues.push({
        line: lineNumber,
        hookType,
        issueType: 'missing-dependency',
        details: `${hookType} is missing dependencies: ${missingDeps.join(', ')}`,
        missingDeps,
        severity: missingDeps.length > 2 ? 'high' : 'medium',
      });
    }

    if (unnecessaryDeps.length > 0) {
      issues.push({
        line: lineNumber,
        hookType,
        issueType: 'unnecessary-dependency',
        details: `${hookType} has unnecessary dependencies: ${unnecessaryDeps.join(', ')}`,
        unnecessaryDeps,
        severity: 'low',
      });
    }
  }

  return issues;
}
