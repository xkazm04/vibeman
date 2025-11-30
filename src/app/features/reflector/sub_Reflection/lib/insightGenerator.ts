import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { ReflectionStats, ScanTypeStats, TimeWindow } from './types';
import { SCAN_TYPE_CONFIG } from './config';
import {
  ExecutiveInsight,
  ExecutiveInsightReport,
  InsightCategory,
  InsightGeneratorConfig,
  InsightSeverity,
  NarrativeSummary,
  ScanTypeRecommendation,
  SpecialistRanking,
} from './executiveInsightTypes';

const DEFAULT_CONFIG: InsightGeneratorConfig = {
  enableAI: false,
  minIdeasForAnalysis: 5,
  acceptanceThresholds: {
    excellent: 70,
    good: 50,
    poor: 30,
  },
  trendThresholds: {
    significant: 20,
    moderate: 10,
  },
};

/**
 * Generate a unique insight ID
 */
function generateInsightId(): string {
  return `insight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Determine severity based on acceptance ratio
 */
function determineAcceptanceSeverity(
  ratio: number,
  thresholds: InsightGeneratorConfig['acceptanceThresholds']
): InsightSeverity {
  const t = thresholds!;
  if (ratio >= t.excellent) return 'info';
  if (ratio >= t.good) return 'low';
  if (ratio >= t.poor) return 'medium';
  if (ratio >= 15) return 'high';
  return 'critical';
}

/**
 * Calculate performance score for ranking
 */
function calculatePerformanceScore(stats: ScanTypeStats): number {
  // Weighted score: acceptance ratio (60%) + volume factor (40%)
  const volumeFactor = Math.min(stats.total / 50, 1) * 100;
  return stats.acceptanceRatio * 0.6 + volumeFactor * 0.4;
}

/**
 * Generate specialist rankings from scan type stats
 */
function generateSpecialistRankings(
  scanTypes: ScanTypeStats[],
  config: InsightGeneratorConfig
): SpecialistRanking[] {
  const thresholds = config.acceptanceThresholds!;

  return scanTypes
    .map((stats) => {
      const score = calculatePerformanceScore(stats);
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      let recommendation = '';

      const label = SCAN_TYPE_CONFIG[stats.scanType]?.label || stats.scanType;

      if (stats.acceptanceRatio >= thresholds.excellent) {
        recommendation = `${label} is performing excellently. Continue leveraging this specialist for high-value insights.`;
      } else if (stats.acceptanceRatio >= thresholds.good) {
        recommendation = `${label} shows solid performance. Consider increasing scan frequency for more opportunities.`;
      } else if (stats.acceptanceRatio >= thresholds.poor) {
        recommendation = `${label} has moderate performance. Review rejected ideas to calibrate expectations.`;
      } else if (stats.total >= config.minIdeasForAnalysis!) {
        recommendation = `${label} needs attention. Low acceptance suggests misalignment with project goals.`;
        trend = 'declining';
      } else {
        recommendation = `${label} has limited data. Run more scans to establish a performance baseline.`;
      }

      return {
        scanType: stats.scanType,
        rank: 0, // Will be set after sorting
        score,
        acceptanceRatio: stats.acceptanceRatio,
        totalIdeas: stats.total,
        trend,
        recommendation,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((ranking, index) => ({
      ...ranking,
      rank: index + 1,
    }));
}

/**
 * Generate scan type recommendations based on current stats
 */
function generateScanRecommendations(
  scanTypes: ScanTypeStats[],
  config: InsightGeneratorConfig
): ScanTypeRecommendation[] {
  const recommendations: ScanTypeRecommendation[] = [];
  const thresholds = config.acceptanceThresholds!;

  // Find underutilized high performers
  const highPerformers = scanTypes.filter(
    (s) => s.acceptanceRatio >= thresholds.excellent && s.total < 20
  );

  highPerformers.forEach((stats) => {
    const label = SCAN_TYPE_CONFIG[stats.scanType]?.label || stats.scanType;
    recommendations.push({
      scanType: stats.scanType,
      priority: 1,
      reason: `${label} has a ${stats.acceptanceRatio}% acceptance rate but only ${stats.total} ideas generated.`,
      expectedImpact: 'High potential for actionable insights with increased scan frequency.',
      currentPerformance: 'strong',
    });
  });

  // Find moderate performers that could improve with more data
  const moderatePerformers = scanTypes.filter(
    (s) =>
      s.acceptanceRatio >= thresholds.poor &&
      s.acceptanceRatio < thresholds.excellent &&
      s.total >= 10
  );

  moderatePerformers.slice(0, 2).forEach((stats) => {
    const label = SCAN_TYPE_CONFIG[stats.scanType]?.label || stats.scanType;
    recommendations.push({
      scanType: stats.scanType,
      priority: 2,
      reason: `${label} shows consistent ${stats.acceptanceRatio}% acceptance across ${stats.total} ideas.`,
      expectedImpact: 'Reliable source of implementable improvements.',
      currentPerformance: 'moderate',
    });
  });

  // Find scan types with low activity that might be valuable
  const lowActivity = scanTypes.filter(
    (s) => s.total < config.minIdeasForAnalysis! && s.total > 0
  );

  lowActivity.slice(0, 2).forEach((stats) => {
    const label = SCAN_TYPE_CONFIG[stats.scanType]?.label || stats.scanType;
    recommendations.push({
      scanType: stats.scanType,
      priority: 3,
      reason: `${label} has only ${stats.total} ideas - insufficient data for performance assessment.`,
      expectedImpact: 'Need more scans to determine value for your codebase.',
      currentPerformance: 'underutilized',
    });
  });

  return recommendations.slice(0, 5);
}

/**
 * Generate individual insights from stats
 */
function generateInsights(
  stats: ReflectionStats,
  config: InsightGeneratorConfig
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];
  const thresholds = config.acceptanceThresholds!;

  // Overall acceptance insight
  const overallSeverity = determineAcceptanceSeverity(
    stats.overall.acceptanceRatio,
    thresholds
  );

  insights.push({
    id: generateInsightId(),
    category: 'performance',
    severity: overallSeverity,
    title: 'Overall Acceptance Rate',
    description:
      stats.overall.acceptanceRatio >= thresholds.good
        ? `Your overall acceptance rate of ${stats.overall.acceptanceRatio}% indicates strong alignment between AI suggestions and your development priorities.`
        : `Your overall acceptance rate of ${stats.overall.acceptanceRatio}% suggests opportunities to improve idea relevance or adjust specialist configurations.`,
    metric: {
      label: 'Acceptance Rate',
      value: `${stats.overall.acceptanceRatio}%`,
      trend: stats.overall.acceptanceRatio >= thresholds.good ? 'up' : 'down',
    },
  });

  // Volume insight
  if (stats.overall.total > 0) {
    const implementationRate =
      stats.overall.total > 0
        ? Math.round((stats.overall.implemented / stats.overall.total) * 100)
        : 0;

    insights.push({
      id: generateInsightId(),
      category: 'performance',
      severity: implementationRate >= 20 ? 'info' : 'medium',
      title: 'Implementation Rate',
      description:
        implementationRate >= 20
          ? `${implementationRate}% of ideas have been implemented, demonstrating effective idea-to-action conversion.`
          : `Only ${implementationRate}% implementation rate suggests a backlog of accepted ideas awaiting execution.`,
      metric: {
        label: 'Implemented',
        value: `${stats.overall.implemented}/${stats.overall.total}`,
      },
      recommendation:
        implementationRate < 20
          ? 'Consider prioritizing accepted ideas or adjusting scan frequency to match team capacity.'
          : undefined,
    });
  }

  // Top performer insight
  const topPerformer = [...stats.scanTypes].sort(
    (a, b) => b.acceptanceRatio - a.acceptanceRatio
  )[0];

  if (topPerformer && topPerformer.total >= config.minIdeasForAnalysis!) {
    const label = SCAN_TYPE_CONFIG[topPerformer.scanType]?.label || topPerformer.scanType;
    insights.push({
      id: generateInsightId(),
      category: 'opportunity',
      severity: 'info',
      title: 'Star Performer',
      description: `${label} leads with ${topPerformer.acceptanceRatio}% acceptance across ${topPerformer.total} ideas.`,
      metric: {
        label: label,
        value: `${topPerformer.acceptanceRatio}%`,
        trend: 'up',
      },
      relatedScanTypes: [topPerformer.scanType],
      recommendation: `Increase ${label} scan frequency to capitalize on its effectiveness.`,
    });
  }

  // Struggling performer insight
  const strugglers = stats.scanTypes.filter(
    (s) =>
      s.acceptanceRatio < thresholds.poor && s.total >= config.minIdeasForAnalysis!
  );

  if (strugglers.length > 0) {
    const worstPerformer = strugglers.sort(
      (a, b) => a.acceptanceRatio - b.acceptanceRatio
    )[0];
    const label = SCAN_TYPE_CONFIG[worstPerformer.scanType]?.label || worstPerformer.scanType;

    insights.push({
      id: generateInsightId(),
      category: 'anomaly',
      severity: 'high',
      title: 'Performance Concern',
      description: `${label} has only ${worstPerformer.acceptanceRatio}% acceptance despite ${worstPerformer.total} ideas generated.`,
      metric: {
        label: label,
        value: `${worstPerformer.acceptanceRatio}%`,
        trend: 'down',
      },
      relatedScanTypes: [worstPerformer.scanType],
      recommendation: `Review ${label} configuration or consider reducing its scan priority.`,
    });
  }

  // Diversity insight
  const activeSpecialists = stats.scanTypes.filter((s) => s.total > 0).length;
  const totalSpecialists = Object.keys(SCAN_TYPE_CONFIG).length;

  if (activeSpecialists < totalSpecialists * 0.5) {
    insights.push({
      id: generateInsightId(),
      category: 'recommendation',
      severity: 'medium',
      title: 'Specialist Coverage',
      description: `Only ${activeSpecialists} of ${totalSpecialists} specialists are active. Broader coverage may uncover new opportunities.`,
      metric: {
        label: 'Active Specialists',
        value: `${activeSpecialists}/${totalSpecialists}`,
      },
      recommendation:
        'Enable additional scan types to get a more comprehensive analysis of your codebase.',
    });
  }

  // Pending ideas insight
  if (stats.overall.pending > 10) {
    insights.push({
      id: generateInsightId(),
      category: 'trend',
      severity: stats.overall.pending > 50 ? 'high' : 'medium',
      title: 'Decision Backlog',
      description: `${stats.overall.pending} ideas are awaiting review. Large backlogs can obscure valuable insights.`,
      metric: {
        label: 'Pending Ideas',
        value: stats.overall.pending,
      },
      recommendation:
        'Schedule time to review pending ideas or use Tinder mode for rapid decision-making.',
    });
  }

  return insights;
}

/**
 * Generate narrative summary from stats
 */
function generateNarrativeSummary(
  stats: ReflectionStats,
  rankings: SpecialistRanking[],
  config: InsightGeneratorConfig
): NarrativeSummary {
  const thresholds = config.acceptanceThresholds!;
  const activeSpecialists = stats.scanTypes.filter((s) => s.total > 0);
  const topRanked = rankings[0];

  // Generate headline
  let headline: string;
  if (stats.overall.acceptanceRatio >= thresholds.excellent) {
    headline = 'Exceptional Performance Across the Board';
  } else if (stats.overall.acceptanceRatio >= thresholds.good) {
    headline = 'Solid Progress with Room for Optimization';
  } else if (stats.overall.acceptanceRatio >= thresholds.poor) {
    headline = 'Moderate Results Indicate Calibration Needs';
  } else {
    headline = 'Performance Review Required';
  }

  // Generate overview
  const overviewParts: string[] = [];

  overviewParts.push(
    `Your AI specialists have generated ${stats.overall.total} ideas with an overall acceptance rate of ${stats.overall.acceptanceRatio}%.`
  );

  if (stats.overall.implemented > 0) {
    const implRate = Math.round(
      (stats.overall.implemented / stats.overall.total) * 100
    );
    overviewParts.push(
      `${stats.overall.implemented} ideas (${implRate}%) have been implemented, contributing to codebase improvements.`
    );
  }

  if (topRanked) {
    const topLabel = SCAN_TYPE_CONFIG[topRanked.scanType]?.label || topRanked.scanType;
    overviewParts.push(
      `${topLabel} leads the pack with ${topRanked.acceptanceRatio}% acceptance.`
    );
  }

  // Generate key findings
  const keyFindings: string[] = [];

  if (activeSpecialists.length > 0) {
    const avgAcceptance = Math.round(
      activeSpecialists.reduce((sum, s) => sum + s.acceptanceRatio, 0) /
        activeSpecialists.length
    );
    keyFindings.push(
      `${activeSpecialists.length} active specialists averaging ${avgAcceptance}% acceptance rate.`
    );
  }

  const highPerformers = stats.scanTypes.filter(
    (s) => s.acceptanceRatio >= thresholds.excellent && s.total >= 5
  );
  if (highPerformers.length > 0) {
    keyFindings.push(
      `${highPerformers.length} specialist${highPerformers.length > 1 ? 's' : ''} performing at excellence level (70%+ acceptance).`
    );
  }

  const lowPerformers = stats.scanTypes.filter(
    (s) => s.acceptanceRatio < thresholds.poor && s.total >= 5
  );
  if (lowPerformers.length > 0) {
    keyFindings.push(
      `${lowPerformers.length} specialist${lowPerformers.length > 1 ? 's' : ''} below performance threshold - review recommended.`
    );
  }

  if (stats.overall.pending > 0) {
    keyFindings.push(`${stats.overall.pending} ideas pending review.`);
  }

  // Generate outlook
  let outlook: string;
  if (stats.overall.acceptanceRatio >= thresholds.excellent) {
    outlook =
      'Continue current strategies while exploring underutilized specialists for new opportunities.';
  } else if (stats.overall.acceptanceRatio >= thresholds.good) {
    outlook =
      'Focus on top performers while gradually improving or deprioritizing low-performing specialists.';
  } else if (stats.overall.acceptanceRatio >= thresholds.poor) {
    outlook =
      'Review specialist configurations and project context alignment to improve idea relevance.';
  } else {
    outlook =
      'Consider pausing low-value scans and reassessing specialist-project fit before continuing.';
  }

  return {
    headline,
    overview: overviewParts.join(' '),
    keyFindings,
    outlook,
  };
}

/**
 * Main function to generate executive insight report
 */
export function generateExecutiveInsightReport(
  stats: ReflectionStats,
  options?: {
    timeWindow?: TimeWindow | 'custom';
    projectId?: string | null;
    projectName?: string | null;
    contextId?: string | null;
    contextName?: string | null;
    dateRange?: { start: string | null; end: string | null };
    config?: Partial<InsightGeneratorConfig>;
  }
): ExecutiveInsightReport {
  const config: InsightGeneratorConfig = {
    ...DEFAULT_CONFIG,
    ...options?.config,
  };

  const rankings = generateSpecialistRankings(stats.scanTypes, config);
  const recommendations = generateScanRecommendations(stats.scanTypes, config);
  const insights = generateInsights(stats, config);
  const narrative = generateNarrativeSummary(stats, rankings, config);

  // Calculate KPI highlights
  const sortedByAcceptance = [...stats.scanTypes]
    .filter((s) => s.total >= (config.minIdeasForAnalysis || 5))
    .sort((a, b) => b.acceptanceRatio - a.acceptanceRatio);

  const sortedByVolume = [...stats.scanTypes].sort((a, b) => b.total - a.total);

  return {
    generatedAt: Date.now(),
    timeWindow: options?.timeWindow || 'all',
    filterContext: {
      projectId: options?.projectId,
      projectName: options?.projectName,
      contextId: options?.contextId,
      contextName: options?.contextName,
      dateRange: options?.dateRange,
    },
    narrative,
    insights,
    specialistRankings: rankings,
    scanRecommendations: recommendations,
    kpiHighlights: {
      totalIdeas: stats.overall.total,
      acceptanceRate: stats.overall.acceptanceRatio,
      topPerformer: sortedByAcceptance[0]?.scanType || null,
      bottomPerformer:
        sortedByAcceptance.length > 1
          ? sortedByAcceptance[sortedByAcceptance.length - 1]?.scanType
          : null,
      mostActiveSpecialist: sortedByVolume[0]?.scanType || null,
    },
  };
}
