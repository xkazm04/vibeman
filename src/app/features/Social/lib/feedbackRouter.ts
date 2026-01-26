/**
 * Feedback Router
 * Applies configurable routing rules to automatically route feedback
 * to appropriate columns, teams, and handlers.
 */

import type { FeedbackItem, KanbanStatus, KanbanPriority, KanbanChannel } from './types/feedbackTypes';
import type { DevTeam, FeedbackClassification } from './types/aiTypes';
import type { ClassificationResult } from './feedbackClassifier';
import type { PriorityScore } from './priorityScorer';

export type RoutingConditionType =
  | 'classification'
  | 'priority'
  | 'channel'
  | 'team'
  | 'sentiment'
  | 'urgency'
  | 'confidence'
  | 'tag'
  | 'keyword'
  | 'author'
  | 'engagement'
  | 'custom';

export type RoutingOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'matches'; // regex

export interface RoutingCondition {
  type: RoutingConditionType;
  field?: string; // For nested fields like author.followers
  operator: RoutingOperator;
  value: unknown;
}

export interface RoutingAction {
  type: 'move_to_column' | 'assign_team' | 'set_priority' | 'add_tag' | 'flag_for_review' | 'notify' | 'auto_respond';
  target?: string;
  value?: unknown;
}

export interface RoutingRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number; // Higher priority rules are evaluated first
  conditions: RoutingCondition[];
  conditionLogic: 'and' | 'or'; // How to combine conditions
  actions: RoutingAction[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  matchCount?: number; // For analytics
}

export interface RoutingResult {
  itemId: string;
  matchedRules: Array<{
    ruleId: string;
    ruleName: string;
    actions: RoutingAction[];
  }>;
  finalColumn: KanbanStatus;
  finalPriority: KanbanPriority;
  assignedTeam?: DevTeam;
  addedTags: string[];
  flaggedForReview: boolean;
  notifications: string[];
}

export interface RoutingContext {
  item: FeedbackItem;
  classification?: ClassificationResult;
  priorityScore?: PriorityScore;
  sentiment?: { score: number; sentiment: string };
  urgency?: { level: string; score: number };
}

// Default routing rules
const DEFAULT_RULES: RoutingRule[] = [
  {
    id: 'critical-urgent',
    name: 'Critical Urgency Auto-Route',
    description: 'Route critical urgency items directly to manual review',
    enabled: true,
    priority: 100,
    conditions: [
      { type: 'urgency', operator: 'equals', value: 'critical' },
    ],
    conditionLogic: 'and',
    actions: [
      { type: 'move_to_column', target: 'manual' },
      { type: 'set_priority', value: 'critical' },
      { type: 'flag_for_review' },
      { type: 'notify', value: 'urgent-queue' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'low-confidence',
    name: 'Low Confidence Review',
    description: 'Flag items with low classification confidence for review',
    enabled: true,
    priority: 90,
    conditions: [
      { type: 'confidence', operator: 'less_than', value: 0.7 },
    ],
    conditionLogic: 'and',
    actions: [
      { type: 'flag_for_review' },
      { type: 'add_tag', value: 'low-confidence' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bug-auto-route',
    name: 'Bug Auto-Classification',
    description: 'Route high-confidence bugs to appropriate team',
    enabled: true,
    priority: 80,
    conditions: [
      { type: 'classification', operator: 'equals', value: 'bug' },
      { type: 'confidence', operator: 'greater_than', value: 0.8 },
    ],
    conditionLogic: 'and',
    actions: [
      { type: 'move_to_column', target: 'analyzed' },
      { type: 'add_tag', value: 'bug' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feature-request',
    name: 'Feature Request Routing',
    description: 'Route feature requests to product team',
    enabled: true,
    priority: 70,
    conditions: [
      { type: 'classification', operator: 'equals', value: 'feature' },
    ],
    conditionLogic: 'and',
    actions: [
      { type: 'move_to_column', target: 'analyzed' },
      { type: 'add_tag', value: 'feature-request' },
      { type: 'assign_team', target: 'growth' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'public-negative',
    name: 'Public Negative Feedback',
    description: 'Prioritize negative feedback on public channels',
    enabled: true,
    priority: 85,
    conditions: [
      { type: 'channel', operator: 'in', value: ['x', 'facebook', 'instagram', 'trustpilot'] },
      { type: 'sentiment', operator: 'less_than', value: -0.3 },
    ],
    conditionLogic: 'and',
    actions: [
      { type: 'set_priority', value: 'high' },
      { type: 'add_tag', value: 'public-negative' },
      { type: 'notify', value: 'social-team' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vip-customer',
    name: 'VIP Customer Handling',
    description: 'Prioritize verified or high-follower users',
    enabled: true,
    priority: 95,
    conditions: [
      { type: 'author', field: 'verified', operator: 'equals', value: true },
    ],
    conditionLogic: 'or',
    actions: [
      { type: 'set_priority', value: 'high' },
      { type: 'add_tag', value: 'vip' },
      { type: 'notify', value: 'customer-success' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'praise-auto-done',
    name: 'Praise Auto-Complete',
    description: 'Automatically close simple praise items',
    enabled: true,
    priority: 60,
    conditions: [
      { type: 'classification', operator: 'equals', value: 'praise' },
      { type: 'confidence', operator: 'greater_than', value: 0.85 },
    ],
    conditionLogic: 'and',
    actions: [
      { type: 'move_to_column', target: 'done' },
      { type: 'add_tag', value: 'praise' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// In-memory rules store (would be persisted to DB in production)
let rules: RoutingRule[] = [...DEFAULT_RULES];

/**
 * Get all routing rules
 */
export function getRoutingRules(): RoutingRule[] {
  return [...rules].sort((a, b) => b.priority - a.priority);
}

/**
 * Get a single rule by ID
 */
export function getRoutingRule(id: string): RoutingRule | undefined {
  return rules.find(r => r.id === id);
}

/**
 * Add or update a routing rule
 */
export function saveRoutingRule(rule: RoutingRule): void {
  const index = rules.findIndex(r => r.id === rule.id);
  if (index >= 0) {
    rules[index] = { ...rule, updatedAt: new Date().toISOString() };
  } else {
    rules.push({ ...rule, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
}

/**
 * Delete a routing rule
 */
export function deleteRoutingRule(id: string): boolean {
  const index = rules.findIndex(r => r.id === id);
  if (index >= 0) {
    rules.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Reset to default rules
 */
export function resetToDefaultRules(): void {
  rules = [...DEFAULT_RULES];
}

/**
 * Apply routing rules to a feedback item
 */
export function routeFeedback(context: RoutingContext): RoutingResult {
  const result: RoutingResult = {
    itemId: context.item.id,
    matchedRules: [],
    finalColumn: context.item.status,
    finalPriority: context.item.priority,
    assignedTeam: context.item.analysis?.assignedTeam,
    addedTags: [],
    flaggedForReview: false,
    notifications: [],
  };

  // Get enabled rules sorted by priority
  const activeRules = rules
    .filter(r => r.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of activeRules) {
    if (evaluateConditions(rule.conditions, rule.conditionLogic, context)) {
      result.matchedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        actions: rule.actions,
      });

      // Apply actions
      for (const action of rule.actions) {
        applyAction(action, result);
      }

      // Increment match count
      const ruleIndex = rules.findIndex(r => r.id === rule.id);
      if (ruleIndex >= 0) {
        rules[ruleIndex].matchCount = (rules[ruleIndex].matchCount || 0) + 1;
      }
    }
  }

  return result;
}

/**
 * Evaluate all conditions for a rule
 */
function evaluateConditions(
  conditions: RoutingCondition[],
  logic: 'and' | 'or',
  context: RoutingContext
): boolean {
  if (conditions.length === 0) return false;

  if (logic === 'and') {
    return conditions.every(c => evaluateCondition(c, context));
  } else {
    return conditions.some(c => evaluateCondition(c, context));
  }
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition: RoutingCondition, context: RoutingContext): boolean {
  const value = getConditionValue(condition, context);

  switch (condition.operator) {
    case 'equals':
      return value === condition.value;

    case 'not_equals':
      return value !== condition.value;

    case 'contains':
      if (typeof value === 'string') {
        return value.toLowerCase().includes(String(condition.value).toLowerCase());
      }
      if (Array.isArray(value)) {
        return value.includes(condition.value);
      }
      return false;

    case 'not_contains':
      if (typeof value === 'string') {
        return !value.toLowerCase().includes(String(condition.value).toLowerCase());
      }
      if (Array.isArray(value)) {
        return !value.includes(condition.value);
      }
      return true;

    case 'greater_than':
      return typeof value === 'number' && value > Number(condition.value);

    case 'less_than':
      return typeof value === 'number' && value < Number(condition.value);

    case 'in':
      if (Array.isArray(condition.value)) {
        return condition.value.includes(value);
      }
      return false;

    case 'not_in':
      if (Array.isArray(condition.value)) {
        return !condition.value.includes(value);
      }
      return true;

    case 'matches':
      if (typeof value === 'string' && typeof condition.value === 'string') {
        try {
          const regex = new RegExp(condition.value, 'i');
          return regex.test(value);
        } catch {
          return false;
        }
      }
      return false;

    default:
      return false;
  }
}

/**
 * Get the value for a condition from the context
 */
function getConditionValue(condition: RoutingCondition, context: RoutingContext): unknown {
  const { item, classification, priorityScore, sentiment, urgency } = context;

  switch (condition.type) {
    case 'classification':
      return classification?.classification;

    case 'priority':
      return priorityScore?.priority || item.priority;

    case 'channel':
      return item.channel;

    case 'team':
      return classification?.suggestedTeam || item.analysis?.assignedTeam;

    case 'sentiment':
      return sentiment?.score;

    case 'urgency':
      return urgency?.level;

    case 'confidence':
      return classification?.confidence;

    case 'tag':
      return classification?.tags || item.tags;

    case 'keyword': {
      const text = `${item.content.subject || ''} ${item.content.body}`.toLowerCase();
      return text;
    }

    case 'author':
      if (condition.field) {
        return getNestedValue(item.author, condition.field);
      }
      return item.author;

    case 'engagement':
      if (condition.field && item.engagement) {
        return getNestedValue(item.engagement, condition.field);
      }
      return item.engagement;

    default:
      return undefined;
  }
}

/**
 * Get a nested value from an object
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Apply a routing action to the result
 */
function applyAction(action: RoutingAction, result: RoutingResult): void {
  switch (action.type) {
    case 'move_to_column':
      if (action.target) {
        result.finalColumn = action.target as KanbanStatus;
      }
      break;

    case 'assign_team':
      if (action.target) {
        result.assignedTeam = action.target as DevTeam;
      }
      break;

    case 'set_priority':
      if (action.value) {
        result.finalPriority = action.value as KanbanPriority;
      }
      break;

    case 'add_tag':
      if (action.value && typeof action.value === 'string') {
        if (!result.addedTags.includes(action.value)) {
          result.addedTags.push(action.value);
        }
      }
      break;

    case 'flag_for_review':
      result.flaggedForReview = true;
      break;

    case 'notify':
      if (action.value && typeof action.value === 'string') {
        result.notifications.push(action.value);
      }
      break;
  }
}

/**
 * Batch route multiple feedback items
 */
export function routeFeedbackBatch(contexts: RoutingContext[]): Map<string, RoutingResult> {
  const results = new Map<string, RoutingResult>();

  for (const context of contexts) {
    results.set(context.item.id, routeFeedback(context));
  }

  return results;
}

/**
 * Get routing statistics
 */
export function getRoutingStats(): {
  totalRules: number;
  activeRules: number;
  rulesByMatchCount: Array<{ id: string; name: string; matchCount: number }>;
} {
  const sorted = [...rules]
    .filter(r => r.matchCount !== undefined && r.matchCount > 0)
    .sort((a, b) => (b.matchCount || 0) - (a.matchCount || 0))
    .map(r => ({ id: r.id, name: r.name, matchCount: r.matchCount || 0 }));

  return {
    totalRules: rules.length,
    activeRules: rules.filter(r => r.enabled).length,
    rulesByMatchCount: sorted,
  };
}

/**
 * Validate a routing rule before saving
 */
export function validateRoutingRule(rule: Partial<RoutingRule>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rule.name || rule.name.trim().length === 0) {
    errors.push('Rule name is required');
  }

  if (!rule.conditions || rule.conditions.length === 0) {
    errors.push('At least one condition is required');
  }

  if (!rule.actions || rule.actions.length === 0) {
    errors.push('At least one action is required');
  }

  if (rule.priority !== undefined && (rule.priority < 0 || rule.priority > 100)) {
    errors.push('Priority must be between 0 and 100');
  }

  return { valid: errors.length === 0, errors };
}
