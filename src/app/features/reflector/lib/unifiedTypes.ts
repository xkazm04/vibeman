/**
 * Unified Types for Ideas and Directions
 *
 * These types enable the Reflector module to display both Ideas and Directions
 * in a unified manner across Weekly, Implemented, and Stats views.
 */

import { DbIdea, DbDirection } from '@/app/db/models/types';

// Filter types
export type SuggestionType = 'idea' | 'direction';
export type SuggestionFilter = 'ideas' | 'directions' | 'both';

/**
 * Unified representation of an Idea or Direction for display purposes
 */
export interface UnifiedSuggestion {
  type: SuggestionType;
  id: string;
  projectId: string;
  title: string;           // idea.title or direction.summary
  description: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  source: string;          // scan_type for ideas, context_map_title for directions
  sourceId: string;        // scan_id or context_map_id
  createdAt: string;
  implementedAt: string | null;  // null for directions
  // Optional fields (null for directions)
  effort: number | null;
  impact: number | null;
  risk: number | null;
  // Original data for drill-down
  originalIdea?: DbIdea;
  originalDirection?: DbDirection;
}

/**
 * Status counts for a single type (ideas or directions)
 */
export interface StatusCounts {
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
  acceptanceRatio: number;
}

/**
 * Status counts for ideas (includes implemented)
 */
export interface IdeaStatusCounts extends StatusCounts {
  implemented: number;
}

/**
 * Combined stats for unified display
 */
export interface UnifiedStats {
  ideas: IdeaStatusCounts;
  directions: StatusCounts;
  combined: {
    pending: number;
    accepted: number;
    rejected: number;
    implemented: number;  // Ideas only
    total: number;
    acceptanceRatio: number;
  };
}

/**
 * Daily breakdown for charts
 */
export interface DailySuggestionStats {
  date: string;
  ideas: IdeaStatusCounts;
  directions: StatusCounts;
  combined: {
    pending: number;
    accepted: number;
    rejected: number;
    implemented: number;
    total: number;
  };
}

/**
 * Source breakdown (scan_type for ideas, context_map for directions)
 */
export interface SourceStats {
  type: SuggestionType;
  sourceId: string;
  sourceName: string;
  pending: number;
  accepted: number;
  rejected: number;
  implemented?: number;  // Ideas only
  total: number;
  acceptanceRatio: number;
}

/**
 * Convert a DbIdea to UnifiedSuggestion
 */
export function ideaToUnified(idea: DbIdea): UnifiedSuggestion {
  return {
    type: 'idea',
    id: idea.id,
    projectId: idea.project_id,
    title: idea.title,
    description: idea.description,
    status: idea.status,
    source: idea.scan_type,
    sourceId: idea.scan_id,
    createdAt: idea.created_at,
    implementedAt: idea.implemented_at,
    effort: idea.effort,
    impact: idea.impact,
    risk: idea.risk,
    originalIdea: idea
  };
}

/**
 * Convert a DbDirection to UnifiedSuggestion
 */
export function directionToUnified(direction: DbDirection): UnifiedSuggestion {
  return {
    type: 'direction',
    id: direction.id,
    projectId: direction.project_id,
    title: direction.summary,
    description: direction.direction,
    status: direction.status === 'processing' ? 'pending' : direction.status,
    source: direction.context_map_title,
    sourceId: direction.context_map_id,
    createdAt: direction.created_at,
    implementedAt: null,  // Directions don't have implemented status
    effort: null,
    impact: null,
    risk: null,
    originalDirection: direction
  };
}

/**
 * Type guard to check if a suggestion is an idea
 */
export function isIdeaSuggestion(suggestion: UnifiedSuggestion): boolean {
  return suggestion.type === 'idea';
}

/**
 * Type guard to check if a suggestion is a direction
 */
export function isDirectionSuggestion(suggestion: UnifiedSuggestion): boolean {
  return suggestion.type === 'direction';
}

/**
 * Calculate combined acceptance ratio
 * For ideas: (accepted + implemented) / total
 * For directions: accepted / total
 * Combined: weighted by totals
 */
export function calculateCombinedAcceptanceRatio(
  ideas: IdeaStatusCounts,
  directions: StatusCounts
): number {
  const ideaAccepted = ideas.accepted + ideas.implemented;
  const directionAccepted = directions.accepted;
  const totalAccepted = ideaAccepted + directionAccepted;
  const totalItems = ideas.total + directions.total;

  return totalItems > 0 ? Math.round((totalAccepted / totalItems) * 100) : 0;
}

/**
 * Merge ideas and directions stats into unified stats
 */
export function mergeStats(
  ideas: IdeaStatusCounts,
  directions: StatusCounts
): UnifiedStats {
  return {
    ideas,
    directions,
    combined: {
      pending: ideas.pending + directions.pending,
      accepted: ideas.accepted + directions.accepted,
      rejected: ideas.rejected + directions.rejected,
      implemented: ideas.implemented,  // Only ideas have implemented
      total: ideas.total + directions.total,
      acceptanceRatio: calculateCombinedAcceptanceRatio(ideas, directions)
    }
  };
}

/**
 * Filter suggestions by type
 */
export function filterByType(
  suggestions: UnifiedSuggestion[],
  filter: SuggestionFilter
): UnifiedSuggestion[] {
  if (filter === 'both') return suggestions;
  if (filter === 'ideas') return suggestions.filter(s => s.type === 'idea');
  return suggestions.filter(s => s.type === 'direction');
}
