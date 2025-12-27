/**
 * Hypothesis Mapping Utility
 * Maps automation goal candidates to GoalHub hypotheses
 *
 * This enables integration between the standup automation system and
 * the GoalHub hypothesis verification system. When goals are created
 * from automation candidates, this utility generates appropriate
 * hypotheses for tracking progress.
 */

import type { HypothesisCategory, VerificationMethod } from '@/app/db/models/goal-hub.types';
import type { GoalCandidate } from './types';

// ============ Category Mapping ============

/**
 * Maps goal candidate categories to hypothesis categories
 * Each candidate category generates hypotheses across relevant dimensions
 */
const categoryMapping: Record<string, HypothesisCategory[]> = {
  // Build-focused categories
  feature: ['behavior', 'ux', 'integration'],
  enhancement: ['behavior', 'ux'],
  integration: ['integration', 'behavior', 'error'],

  // Polish-focused categories
  refactor: ['behavior', 'performance'],
  testing: ['behavior', 'edge_case'],
  docs: ['behavior'],
  performance: ['performance', 'data'],
  security: ['security', 'error'],

  // General categories
  bug: ['behavior', 'edge_case', 'error'],
  infrastructure: ['behavior', 'integration'],
  cleanup: ['behavior'],
};

/**
 * Default categories when candidate category is unknown
 */
const DEFAULT_CATEGORIES: HypothesisCategory[] = ['behavior'];

/**
 * Category-specific hypothesis templates
 */
interface HypothesisTemplate {
  titlePrefix: string;
  statementTemplate: string;
  verificationMethod: VerificationMethod;
  basePriority: number;
}

const categoryTemplates: Record<HypothesisCategory, HypothesisTemplate> = {
  behavior: {
    titlePrefix: 'Core',
    statementTemplate: 'The {goal} functionality works as expected',
    verificationMethod: 'test',
    basePriority: 9,
  },
  performance: {
    titlePrefix: 'Perf',
    statementTemplate: 'The {goal} meets performance requirements',
    verificationMethod: 'test',
    basePriority: 7,
  },
  security: {
    titlePrefix: 'Security',
    statementTemplate: 'The {goal} implementation follows security best practices',
    verificationMethod: 'review',
    basePriority: 9,
  },
  ux: {
    titlePrefix: 'UX',
    statementTemplate: 'The {goal} provides a good user experience',
    verificationMethod: 'manual',
    basePriority: 6,
  },
  integration: {
    titlePrefix: 'Integration',
    statementTemplate: 'The {goal} integrates correctly with existing systems',
    verificationMethod: 'test',
    basePriority: 8,
  },
  edge_case: {
    titlePrefix: 'Edge',
    statementTemplate: 'The {goal} handles edge cases gracefully',
    verificationMethod: 'test',
    basePriority: 7,
  },
  data: {
    titlePrefix: 'Data',
    statementTemplate: 'The {goal} maintains data integrity and consistency',
    verificationMethod: 'test',
    basePriority: 8,
  },
  error: {
    titlePrefix: 'Error',
    statementTemplate: 'The {goal} handles errors appropriately with clear messages',
    verificationMethod: 'test',
    basePriority: 7,
  },
  custom: {
    titlePrefix: 'Custom',
    statementTemplate: 'The {goal} meets custom requirements',
    verificationMethod: 'manual',
    basePriority: 5,
  },
};

// ============ Hypothesis Generation ============

/**
 * Generated hypothesis structure (ready for database insertion)
 */
export interface GeneratedHypothesis {
  title: string;
  statement: string;
  reasoning: string;
  category: HypothesisCategory;
  priority: number;
  verificationMethod: VerificationMethod;
  agentSource: string;
}

/**
 * Get hypothesis categories for a candidate category
 */
export function getCategoriesForCandidate(candidateCategory: string): HypothesisCategory[] {
  const normalizedCategory = candidateCategory.toLowerCase();
  return categoryMapping[normalizedCategory] || DEFAULT_CATEGORIES;
}

/**
 * Generate hypotheses for a goal candidate
 *
 * @param candidate - The goal candidate from automation
 * @param projectId - The project ID
 * @returns Array of generated hypotheses ready for insertion
 */
export function generateHypothesesForCandidate(
  candidate: GoalCandidate,
  projectId: string
): GeneratedHypothesis[] {
  const categories = getCategoriesForCandidate(candidate.category);
  const hypotheses: GeneratedHypothesis[] = [];

  // Extract a short goal reference for templates
  const goalRef = candidate.title.length > 50
    ? candidate.title.slice(0, 47) + '...'
    : candidate.title;

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const template = categoryTemplates[category];

    // Create hypothesis with descending priority (first is most important)
    const hypothesis: GeneratedHypothesis = {
      title: `${template.titlePrefix}: ${goalRef}`,
      statement: template.statementTemplate.replace('{goal}', candidate.title),
      reasoning: `Auto-generated hypothesis for ${candidate.category} goal. ${candidate.reasoning}`,
      category,
      priority: template.basePriority - i, // First category gets highest priority
      verificationMethod: template.verificationMethod,
      agentSource: 'standup_automation',
    };

    hypotheses.push(hypothesis);
  }

  return hypotheses;
}

/**
 * Generate a core implementation hypothesis for any goal
 * This is always created as the primary hypothesis
 */
export function generateCoreHypothesis(
  goalTitle: string,
  goalDescription: string | undefined,
  candidateCategory: string
): GeneratedHypothesis {
  return {
    title: `Implementation: ${goalTitle.slice(0, 60)}`,
    statement: `The ${candidateCategory} implementation is complete and functional: ${goalDescription || goalTitle}`,
    reasoning: 'Primary implementation hypothesis tracking overall goal completion',
    category: 'behavior',
    priority: 10,
    verificationMethod: 'test',
    agentSource: 'standup_automation',
  };
}

/**
 * Generate a full set of hypotheses for a candidate
 * Includes core hypothesis plus category-specific ones
 */
export function generateFullHypothesisSet(
  candidate: GoalCandidate,
  projectId: string
): GeneratedHypothesis[] {
  // Always start with core implementation hypothesis
  const coreHypothesis = generateCoreHypothesis(
    candidate.title,
    candidate.description,
    candidate.category
  );

  // Add category-specific hypotheses
  const categoryHypotheses = generateHypothesesForCandidate(candidate, projectId);

  // Deduplicate if core category overlaps
  const allHypotheses = [coreHypothesis];

  for (const h of categoryHypotheses) {
    // Don't add duplicate behavior hypothesis
    if (h.category === 'behavior' && coreHypothesis.category === 'behavior') {
      continue;
    }
    allHypotheses.push(h);
  }

  return allHypotheses;
}

// ============ Category Analysis ============

/**
 * Analyze a candidate and suggest verification approach
 */
export interface VerificationApproach {
  suggestedCategories: HypothesisCategory[];
  primaryMethod: VerificationMethod;
  estimatedHypotheses: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export function analyzeCandidate(candidate: GoalCandidate): VerificationApproach {
  const categories = getCategoriesForCandidate(candidate.category);
  const priorityScore = candidate.priorityScore;

  // Determine primary verification method based on categories
  let primaryMethod: VerificationMethod = 'manual';
  if (categories.includes('behavior') || categories.includes('edge_case')) {
    primaryMethod = 'test';
  } else if (categories.includes('security')) {
    primaryMethod = 'review';
  }

  // Estimate risk based on category and priority
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  if (priorityScore >= 80 || categories.includes('security')) {
    riskLevel = 'high';
  } else if (priorityScore < 50) {
    riskLevel = 'low';
  }

  return {
    suggestedCategories: categories,
    primaryMethod,
    estimatedHypotheses: categories.length + 1, // +1 for core hypothesis
    riskLevel,
  };
}

// ============ Bulk Operations ============

/**
 * Generate hypotheses for multiple candidates
 */
export function generateBulkHypotheses(
  candidates: GoalCandidate[],
  projectId: string
): Map<string, GeneratedHypothesis[]> {
  const result = new Map<string, GeneratedHypothesis[]>();

  for (const candidate of candidates) {
    const hypotheses = generateFullHypothesisSet(candidate, projectId);
    result.set(candidate.title, hypotheses);
  }

  return result;
}

/**
 * Get summary of hypothesis generation for candidates
 */
export interface HypothesisSummary {
  totalCandidates: number;
  totalHypotheses: number;
  byCategory: Record<HypothesisCategory, number>;
  byMethod: Record<VerificationMethod, number>;
}

export function getHypothesisSummary(candidates: GoalCandidate[]): HypothesisSummary {
  const byCategory: Record<string, number> = {};
  const byMethod: Record<string, number> = {};
  let totalHypotheses = 0;

  for (const candidate of candidates) {
    const hypotheses = generateFullHypothesisSet(candidate, '');
    totalHypotheses += hypotheses.length;

    for (const h of hypotheses) {
      byCategory[h.category] = (byCategory[h.category] || 0) + 1;
      byMethod[h.verificationMethod] = (byMethod[h.verificationMethod] || 0) + 1;
    }
  }

  return {
    totalCandidates: candidates.length,
    totalHypotheses,
    byCategory: byCategory as Record<HypothesisCategory, number>,
    byMethod: byMethod as Record<VerificationMethod, number>,
  };
}
