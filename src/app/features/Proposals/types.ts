import { DbDirection } from '@/app/db';

export interface Proposal {
  id: string;
  title: string;
  rationale: string;
  timestamp: Date;
  status: 'pending' | 'accepted' | 'declined';
}

export interface ProposalState {
  currentProposal: Proposal | null;
  isVisible: boolean;
  isProcessing: boolean;
}

/** Direction mapped to carousel-friendly shape */
export interface DirectionProposal {
  id: string;
  title: string;           // summary
  rationale: string;        // problem_statement or first 200 chars of direction
  fullContent: string;      // full markdown direction
  contextLabel: string;     // context_map_title or context_name
  status: DbDirection['status'];
  pairId: string | null;
  pairLabel: 'A' | 'B' | null;
  problemStatement: string | null;
  effort: number | null;
  impact: number | null;
  createdAt: string;
  /** Original direction for API calls */
  _direction: DbDirection;
}

/** Map a DbDirection to a DirectionProposal */
export function toDirectionProposal(d: DbDirection): DirectionProposal {
  return {
    id: d.id,
    title: d.summary || d.direction.slice(0, 80),
    rationale: d.problem_statement || d.direction.slice(0, 250),
    fullContent: d.direction,
    contextLabel: d.context_name || d.context_map_title,
    status: d.status,
    pairId: d.pair_id,
    pairLabel: d.pair_label,
    problemStatement: d.problem_statement,
    effort: d.effort,
    impact: d.impact,
    createdAt: d.created_at,
    _direction: d,
  };
}
