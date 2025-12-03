/**
 * Mind-Meld Analyzer
 * Analyzes developer decisions and generates personalized insights
 */

import {
  developerProfileDb,
  developerDecisionDb,
  learningInsightDb,
  skillTrackingDb,
  codePatternUsageDb,
  consistencyRuleDb,
} from '@/app/db';
import type {
  DbDeveloperProfile,
  DbDeveloperDecision,
  DbLearningInsight,
  DbSkillTracking,
} from '@/app/db/models/types';

export interface PreferenceScore {
  scanType: string;
  acceptanceRate: number;
  sampleCount: number;
  recommendation: 'preferred' | 'neutral' | 'avoided';
}

export interface CategoryPreference {
  category: string;
  acceptanceRate: number;
  sampleCount: number;
  averageEffort: number;
  averageImpact: number;
}

export interface PredictionResult {
  willAccept: boolean;
  confidence: number;
  reasoning: string;
  basedOn: {
    scanTypeMatch: number;
    categoryMatch: number;
    effortImpactMatch: number;
  };
}

export interface DeveloperInsights {
  profile: DbDeveloperProfile;
  scanTypePreferences: PreferenceScore[];
  categoryPreferences: CategoryPreference[];
  topAcceptedPatterns: string[];
  topRejectedPatterns: string[];
  skills: DbSkillTracking[];
  activeInsights: DbLearningInsight[];
  recentDecisionPatterns: {
    totalDecisions: number;
    acceptanceRate: number;
    topAcceptedCategories: string[];
    topRejectedCategories: string[];
  };
}

/**
 * Analyze developer preferences and generate insights
 */
export async function analyzeDeveloperPreferences(
  projectId: string
): Promise<DeveloperInsights | null> {
  const profile = developerProfileDb.getOrCreate(projectId);
  if (!profile.enabled) return null;

  // Get scan type preferences
  const scanTypeStats = developerDecisionDb.getAcceptanceRateByScanType(profile.id);
  const scanTypePreferences: PreferenceScore[] = scanTypeStats.map(stat => ({
    scanType: stat.scan_type,
    acceptanceRate: stat.acceptance_rate,
    sampleCount: stat.count,
    recommendation: stat.acceptance_rate >= 70
      ? 'preferred'
      : stat.acceptance_rate <= 30
        ? 'avoided'
        : 'neutral',
  }));

  // Get category preferences
  const categoryStats = developerDecisionDb.getAcceptanceRateByCategory(profile.id);
  const categoryPreferences: CategoryPreference[] = categoryStats.map(stat => ({
    category: stat.category,
    acceptanceRate: stat.acceptance_rate,
    sampleCount: stat.count,
    averageEffort: 0, // Could be calculated from decisions
    averageImpact: 0,
  }));

  // Get recent patterns
  const recentPatterns = developerDecisionDb.getRecentPatterns(profile.id, 30);

  // Get skills
  const skills = skillTrackingDb.getByProfile(profile.id);

  // Get active insights
  const activeInsights = learningInsightDb.getActiveByProfile(profile.id);

  return {
    profile,
    scanTypePreferences,
    categoryPreferences,
    topAcceptedPatterns: recentPatterns.topAcceptedCategories,
    topRejectedPatterns: recentPatterns.topRejectedCategories,
    skills,
    activeInsights,
    recentDecisionPatterns: recentPatterns,
  };
}

/**
 * Predict if developer will accept an idea based on their profile
 */
export function predictDecision(
  profileId: string,
  idea: {
    scanType: string;
    category: string;
    effort: number | null;
    impact: number | null;
  }
): PredictionResult {
  // Get historical decisions for this scan type
  const scanTypeDecisions = developerDecisionDb.getByScanType(profileId, idea.scanType);
  const categoryDecisions = developerDecisionDb.getByCategory(profileId, idea.category);

  // Calculate scan type match
  const scanTypeAcceptanceRate = scanTypeDecisions.length > 0
    ? (scanTypeDecisions.filter(d => d.accepted).length / scanTypeDecisions.length) * 100
    : 50;

  // Calculate category match
  const categoryAcceptanceRate = categoryDecisions.length > 0
    ? (categoryDecisions.filter(d => d.accepted).length / categoryDecisions.length) * 100
    : 50;

  // Calculate effort/impact match (prefer high impact, low effort)
  let effortImpactScore = 50;
  if (idea.effort !== null && idea.impact !== null) {
    // Look at similar effort/impact combinations
    const similarDecisions = [...scanTypeDecisions, ...categoryDecisions].filter(d =>
      d.effort === idea.effort && d.impact === idea.impact
    );
    if (similarDecisions.length > 0) {
      effortImpactScore = (similarDecisions.filter(d => d.accepted).length / similarDecisions.length) * 100;
    } else {
      // Default scoring based on impact/effort ratio
      effortImpactScore = idea.impact >= idea.effort ? 60 : 40;
    }
  }

  // Weighted combination
  const weights = {
    scanType: 0.35,
    category: 0.35,
    effortImpact: 0.30,
  };

  const overallScore =
    scanTypeAcceptanceRate * weights.scanType +
    categoryAcceptanceRate * weights.category +
    effortImpactScore * weights.effortImpact;

  // Calculate confidence based on sample size
  const totalSamples = scanTypeDecisions.length + categoryDecisions.length;
  const confidence = Math.min(100, totalSamples * 5);

  return {
    willAccept: overallScore >= 50,
    confidence,
    reasoning: generatePredictionReasoning(
      scanTypeAcceptanceRate,
      categoryAcceptanceRate,
      effortImpactScore,
      idea.scanType,
      idea.category
    ),
    basedOn: {
      scanTypeMatch: scanTypeAcceptanceRate,
      categoryMatch: categoryAcceptanceRate,
      effortImpactMatch: effortImpactScore,
    },
  };
}

function generatePredictionReasoning(
  scanTypeRate: number,
  categoryRate: number,
  effortImpactRate: number,
  scanType: string,
  category: string
): string {
  const reasons: string[] = [];

  if (scanTypeRate >= 70) {
    reasons.push(`You frequently accept ${scanType} suggestions`);
  } else if (scanTypeRate <= 30) {
    reasons.push(`You rarely accept ${scanType} suggestions`);
  }

  if (categoryRate >= 70) {
    reasons.push(`${category} ideas resonate with you`);
  } else if (categoryRate <= 30) {
    reasons.push(`${category} ideas are often rejected`);
  }

  if (effortImpactRate >= 70) {
    reasons.push(`Similar effort/impact combinations are typically accepted`);
  }

  return reasons.length > 0 ? reasons.join('. ') + '.' : 'Based on your overall decision patterns.';
}

/**
 * Record a developer decision and update profile
 */
export async function recordDecision(
  projectId: string,
  decision: {
    decisionType: DbDeveloperDecision['decision_type'];
    entityId: string;
    entityType: string;
    scanType?: string;
    category?: string;
    effort?: number;
    impact?: number;
    accepted: boolean;
    feedback?: string;
  }
): Promise<void> {
  const profile = developerProfileDb.getOrCreate(projectId);

  // Record the decision
  developerDecisionDb.create({
    profile_id: profile.id,
    project_id: projectId,
    decision_type: decision.decisionType,
    entity_id: decision.entityId,
    entity_type: decision.entityType,
    scan_type: decision.scanType,
    category: decision.category,
    effort: decision.effort,
    impact: decision.impact,
    accepted: decision.accepted,
    feedback: decision.feedback,
  });

  // Update profile stats
  developerProfileDb.updateLearningStats(profile.id, decision.accepted);

  // Update scan type preferences if we have enough data
  await updateScanTypePreferences(profile.id);

  // Check for pattern insights
  await generatePatternInsights(profile.id, projectId);

  // Update skill tracking if applicable
  if (decision.category) {
    await updateSkillTracking(profile.id, projectId, decision.category, decision.accepted);
  }
}

/**
 * Update scan type preferences based on accumulated decisions
 */
async function updateScanTypePreferences(profileId: string): Promise<void> {
  const scanTypeStats = developerDecisionDb.getAcceptanceRateByScanType(profileId);

  const preferredTypes: string[] = [];
  const avoidedTypes: string[] = [];

  for (const stat of scanTypeStats) {
    if (stat.count >= 5) { // Need minimum sample size
      if (stat.acceptance_rate >= 70) {
        preferredTypes.push(stat.scan_type);
      } else if (stat.acceptance_rate <= 30) {
        avoidedTypes.push(stat.scan_type);
      }
    }
  }

  const profile = developerProfileDb.getById(profileId);
  if (profile) {
    developerProfileDb.update(profile.id, {
      preferred_scan_types: preferredTypes,
      avoided_scan_types: avoidedTypes,
    });
  }
}

/**
 * Generate pattern insights based on decision history
 */
async function generatePatternInsights(
  profileId: string,
  projectId: string
): Promise<void> {
  const recentPatterns = developerDecisionDb.getRecentPatterns(profileId, 30);

  // Check for strong preference patterns
  if (recentPatterns.totalDecisions >= 10) {
    // Check for high acceptance rate
    if (recentPatterns.acceptanceRate >= 80) {
      const existingInsight = learningInsightDb.getByType(profileId, 'preference_learned')
        .find(i => JSON.parse(i.data).type === 'high_acceptance');

      if (!existingInsight) {
        learningInsightDb.create({
          profile_id: profileId,
          project_id: projectId,
          insight_type: 'preference_learned',
          title: 'High Acceptance Rate Detected',
          description: `You've accepted ${Math.round(recentPatterns.acceptanceRate)}% of suggestions in the last 30 days. The system is learning your preferences well.`,
          data: {
            type: 'high_acceptance',
            rate: recentPatterns.acceptanceRate,
            topCategories: recentPatterns.topAcceptedCategories,
          },
          confidence: Math.min(100, recentPatterns.totalDecisions * 5),
          importance: 'low',
        });
      }
    }

    // Check for category preferences
    if (recentPatterns.topAcceptedCategories.length >= 2) {
      const preferenceData = {
        type: 'category_preference',
        categories: recentPatterns.topAcceptedCategories,
      };

      const existingInsight = learningInsightDb.getByType(profileId, 'preference_learned')
        .find(i => JSON.parse(i.data).type === 'category_preference');

      if (!existingInsight) {
        learningInsightDb.create({
          profile_id: profileId,
          project_id: projectId,
          insight_type: 'preference_learned',
          title: 'Category Preferences Identified',
          description: `You tend to accept ideas in these categories: ${recentPatterns.topAcceptedCategories.join(', ')}. Ideas in these areas will be prioritized.`,
          data: preferenceData,
          confidence: 70,
          importance: 'medium',
        });
      }
    }

    // Check for rejection patterns
    if (recentPatterns.topRejectedCategories.length >= 2) {
      const rejectionData = {
        type: 'rejection_pattern',
        categories: recentPatterns.topRejectedCategories,
      };

      const existingInsight = learningInsightDb.getByType(profileId, 'preference_learned')
        .find(i => JSON.parse(i.data).type === 'rejection_pattern');

      if (!existingInsight) {
        learningInsightDb.create({
          profile_id: profileId,
          project_id: projectId,
          insight_type: 'preference_learned',
          title: 'Rejection Patterns Detected',
          description: `You often reject ideas in: ${recentPatterns.topRejectedCategories.join(', ')}. These will be de-prioritized to save you time.`,
          data: rejectionData,
          confidence: 70,
          importance: 'medium',
        });
      }
    }
  }
}

/**
 * Update skill tracking based on implementation outcomes
 */
async function updateSkillTracking(
  profileId: string,
  projectId: string,
  category: string,
  success: boolean
): Promise<void> {
  // Map categories to skill areas
  const skillMapping: Record<string, { area: string; subSkill?: string }> = {
    'performance': { area: 'performance' },
    'perf_optimizer': { area: 'performance' },
    'security': { area: 'security' },
    'security_protector': { area: 'security' },
    'bug_fix': { area: 'debugging' },
    'bug_hunter': { area: 'debugging' },
    'refactoring': { area: 'code_quality' },
    'code_refactor': { area: 'code_quality' },
    'zen_architect': { area: 'architecture' },
    'ui': { area: 'ui_design' },
    'ui_perfectionist': { area: 'ui_design' },
    'testing': { area: 'testing' },
    'accessibility': { area: 'accessibility' },
    'accessibility_advocate': { area: 'accessibility' },
  };

  const mapping = skillMapping[category.toLowerCase()] || { area: category };

  const skill = skillTrackingDb.getOrCreate({
    profile_id: profileId,
    project_id: projectId,
    skill_area: mapping.area,
    sub_skill: mapping.subSkill,
  });

  skillTrackingDb.recordActivity(skill.id, success);

  // Check if skill needs improvement suggestions
  const updatedSkill = skillTrackingDb.getByProfile(profileId)
    .find(s => s.id === skill.id);

  if (updatedSkill && updatedSkill.proficiency_score < 50 && updatedSkill.implementations_count >= 5) {
    // Generate skill gap insight
    const existingInsight = learningInsightDb.getByType(profileId, 'skill_gap')
      .find(i => JSON.parse(i.data).skillArea === mapping.area);

    if (!existingInsight) {
      learningInsightDb.create({
        profile_id: profileId,
        project_id: projectId,
        insight_type: 'skill_gap',
        title: `${mapping.area} Skill Gap Detected`,
        description: `Your success rate in ${mapping.area} is ${updatedSkill.proficiency_score}%. Consider focusing on simpler ${mapping.area} improvements first.`,
        data: {
          skillArea: mapping.area,
          proficiency: updatedSkill.proficiency_score,
          suggestions: [
            `Start with low-effort ${mapping.area} improvements`,
            `Review successful ${mapping.area} implementations`,
            `Consider pairing with more experienced developers on complex ${mapping.area} tasks`,
          ],
        },
        confidence: 80,
        importance: 'high',
      });
    }
  }
}

/**
 * Check code for consistency violations
 */
export function checkConsistency(
  profileId: string,
  code: string,
  filePath: string
): Array<{
  rule: string;
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  suggestion?: string;
}> {
  const enabledRules = consistencyRuleDb.getEnabledByProfile(profileId);
  const violations: Array<{
    rule: string;
    severity: 'error' | 'warning' | 'suggestion';
    message: string;
    suggestion?: string;
  }> = [];

  for (const rule of enabledRules) {
    const template = JSON.parse(rule.pattern_template);

    // Simple pattern matching (could be enhanced with AST analysis)
    if (template.requiredElements) {
      for (const element of template.requiredElements) {
        if (!code.includes(element)) {
          violations.push({
            rule: rule.rule_name,
            severity: rule.severity,
            message: `Missing required element: ${element}`,
            suggestion: rule.example_code || undefined,
          });
          consistencyRuleDb.recordViolation(rule.id);
        }
      }
    }

    if (template.antiPatterns) {
      for (const antiPattern of template.antiPatterns) {
        if (code.includes(antiPattern)) {
          violations.push({
            rule: rule.rule_name,
            severity: rule.severity,
            message: `Anti-pattern detected: ${antiPattern}`,
            suggestion: `Avoid using ${antiPattern}. ${rule.description}`,
          });
          consistencyRuleDb.recordViolation(rule.id);
        }
      }
    }
  }

  return violations;
}

/**
 * Get filtered ideas based on developer preferences
 */
export function filterIdeasByPreference(
  profileId: string,
  ideas: Array<{
    id: string;
    scanType: string;
    category: string;
    effort: number | null;
    impact: number | null;
  }>
): Array<{
  idea: typeof ideas[0];
  prediction: PredictionResult;
  priority: 'high' | 'medium' | 'low';
}> {
  const results = ideas.map(idea => {
    const prediction = predictDecision(profileId, {
      scanType: idea.scanType,
      category: idea.category,
      effort: idea.effort,
      impact: idea.impact,
    });

    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (prediction.willAccept && prediction.confidence >= 70) {
      priority = 'high';
    } else if (!prediction.willAccept && prediction.confidence >= 70) {
      priority = 'low';
    }

    return {
      idea,
      prediction,
      priority,
    };
  });

  // Sort by priority and prediction confidence
  return results.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.prediction.confidence - a.prediction.confidence;
  });
}

/**
 * Get summary of developer learning progress
 */
export function getLearningProgress(profileId: string): {
  overallConfidence: number;
  decisionsRecorded: number;
  acceptanceRate: number;
  preferredAgents: string[];
  avoidedAgents: string[];
  topSkills: Array<{ area: string; proficiency: number }>;
  areasToImprove: Array<{ area: string; proficiency: number }>;
  activeInsightsCount: number;
} {
  const profile = developerProfileDb.getById(profileId);
  if (!profile) {
    return {
      overallConfidence: 0,
      decisionsRecorded: 0,
      acceptanceRate: 0,
      preferredAgents: [],
      avoidedAgents: [],
      topSkills: [],
      areasToImprove: [],
      activeInsightsCount: 0,
    };
  }

  const skills = skillTrackingDb.getByProfile(profileId);
  const topSkills = skills
    .filter(s => s.proficiency_score >= 70)
    .slice(0, 5)
    .map(s => ({ area: s.skill_area, proficiency: s.proficiency_score }));

  const areasToImprove = skillTrackingDb.getNeedingImprovement(profileId, 50)
    .slice(0, 3)
    .map(s => ({ area: s.skill_area, proficiency: s.proficiency_score }));

  const activeInsights = learningInsightDb.getActiveByProfile(profileId);

  return {
    overallConfidence: profile.learning_confidence,
    decisionsRecorded: profile.total_decisions,
    acceptanceRate: profile.total_decisions > 0
      ? Math.round((profile.total_accepted / profile.total_decisions) * 100)
      : 0,
    preferredAgents: JSON.parse(profile.preferred_scan_types),
    avoidedAgents: JSON.parse(profile.avoided_scan_types),
    topSkills,
    areasToImprove,
    activeInsightsCount: activeInsights.length,
  };
}
