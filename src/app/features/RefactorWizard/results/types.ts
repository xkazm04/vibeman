import type { RefactorOpportunity } from '@/stores/refactorStore';

export type ResultId = string;

export type ResultsChunk = RefactorOpportunity[];

export interface ResultsIndex {
  bySeverity: Map<RefactorOpportunity['severity'], ResultId[]>;
  byCategory: Map<RefactorOpportunity['category'], ResultId[]>;
  byFile: Map<string, ResultId[]>;
}

