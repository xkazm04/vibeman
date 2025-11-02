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

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
  label?: string;
}

export interface FilterState {
  projectId: string | null;
  contextId: string | null;
  dateRange?: DateRange;
}

export interface ComparisonFilterState extends FilterState {
  comparisonMode: boolean;
  period1?: DateRange;
  period2?: DateRange;
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

export interface ComparisonStats {
  period1: ReflectionStats;
  period2: ReflectionStats;
  period1Label: string;
  period2Label: string;
  differences: {
    scanTypes: Array<{
      scanType: ScanType;
      acceptanceRatioDiff: number;
      totalDiff: number;
    }>;
    overallAcceptanceDiff: number;
    totalIdeasDiff: number;
  };
}
