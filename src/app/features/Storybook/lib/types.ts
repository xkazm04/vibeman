export interface ComponentInfo {
  name: string;
  path: string;
  category: string;
  hasExamples: boolean;
  hasStories: boolean;
  lineCount: number;
  exports: string[];
}

export type MatchStatus = 'matched' | 'partial' | 'missing' | 'unique';

export interface ComponentMatch {
  storybookComponent: ComponentInfo | null;
  vibemanComponent: ComponentInfo | null;
  status: MatchStatus;
  similarity: number; // 0-100
}

export interface CoverageStats {
  matched: number;
  partial: number;
  missing: number;
  unique: number;
  percentage: number;
}

export interface ComponentCategory {
  name: string;
  components: ComponentMatch[];
  coveragePercentage: number;
}
