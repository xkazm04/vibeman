/**
 * Consistency Checker
 * Checks code for consistency with learned developer patterns
 */

import { consistencyRuleDb, learningInsightDb, codePatternUsageDb } from '@/app/db';
import type { DbConsistencyRule, DbCodePatternUsage } from '@/app/db/models/types';

export interface ConsistencyViolation {
  ruleId: string;
  ruleName: string;
  ruleType: DbConsistencyRule['rule_type'];
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  suggestion?: string;
  exampleCode?: string;
  filePath: string;
  lineNumber?: number;
}

export interface PatternDivergence {
  patternName: string;
  expectedPattern: string;
  actualPattern: string;
  divergenceScore: number; // 0-100 how different
  occurrences: number;
  suggestion: string;
}

export interface ConsistencyReport {
  violations: ConsistencyViolation[];
  patternDivergences: PatternDivergence[];
  overallScore: number; // 0-100 consistency score
  suggestions: string[];
}

/**
 * Standard patterns that can be auto-detected
 */
export const DETECTABLE_PATTERNS = {
  API_HANDLER: {
    name: 'api_handler_structure',
    category: 'api',
    patterns: [
      // Next.js API route pattern
      {
        signature: 'nextjs_api_standard',
        required: ['export async function', 'NextRequest', 'NextResponse.json'],
        antiPatterns: ['res.send', 'res.json'], // Old patterns
      },
    ],
  },
  REACT_COMPONENT: {
    name: 'react_component_structure',
    category: 'component',
    patterns: [
      {
        signature: 'functional_component',
        required: ["'use client'", 'export default function', 'return ('],
        antiPatterns: ['React.Component', 'componentDidMount'],
      },
    ],
  },
  ERROR_HANDLING: {
    name: 'error_handling_pattern',
    category: 'utility',
    patterns: [
      {
        signature: 'try_catch_standard',
        required: ['try {', 'catch (', 'console.error'],
        antiPatterns: ['catch {}', 'catch (e) {}'], // Empty catches
      },
    ],
  },
};

/**
 * Check code against learned consistency rules
 */
export function checkCodeConsistency(
  profileId: string,
  code: string,
  filePath: string
): ConsistencyReport {
  const violations: ConsistencyViolation[] = [];
  const patternDivergences: PatternDivergence[] = [];
  const suggestions: string[] = [];

  // Get enabled rules for this profile
  const rules = consistencyRuleDb.getEnabledByProfile(profileId);

  // Check each rule
  for (const rule of rules) {
    const ruleViolations = checkRule(rule, code, filePath);
    violations.push(...ruleViolations);
  }

  // Check for pattern divergences (same pattern implemented differently)
  const fileCategory = detectFileCategory(filePath);
  if (fileCategory) {
    const usedPatterns = codePatternUsageDb.getByCategory(profileId, fileCategory);
    const divergences = checkPatternDivergences(usedPatterns, code, filePath);
    patternDivergences.push(...divergences);
  }

  // Generate suggestions
  if (violations.length > 0) {
    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    if (errorCount > 0) {
      suggestions.push(`Fix ${errorCount} consistency error(s) to maintain code quality`);
    }
    if (warningCount > 0) {
      suggestions.push(`Review ${warningCount} warning(s) for potential improvements`);
    }
  }

  if (patternDivergences.length > 0) {
    suggestions.push('Consider standardizing divergent patterns for better maintainability');
  }

  // Calculate overall score
  const overallScore = calculateConsistencyScore(violations, patternDivergences);

  return {
    violations,
    patternDivergences,
    overallScore,
    suggestions,
  };
}

/**
 * Check a single rule against code
 */
function checkRule(
  rule: DbConsistencyRule,
  code: string,
  filePath: string
): ConsistencyViolation[] {
  const violations: ConsistencyViolation[] = [];

  try {
    const template = JSON.parse(rule.pattern_template);

    // Check for required elements
    if (template.requiredElements && Array.isArray(template.requiredElements)) {
      for (const element of template.requiredElements) {
        if (typeof element === 'string' && !code.includes(element)) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.rule_name,
            ruleType: rule.rule_type,
            severity: rule.severity,
            message: `Missing required pattern: "${element}"`,
            suggestion: `Add the required element: ${element}`,
            exampleCode: rule.example_code || undefined,
            filePath,
          });
        }
      }
    }

    // Check for anti-patterns
    if (template.antiPatterns && Array.isArray(template.antiPatterns)) {
      for (const antiPattern of template.antiPatterns) {
        if (typeof antiPattern === 'string' && code.includes(antiPattern)) {
          const lineNumber = findLineNumber(code, antiPattern);
          violations.push({
            ruleId: rule.id,
            ruleName: rule.rule_name,
            ruleType: rule.rule_type,
            severity: rule.severity,
            message: `Anti-pattern detected: "${antiPattern}"`,
            suggestion: `Replace "${antiPattern}" with the recommended pattern`,
            exampleCode: rule.example_code || undefined,
            filePath,
            lineNumber,
          });
        }
      }
    }

    // Record violations
    if (violations.length > 0) {
      consistencyRuleDb.recordViolation(rule.id);
    }
  } catch (error) {
    // Invalid template format - skip this rule
  }

  return violations;
}

/**
 * Detect file category based on path
 */
function detectFileCategory(filePath: string): string | null {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.includes('/api/') || lowerPath.includes('route.ts')) {
    return 'api';
  }
  if (lowerPath.includes('/components/') || lowerPath.endsWith('.tsx')) {
    return 'component';
  }
  if (lowerPath.includes('/lib/') || lowerPath.includes('/utils/')) {
    return 'utility';
  }
  if (lowerPath.includes('.test.') || lowerPath.includes('.spec.')) {
    return 'test';
  }
  if (lowerPath.includes('/hooks/')) {
    return 'hook';
  }
  if (lowerPath.includes('/stores/')) {
    return 'store';
  }

  return null;
}

/**
 * Check for pattern divergences
 */
function checkPatternDivergences(
  existingPatterns: DbCodePatternUsage[],
  code: string,
  filePath: string
): PatternDivergence[] {
  const divergences: PatternDivergence[] = [];

  // Group patterns by name
  const patternGroups = existingPatterns.reduce((acc, pattern) => {
    if (!acc[pattern.pattern_name]) {
      acc[pattern.pattern_name] = [];
    }
    acc[pattern.pattern_name].push(pattern);
    return acc;
  }, {} as Record<string, DbCodePatternUsage[]>);

  // Check if current code diverges from established patterns
  for (const [patternName, patterns] of Object.entries(patternGroups)) {
    if (patterns.length >= 3) { // Need at least 3 occurrences to establish a pattern
      const dominantPattern = patterns.reduce((prev, curr) =>
        curr.usage_count > prev.usage_count ? curr : prev
      );

      // Simple divergence check - does the code follow the dominant pattern?
      // This is a simplified version - could be enhanced with AST analysis
      if (dominantPattern.pattern_signature && !code.includes(dominantPattern.pattern_signature)) {
        divergences.push({
          patternName,
          expectedPattern: dominantPattern.pattern_signature,
          actualPattern: 'different',
          divergenceScore: 50, // Would need more sophisticated analysis
          occurrences: dominantPattern.usage_count,
          suggestion: `You typically use a different pattern for ${patternName}. Consider standardizing.`,
        });
      }
    }
  }

  return divergences;
}

/**
 * Find line number of a pattern in code
 */
function findLineNumber(code: string, pattern: string): number | undefined {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(pattern)) {
      return i + 1;
    }
  }
  return undefined;
}

/**
 * Calculate overall consistency score
 */
function calculateConsistencyScore(
  violations: ConsistencyViolation[],
  divergences: PatternDivergence[]
): number {
  let score = 100;

  // Deduct points for violations
  for (const violation of violations) {
    switch (violation.severity) {
      case 'error':
        score -= 15;
        break;
      case 'warning':
        score -= 8;
        break;
      case 'suggestion':
        score -= 3;
        break;
    }
  }

  // Deduct points for divergences
  for (const divergence of divergences) {
    score -= Math.min(10, divergence.divergenceScore / 10);
  }

  return Math.max(0, Math.round(score));
}

/**
 * Create a consistency rule from detected pattern
 */
export function createRuleFromPattern(
  profileId: string,
  projectId: string,
  patternName: string,
  detectedIn: string[]
): DbConsistencyRule | null {
  // Find the standard pattern definition
  for (const [key, patternDef] of Object.entries(DETECTABLE_PATTERNS)) {
    if (patternDef.name === patternName) {
      const pattern = patternDef.patterns[0]; // Use first pattern variant

      return consistencyRuleDb.create({
        profile_id: profileId,
        project_id: projectId,
        rule_name: patternName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        rule_type: detectRuleType(patternDef.category),
        description: `Automatically detected pattern from ${detectedIn.length} files: ${detectedIn.slice(0, 3).join(', ')}${detectedIn.length > 3 ? '...' : ''}`,
        pattern_template: {
          structure: pattern.signature,
          requiredElements: pattern.required,
          optionalElements: [],
          antiPatterns: pattern.antiPatterns || [],
        },
        severity: 'suggestion',
        auto_suggest: true,
      });
    }
  }

  return null;
}

function detectRuleType(category: string): DbConsistencyRule['rule_type'] {
  switch (category) {
    case 'api':
      return 'api_structure';
    case 'component':
      return 'component_pattern';
    case 'utility':
      return 'error_handling';
    default:
      return 'custom';
  }
}

/**
 * Generate consistency insight for a profile
 */
export async function generateConsistencyInsight(
  profileId: string,
  projectId: string,
  report: ConsistencyReport
): Promise<void> {
  if (report.violations.length > 0 || report.patternDivergences.length > 0) {
    const errorViolations = report.violations.filter(v => v.severity === 'error');

    if (errorViolations.length >= 3) {
      learningInsightDb.create({
        profile_id: profileId,
        project_id: projectId,
        insight_type: 'consistency_violation',
        title: 'Multiple Consistency Violations Detected',
        description: `Found ${errorViolations.length} consistency errors. Your code patterns are diverging from established patterns.`,
        data: {
          violations: errorViolations.map(v => ({
            rule: v.ruleName,
            file: v.filePath,
            message: v.message,
          })),
          overallScore: report.overallScore,
        },
        confidence: 90,
        importance: 'high',
      });
    }

    if (report.patternDivergences.length >= 2) {
      learningInsightDb.create({
        profile_id: profileId,
        project_id: projectId,
        insight_type: 'pattern_detected',
        title: 'Pattern Divergence Alert',
        description: `You've implemented the same pattern in ${report.patternDivergences.length} different ways. Consider standardizing.`,
        data: {
          divergences: report.patternDivergences.map(d => ({
            pattern: d.patternName,
            suggestion: d.suggestion,
          })),
        },
        confidence: 75,
        importance: 'medium',
      });
    }
  }
}

/**
 * Get consistency suggestions for a file type
 */
export function getConsistencySuggestions(
  profileId: string,
  fileType: 'api' | 'component' | 'utility' | 'test' | 'hook' | 'store'
): string[] {
  const suggestions: string[] = [];

  // Get rules for this file type
  const ruleTypeMapping: Record<string, DbConsistencyRule['rule_type'][]> = {
    api: ['api_structure', 'error_handling'],
    component: ['component_pattern', 'naming_convention'],
    utility: ['error_handling', 'naming_convention'],
    test: ['naming_convention', 'file_organization'],
    hook: ['naming_convention', 'component_pattern'],
    store: ['naming_convention', 'file_organization'],
  };

  const relevantTypes = ruleTypeMapping[fileType] || [];
  const rules = consistencyRuleDb.getEnabledByProfile(profileId);

  for (const rule of rules) {
    if (relevantTypes.includes(rule.rule_type) && rule.auto_suggest) {
      suggestions.push(rule.description);
    }
  }

  // Add default suggestions if no custom rules
  if (suggestions.length === 0) {
    switch (fileType) {
      case 'api':
        suggestions.push('Use consistent error handling with try/catch');
        suggestions.push('Return NextResponse.json() for all responses');
        break;
      case 'component':
        suggestions.push("Add 'use client' directive for client components");
        suggestions.push('Use consistent prop naming patterns');
        break;
      case 'utility':
        suggestions.push('Document function parameters and return types');
        suggestions.push('Handle edge cases explicitly');
        break;
    }
  }

  return suggestions;
}
