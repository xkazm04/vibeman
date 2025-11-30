import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { ReflectionStats, ScanTypeStats, TimeWindow } from './types';

/**
 * Severity level for insights and recommendations
 */
export type InsightSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Category of insight for grouping and filtering
 */
export type InsightCategory =
  | 'performance'
  | 'trend'
  | 'recommendation'
  | 'anomaly'
  | 'opportunity';

/**
 * Individual actionable insight derived from analytics
 */
export interface ExecutiveInsight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  metric?: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'stable';
    trendPercent?: number;
  };
  recommendation?: string;
  relatedScanTypes?: ScanType[];
}

/**
 * Specialist (scan type) performance ranking
 */
export interface SpecialistRanking {
  scanType: ScanType;
  rank: number;
  score: number;
  acceptanceRatio: number;
  totalIdeas: number;
  trend: 'improving' | 'declining' | 'stable';
  recommendation: string;
}

/**
 * Recommended scan type with reasoning
 */
export interface ScanTypeRecommendation {
  scanType: ScanType;
  priority: 1 | 2 | 3;
  reason: string;
  expectedImpact: string;
  currentPerformance: 'strong' | 'moderate' | 'underutilized' | 'new';
}

/**
 * Executive summary narrative section
 */
export interface NarrativeSummary {
  headline: string;
  overview: string;
  keyFindings: string[];
  outlook: string;
}

/**
 * Complete executive insight report
 */
export interface ExecutiveInsightReport {
  generatedAt: number;
  timeWindow: TimeWindow | 'custom';
  filterContext: {
    projectId?: string | null;
    projectName?: string | null;
    contextId?: string | null;
    contextName?: string | null;
    dateRange?: {
      start: string | null;
      end: string | null;
    };
  };
  narrative: NarrativeSummary;
  insights: ExecutiveInsight[];
  specialistRankings: SpecialistRanking[];
  scanRecommendations: ScanTypeRecommendation[];
  kpiHighlights: {
    totalIdeas: number;
    acceptanceRate: number;
    topPerformer: ScanType | null;
    bottomPerformer: ScanType | null;
    mostActiveSpecialist: ScanType | null;
  };
}

/**
 * Configuration for insight generation
 */
export interface InsightGeneratorConfig {
  enableAI?: boolean;
  minIdeasForAnalysis?: number;
  acceptanceThresholds?: {
    excellent: number;
    good: number;
    poor: number;
  };
  trendThresholds?: {
    significant: number;
    moderate: number;
  };
}

/**
 * API request for executive insights
 */
export interface ExecutiveInsightRequest {
  projectId?: string | null;
  contextId?: string | null;
  timeWindow?: TimeWindow;
  startDate?: string | null;
  endDate?: string | null;
  enableAI?: boolean;
}

/**
 * API response for executive insights
 */
export interface ExecutiveInsightResponse {
  success: boolean;
  data?: ExecutiveInsightReport;
  error?: string;
}
