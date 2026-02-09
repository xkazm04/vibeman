/**
 * Shared types for BaseAnalysisAgent / BaseAnalysisRepository
 */

export type AnalysisSessionStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Minimum shape every analysis DB record must satisfy.
 * Concrete types (DbExecutiveAnalysis, DbArchitectureAnalysisSession) extend this.
 */
export interface BaseAnalysisRecord {
  id: string;
  status: AnalysisSessionStatus;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Repository contract that every analysis repository must implement.
 * TRecord is the concrete DB row type; TCreateInput is the creation input;
 * TCompleteData is the data passed when completing an analysis.
 */
export interface AnalysisRepositoryContract<
  TRecord extends BaseAnalysisRecord,
  TCreateInput,
  TCompleteData,
> {
  getById(id: string): TRecord | null;
  create(input: TCreateInput): TRecord;
  startAnalysis(id: string, ...args: unknown[]): TRecord | null;
  completeAnalysis(id: string, data: TCompleteData): TRecord | null;
  failAnalysis(id: string, errorMessage: string): TRecord | null;
  delete(id: string): boolean;
}
