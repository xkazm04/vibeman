/**
 * Class Replacement Transformer
 * 
 * Replaces hardcoded cyan classes with template literals using theme tokens.
 * Handles className props, template strings, and string concatenation.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.2
 */

import { mapColorToToken, COLOR_MAPPINGS, type MappingResult } from './colorMapper';
import { scanContent, type ColorPattern } from './colorScanner';

/**
 * Result of transforming a single class
 */
export interface ClassTransformResult {
  original: string;
  transformed: string;
  tokenPath: string;
  matched: boolean;
}

/**
 * Result of transforming file content
 */
export interface TransformResult {
  originalContent: string;
  transformedContent: string;
  changes: TransformChange[];
  requiresTemplateConversion: boolean;
}

export interface TransformChange {
  line: number;
  column: number;
  original: string;
  replacement: string;
  tokenPath: string;
}

/**
 * Transforms a single cyan color class to use a theme token expression.
 * 
 * @param colorClass - The original Tailwind color class (e.g., "text-cyan-400")
 * @returns The transformed expression or null if no mapping exists
 */
export function transformClass(colorClass: string): ClassTransformResult {
  const mapping = mapColorToToken(colorClass);
  
  if (!mapping.matched) {
    return {
      original: colorClass,
      transformed: colorClass,
      tokenPath: '',
      matched: false,
    };
  }
  
  return {
    original: colorClass,
    transformed: `\${getThemeColors().${mapping.tokenPath}}`,
    tokenPath: mapping.tokenPath,
    matched: true,
  };
}


/**
 * Checks if a string is already a template literal
 */
export function isTemplateLiteral(str: string): boolean {
  return str.startsWith('`') && str.endsWith('`');
}

/**
 * Checks if a string is a regular string literal
 */
export function isStringLiteral(str: string): boolean {
  return (str.startsWith('"') && str.endsWith('"')) ||
         (str.startsWith("'") && str.endsWith("'"));
}

/**
 * Converts a regular string to a template literal
 */
export function toTemplateLiteral(str: string): string {
  if (isTemplateLiteral(str)) {
    return str;
  }
  
  if (isStringLiteral(str)) {
    // Remove quotes and wrap in backticks
    const content = str.slice(1, -1);
    return `\`${content}\``;
  }
  
  return `\`${str}\``;
}

/**
 * Transforms a className value by replacing cyan classes with theme tokens.
 * Handles both string literals and template literals.
 * 
 * @param classNameValue - The className value (e.g., '"text-cyan-400 bg-gray-900"')
 * @returns The transformed className value
 */
export function transformClassNameValue(classNameValue: string): { value: string; changed: boolean; changes: string[] } {
  const changes: string[] = [];
  let value = classNameValue;
  let changed = false;
  
  // Find all cyan patterns in the value
  for (const mapping of COLOR_MAPPINGS) {
    const regex = new RegExp(mapping.pattern.source, 'g');
    let match: RegExpExecArray | null;
    
    while ((match = regex.exec(value)) !== null) {
      const original = match[0];
      const transformResult = transformClass(original);
      
      if (transformResult.matched) {
        changes.push(original);
        changed = true;
      }
    }
  }
  
  if (!changed) {
    return { value, changed: false, changes: [] };
  }
  
  // Convert to template literal if it's a regular string
  if (isStringLiteral(value)) {
    value = toTemplateLiteral(value);
  }
  
  // Replace all cyan patterns with theme token expressions
  for (const mapping of COLOR_MAPPINGS) {
    const regex = new RegExp(mapping.pattern.source, 'g');
    value = value.replace(regex, (match) => {
      const result = transformClass(match);
      return result.matched ? result.transformed : match;
    });
  }
  
  return { value, changed, changes };
}


/**
 * Regex pattern to match className attributes in JSX
 * Matches: className="...", className='...', className={`...`}, className={...}
 */
const CLASS_NAME_PATTERNS = [
  // className="..." or className='...'
  /className\s*=\s*(["'])([^"']*)\1/g,
  // className={`...`}
  /className\s*=\s*\{(`[^`]*`)\}/g,
  // className={...} with template literal inside
  /className\s*=\s*\{([^}]+)\}/g,
];

/**
 * Transforms a line of code by replacing cyan classes with theme tokens.
 * 
 * @param line - A single line of code
 * @returns The transformed line and any changes made
 */
export function transformLine(line: string): { line: string; changes: TransformChange[]; lineNumber?: number } {
  const changes: TransformChange[] = [];
  let transformedLine = line;
  
  // Pattern 1: className="..." or className='...'
  const stringPattern = /className\s*=\s*(["'])([^"']*)\1/g;
  let match: RegExpExecArray | null;
  
  while ((match = stringPattern.exec(line)) !== null) {
    const quote = match[1];
    const classValue = match[2];
    const fullMatch = match[0];
    const column = match.index;
    
    // Check if there are cyan patterns to transform
    const result = transformClassNameValue(`${quote}${classValue}${quote}`);
    
    if (result.changed) {
      // Replace the className with template literal version
      const newClassName = `className={${result.value}}`;
      transformedLine = transformedLine.replace(fullMatch, newClassName);
      
      for (const original of result.changes) {
        const transformResult = transformClass(original);
        changes.push({
          line: 0, // Will be set by caller
          column,
          original,
          replacement: transformResult.transformed,
          tokenPath: transformResult.tokenPath,
        });
      }
    }
  }
  
  // Pattern 2: className={`...`} - already template literal
  const templatePattern = /className\s*=\s*\{(`[^`]*`)\}/g;
  
  while ((match = templatePattern.exec(transformedLine)) !== null) {
    const templateValue = match[1];
    const fullMatch = match[0];
    const column = match.index;
    
    const result = transformClassNameValue(templateValue);
    
    if (result.changed) {
      const newClassName = `className={${result.value}}`;
      transformedLine = transformedLine.replace(fullMatch, newClassName);
      
      for (const original of result.changes) {
        const transformResult = transformClass(original);
        changes.push({
          line: 0,
          column,
          original,
          replacement: transformResult.transformed,
          tokenPath: transformResult.tokenPath,
        });
      }
    }
  }
  
  return { line: transformedLine, changes };
}


/**
 * Transforms file content by replacing all cyan classes with theme tokens.
 * 
 * @param content - The file content to transform
 * @returns The transformed content and all changes made
 */
export function transformContent(content: string): TransformResult {
  const lines = content.split('\n');
  const transformedLines: string[] = [];
  const allChanges: TransformChange[] = [];
  let requiresTemplateConversion = false;
  
  for (let i = 0; i < lines.length; i++) {
    const { line: transformedLine, changes } = transformLine(lines[i]);
    transformedLines.push(transformedLine);
    
    // Update line numbers in changes
    for (const change of changes) {
      change.line = i + 1;
      allChanges.push(change);
      
      // Check if we converted a string to template literal
      if (lines[i].includes('className="') || lines[i].includes("className='")) {
        requiresTemplateConversion = true;
      }
    }
  }
  
  return {
    originalContent: content,
    transformedContent: transformedLines.join('\n'),
    changes: allChanges,
    requiresTemplateConversion,
  };
}

/**
 * Gets a summary of all transformations that would be made to content
 */
export function getTransformSummary(content: string): {
  totalPatterns: number;
  byCategory: Record<string, number>;
  affectedLines: number[];
} {
  const patterns = scanContent(content);
  const byCategory: Record<string, number> = {};
  const affectedLines = new Set<number>();
  
  for (const pattern of patterns) {
    byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
    affectedLines.add(pattern.line);
  }
  
  return {
    totalPatterns: patterns.length,
    byCategory,
    affectedLines: Array.from(affectedLines).sort((a, b) => a - b),
  };
}

/**
 * Checks if content has any cyan patterns that can be transformed
 */
export function hasTransformablePatterns(content: string): boolean {
  const patterns = scanContent(content);
  return patterns.some(p => {
    const result = mapColorToToken(p.original);
    return result.matched;
  });
}
