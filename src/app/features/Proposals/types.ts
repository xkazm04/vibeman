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