/**
 * Triage Rules Engine
 * Evaluates ideas against user-defined rules and applies actions (accept/reject/archive).
 * Inspired by Gmail filters and Linear auto-triage.
 */

import { triageRuleDb, ideaDb } from '@/app/db';
import { getDatabase } from '@/app/db/connection';
import { DbIdea, DbTriageRule, TriageCondition, TriageAction } from '@/app/db/models/types';

export interface TriageResult {
  ruleId: string;
  ruleName: string;
  action: TriageAction;
  ideaIds: string[];
}

/**
 * Evaluate a single condition against an idea
 */
function evaluateCondition(idea: DbIdea, condition: TriageCondition): boolean {
  const { field, operator, value } = condition;

  let fieldValue: number | string | null;

  switch (field) {
    case 'impact':
      fieldValue = idea.impact;
      break;
    case 'effort':
      fieldValue = idea.effort;
      break;
    case 'risk':
      fieldValue = idea.risk;
      break;
    case 'category':
      fieldValue = idea.category;
      break;
    case 'scan_type':
      fieldValue = idea.scan_type;
      break;
    case 'age_days': {
      const createdAt = new Date(idea.created_at).getTime();
      const now = Date.now();
      fieldValue = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
      break;
    }
    default:
      return false;
  }

  if (fieldValue === null || fieldValue === undefined) return false;

  switch (operator) {
    case 'gte':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;
    case 'lte':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;
    case 'eq':
      return fieldValue === value;
    case 'neq':
      return fieldValue !== value;
    case 'in':
      return Array.isArray(value) && value.includes(String(fieldValue));
    case 'not_in':
      return Array.isArray(value) && !value.includes(String(fieldValue));
    default:
      return false;
  }
}

/**
 * Check if an idea matches all conditions in a rule
 */
function ideaMatchesRule(idea: DbIdea, conditions: TriageCondition[]): boolean {
  if (conditions.length === 0) return false;
  return conditions.every(condition => evaluateCondition(idea, condition));
}

/**
 * Parse conditions JSON safely
 */
function parseConditions(conditionsJson: string): TriageCondition[] {
  try {
    const parsed = JSON.parse(conditionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Apply a triage action to an idea
 */
function applyAction(ideaId: string, action: TriageAction): boolean {
  switch (action) {
    case 'accept':
      return ideaDb.updateIdea(ideaId, { status: 'accepted' }) !== null;
    case 'reject':
      return ideaDb.updateIdea(ideaId, { status: 'rejected', user_feedback: 'Auto-rejected by triage rule' }) !== null;
    case 'archive':
      return ideaDb.updateIdea(ideaId, { status: 'rejected', user_feedback: 'Auto-archived by triage rule' }) !== null;
    default:
      return false;
  }
}

/**
 * Run all enabled triage rules against a set of ideas.
 * Uses database transaction for atomicity.
 * Returns results for each rule that fired.
 */
export function evaluateTriageRules(ideas: DbIdea[], projectId?: string): TriageResult[] {
  const rules = projectId
    ? triageRuleDb.getEnabledRulesForProject(projectId)
    : triageRuleDb.getEnabledRules();

  if (rules.length === 0 || ideas.length === 0) return [];

  // Only evaluate pending ideas
  const pendingIdeas = ideas.filter(i => i.status === 'pending');
  if (pendingIdeas.length === 0) return [];

  const results: TriageResult[] = [];
  // Track which ideas have already been acted on (first matching rule wins)
  const actedOn = new Set<string>();

  const db = getDatabase();

  const transaction = db.transaction(() => {
    for (const rule of rules) {
      const conditions = parseConditions(rule.conditions);
      if (conditions.length === 0) continue;

      const matchedIds: string[] = [];

      for (const idea of pendingIdeas) {
        if (actedOn.has(idea.id)) continue;
        if (ideaMatchesRule(idea, conditions)) {
          const success = applyAction(idea.id, rule.action);
          if (success) {
            matchedIds.push(idea.id);
            actedOn.add(idea.id);
          }
        }
      }

      if (matchedIds.length > 0) {
        triageRuleDb.recordFiring(rule.id, matchedIds.length);
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action,
          ideaIds: matchedIds,
        });
      }
    }
  });

  transaction();

  return results;
}

/**
 * Run triage rules for ideas from a specific scan.
 * Called after scan completion.
 */
export function evaluateTriageRulesForScan(scanId: string, projectId: string): TriageResult[] {
  const ideas = ideaDb.getIdeasByScanId(scanId);
  return evaluateTriageRules(ideas, projectId);
}

/**
 * Dry-run: preview which ideas would be affected without applying changes.
 */
export function previewTriageRules(ideas: DbIdea[], projectId?: string): TriageResult[] {
  const rules = projectId
    ? triageRuleDb.getEnabledRulesForProject(projectId)
    : triageRuleDb.getEnabledRules();

  if (rules.length === 0 || ideas.length === 0) return [];

  const pendingIdeas = ideas.filter(i => i.status === 'pending');
  if (pendingIdeas.length === 0) return [];

  const results: TriageResult[] = [];
  const actedOn = new Set<string>();

  for (const rule of rules) {
    const conditions = parseConditions(rule.conditions);
    if (conditions.length === 0) continue;

    const matchedIds: string[] = [];

    for (const idea of pendingIdeas) {
      if (actedOn.has(idea.id)) continue;
      if (ideaMatchesRule(idea, conditions)) {
        matchedIds.push(idea.id);
        actedOn.add(idea.id);
      }
    }

    if (matchedIds.length > 0) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        action: rule.action,
        ideaIds: matchedIds,
      });
    }
  }

  return results;
}
