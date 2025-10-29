import { ScanType } from '@/app/features/Ideas/lib/scanTypes';

export interface IdeaStats {
  pending: number;
  accepted: number;
  rejected: number;
  implemented: number;
  total: number;
  acceptanceRatio: number; // (accepted + implemented) / total * 100
}

export interface ScanTypeStats extends IdeaStats {
  scanType: ScanType;
}

export interface FilterState {
  projectId: string | null;
  contextId: string | null;
}

export interface ReflectionStats {
  scanTypes: ScanTypeStats[];
  overall: IdeaStats;
  projects: Array<{
    projectId: string;
    name: string;
    totalIdeas: number;
  }>;
  contexts: Array<{
    contextId: string;
    name: string;
    totalIdeas: number;
  }>;
}
