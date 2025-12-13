/**
 * Database Module - Main Entry Point
 * Provides centralized database access with modular architecture
 */

import { getDatabase, closeDatabase } from './connection';
import { initializeTables } from './schema';
import { goalRepository } from './repositories/goal.repository';
import { goalCandidateRepository } from './repositories/goal-candidate.repository';
import { backlogRepository } from './repositories/backlog.repository';
import { contextGroupRepository } from './repositories/context-group.repository';
import { contextGroupRelationshipRepository } from './repositories/context-group-relationship.repository';
import { contextRepository } from './repositories/context.repository';
import { eventRepository } from './repositories/event.repository';
import { scanRepository } from './repositories/scan.repository';
import { ideaRepository } from './repositories/idea.repository';
import { implementationLogRepository } from './repositories/implementation-log.repository';
import { conversationRepository } from './repositories/conversation.repository';
import { techDebtRepository } from './repositories/tech-debt.repository';
import { scanQueueRepository } from './repositories/scanQueue.repository';
import { testSelectorRepository } from './repositories/test-selector.repository';
import {
  testScenarioRepository,
  testExecutionRepository,
  visualDiffRepository
} from './repositories/test-scenario.repository';
import {
  securityScanRepository,
  securityPatchRepository,
  securityPrRepository
} from './repositories/security-patch.repository';
import {
  scanHistoryRepository,
  scanPredictionRepository,
  fileChangePatternRepository,
} from './repositories/scan-prediction.repository';
import {
  marketplaceUserRepository,
  refactoringPatternRepository,
  patternRatingRepository,
  patternApplicationRepository,
  badgeRepository,
  patternFavoriteRepository,
  patternCollectionRepository,
  patternVersionRepository,
} from './repositories/marketplace.repository';
import {
  ideaExecutionOutcomeRepository,
  scoringWeightRepository,
  scoringThresholdRepository,
} from './repositories/adaptive-learning.repository';
import {
  debtPatternRepository,
  debtPredictionRepository,
  complexityHistoryRepository,
  opportunityCardRepository,
  preventionActionRepository,
  codeChangeEventRepository,
} from './repositories/debt-prediction.repository';
import {
  securityIntelligenceRepository,
  securityAlertRepository,
  staleBranchRepository,
  communitySecurityScoreRepository,
} from './repositories/security-intelligence.repository';
import {
  developerProfileRepository,
  developerDecisionRepository,
  learningInsightRepository,
  codePatternUsageRepository,
  consistencyRuleRepository,
  skillTrackingRepository,
} from './repositories/developer-mind-meld.repository';
import {
  learningPathRepository,
  learningModuleRepository,
  codeWalkthroughRepository,
  quizQuestionRepository,
  quizResponseRepository,
  learningMetricsRepository,
  onboardingRecommendationRepository,
} from './repositories/onboarding-accelerator.repository';
import {
  strategicInitiativeRepository,
  roadmapMilestoneRepository,
  impactPredictionRepository,
  featureInteractionRepository,
  debtPreventionRuleRepository,
  velocityTrackingRepository,
  roadmapSimulationRepository,
  roadmapSummaryRepository,
} from './repositories/strategic-roadmap.repository';
import {
  hypothesisRepository,
  invariantRepository,
  fuzzSessionRepository,
  propertyTestRepository,
  testKnowledgeRepository,
  hypothesisTestingSummaryRepository,
} from './repositories/hypothesis-testing.repository';
import { projectHealthRepository } from './repositories/project-health.repository';
import { standupRepository } from './repositories/standup.repository';
import {
  redTeamSessionRepository,
  redTeamAttackRepository,
  redTeamVulnerabilityRepository,
  vulnerabilityDebateRepository,
  redTeamSummaryRepository,
} from './repositories/red-team.repository';
import {
  architectureNodeRepository,
  architectureEdgeRepository,
  architectureDriftRepository,
  architectureSuggestionRepository,
  architectureIdealRepository,
  architectureSnapshotRepository,
} from './repositories/architecture-graph.repository';
import {
  focusSessionRepository,
  focusBreakRepository,
  focusStatsRepository,
} from './repositories/focus-mode.repository';
import {
  ciPipelineRepository,
  buildExecutionRepository,
  ciPredictionRepository,
  flakyTestRepository,
  ciConfigRepository,
  pipelineOptimizationRepository,
  ciDashboardRepository,
} from './repositories/autonomous-ci.repository';
import {
  refactoringEconomicsRepository,
  roiSimulationRepository,
  portfolioOptimizationRepository,
  velocityPredictionRepository,
  debtPaydownStrategyRepository,
  economicEventRepository,
  roiConfigRepository,
  roiSummaryRepository,
} from './repositories/roi-simulator.repository';
import {
  goalHypothesisRepository,
  goalBreakdownRepository,
  goalHubExtensions,
} from './repositories/goal-hub.repository';

// Export types
export * from './models/types';
export * from './models/conversation.types';
export * from './models/tech-debt.types';
export * from './models/security-patch.types';
export * from './models/test-scenario.types';
export * from './models/scan-prediction.types';
export * from './models/marketplace.types';
export * from './models/debt-prediction.types';
export * from './models/security-intelligence.types';
export * from './models/onboarding-accelerator.types';
export * from './models/strategic-roadmap.types';
// NOTE: hypothesis-testing.types removed - use goal-hub.types instead
export * from './models/project-health.types';
export * from './models/standup.types';
export * from './models/red-team.types';
export * from './models/architecture-graph.types';
export * from './models/focus-mode.types';
export * from './models/autonomous-ci.types';
export * from './models/roi-simulator.types';
export * from './models/goal-hub.types';

// Export connection utilities
export { getDatabase, closeDatabase };

// Initialize database on first import
let initialized = false;

function ensureInitialized() {
  if (!initialized) {
    initializeTables();
    initialized = true;
  }
}

// Auto-initialize
ensureInitialized();

/**
 * Goal Database Operations
 * Handles development goals and objectives
 */
export const goalDb = {
  ...goalRepository,
  close: closeDatabase
};

/**
 * Goal Hub Database Operations
 * Handles goal hypotheses, breakdowns, and extended goal features
 */
export const goalHubDb = {
  hypotheses: goalHypothesisRepository,
  breakdowns: goalBreakdownRepository,
  extensions: goalHubExtensions,
  close: closeDatabase
};

/**
 * Goal Candidate Database Operations
 * Handles AI-generated goal suggestions
 */
export const goalCandidateDb = {
  ...goalCandidateRepository,
  close: closeDatabase
};

/**
 * Backlog Database Operations
 * Handles backlog items and proposals
 */
export const backlogDb = {
  ...backlogRepository,
  close: closeDatabase
};

/**
 * Context Group Database Operations
 * Handles organization of contexts into groups
 */
export const contextGroupDb = {
  ...contextGroupRepository,
  close: closeDatabase
};

/**
 * Context Group Relationship Database Operations
 * Handles connections between context groups for Architecture Explorer
 */
export const contextGroupRelationshipDb = {
  ...contextGroupRelationshipRepository,
  close: closeDatabase
};

/**
 * Context Database Operations
 * Handles file contexts and documentation
 */
export const contextDb = {
  ...contextRepository,
  close: closeDatabase
};

/**
 * Event Database Operations
 * Handles system events and logging
 */
export const eventDb = {
  ...eventRepository,
  close: closeDatabase
};

/**
 * Scan Database Operations
 * Handles scans with LLM token tracking
 */
export const scanDb = {
  ...scanRepository,
  close: closeDatabase
};

/**
 * Idea Database Operations
 * Handles LLM-generated ideas
 */
export const ideaDb = {
  ...ideaRepository,
  close: closeDatabase
};

/**
 * Implementation Log Database Operations
 * Handles implementation tracking and history
 */
export const implementationLogDb = {
  ...implementationLogRepository,
  close: closeDatabase
};

/**
 * Conversation Database Operations
 * Handles Annette's conversation memory
 */
export const conversationDb = {
  ...conversationRepository,
  close: closeDatabase
};

/**
 * Technical Debt Database Operations
 * Handles technical debt tracking and remediation
 */
export const techDebtDb = {
  ...techDebtRepository,
  close: closeDatabase
};

/**
 * Scan Queue Database Operations
 * Handles scan queue, progress tracking, notifications, and file watch config
 */
export const scanQueueDb = {
  ...scanQueueRepository,
  close: closeDatabase
};

/**
 * Test Selector Database Operations
 * Handles test selectors for automated testing
 */
export const testSelectorDb = {
  ...testSelectorRepository,
  close: closeDatabase
};

/**
 * Security Scan Database Operations
 * Handles security vulnerability scans
 */
export const securityScanDb = {
  ...securityScanRepository,
  close: closeDatabase
};

/**
 * Security Patch Database Operations
 * Handles security patches and vulnerability fixes
 */
export const securityPatchDb = {
  ...securityPatchRepository,
  close: closeDatabase
};

/**
 * Security PR Database Operations
 * Handles pull requests for security patches
 */
export const securityPrDb = {
  ...securityPrRepository,
  close: closeDatabase
};

/**
 * Test Scenario Database Operations
 * Handles AI-generated test scenarios
 */
export const testScenarioDb = {
  ...testScenarioRepository,
  close: closeDatabase
};

/**
 * Test Execution Database Operations
 * Handles test run results and execution history
 */
export const testExecutionDb = {
  ...testExecutionRepository,
  close: closeDatabase
};

/**
 * Visual Diff Database Operations
 * Handles screenshot comparison and visual regression
 */
export const visualDiffDb = {
  ...visualDiffRepository,
  close: closeDatabase
};

/**
 * Scan History Database Operations
 * Handles scan execution history tracking
 */
export const scanHistoryDb = {
  ...scanHistoryRepository,
  close: closeDatabase
};

/**
 * Scan Prediction Database Operations
 * Handles AI-generated scan recommendations
 */
export const scanPredictionDb = {
  ...scanPredictionRepository,
  close: closeDatabase
};

/**
 * File Change Pattern Database Operations
 * Handles file change pattern tracking for predictive scheduling
 */
export const fileChangePatternDb = {
  ...fileChangePatternRepository,
  close: closeDatabase
};

/**
 * Marketplace User Database Operations
 * Handles marketplace user profiles and reputation
 */
export const marketplaceUserDb = {
  ...marketplaceUserRepository,
  close: closeDatabase
};

/**
 * Refactoring Pattern Database Operations
 * Handles community refactoring patterns
 */
export const refactoringPatternDb = {
  ...refactoringPatternRepository,
  close: closeDatabase
};

/**
 * Pattern Rating Database Operations
 * Handles pattern ratings and reviews
 */
export const patternRatingDb = {
  ...patternRatingRepository,
  close: closeDatabase
};

/**
 * Pattern Application Database Operations
 * Handles pattern application tracking
 */
export const patternApplicationDb = {
  ...patternApplicationRepository,
  close: closeDatabase
};

/**
 * Badge Database Operations
 * Handles badges and achievements
 */
export const badgeDb = {
  ...badgeRepository,
  close: closeDatabase
};

/**
 * Pattern Favorite Database Operations
 * Handles user pattern favorites
 */
export const patternFavoriteDb = {
  ...patternFavoriteRepository,
  close: closeDatabase
};

/**
 * Pattern Collection Database Operations
 * Handles pattern collections
 */
export const patternCollectionDb = {
  ...patternCollectionRepository,
  close: closeDatabase
};

/**
 * Pattern Version Database Operations
 * Handles pattern version history
 */
export const patternVersionDb = {
  ...patternVersionRepository,
  close: closeDatabase
};

/**
 * Idea Execution Outcome Database Operations
 * Tracks idea execution results for adaptive learning
 */
export const ideaExecutionOutcomeDb = {
  ...ideaExecutionOutcomeRepository,
  close: closeDatabase
};

/**
 * Scoring Weight Database Operations
 * Manages adaptive scoring weights per category/scan type
 */
export const scoringWeightDb = {
  ...scoringWeightRepository,
  close: closeDatabase
};

/**
 * Scoring Threshold Database Operations
 * Manages auto-accept/reject/priority thresholds
 */
export const scoringThresholdDb = {
  ...scoringThresholdRepository,
  close: closeDatabase
};

/**
 * Debt Pattern Database Operations
 * Manages learned patterns that predict technical debt
 */
export const debtPatternDb = {
  ...debtPatternRepository,
  close: closeDatabase
};

/**
 * Debt Prediction Database Operations
 * Manages real-time debt predictions for code
 */
export const debtPredictionDb = {
  ...debtPredictionRepository,
  close: closeDatabase
};

/**
 * Complexity History Database Operations
 * Tracks file complexity metrics over time
 */
export const complexityHistoryDb = {
  ...complexityHistoryRepository,
  close: closeDatabase
};

/**
 * Opportunity Card Database Operations
 * Manages real-time refactoring opportunity cards
 */
export const opportunityCardDb = {
  ...opportunityCardRepository,
  close: closeDatabase
};

/**
 * Prevention Action Database Operations
 * Tracks actions taken to prevent debt
 */
export const preventionActionDb = {
  ...preventionActionRepository,
  close: closeDatabase
};

/**
 * Code Change Event Database Operations
 * Tracks code changes for pattern detection
 */
export const codeChangeEventDb = {
  ...codeChangeEventRepository,
  close: closeDatabase
};

/**
 * Security Intelligence Database Operations
 * Manages cross-project security metrics and risk scores
 */
export const securityIntelligenceDb = {
  ...securityIntelligenceRepository,
  close: closeDatabase
};

/**
 * Security Alert Database Operations
 * Manages security alerts and notifications
 */
export const securityAlertDb = {
  ...securityAlertRepository,
  close: closeDatabase
};

/**
 * Stale Branch Database Operations
 * Tracks and manages stale branches across projects
 */
export const staleBranchDb = {
  ...staleBranchRepository,
  close: closeDatabase
};

/**
 * Community Security Score Database Operations
 * Manages community-driven security scoring
 */
export const communitySecurityScoreDb = {
  ...communitySecurityScoreRepository,
  close: closeDatabase
};

/**
 * Developer Profile Database Operations
 * Manages personalized developer profiles for AI learning
 */
export const developerProfileDb = {
  ...developerProfileRepository,
  close: closeDatabase
};

/**
 * Developer Decision Database Operations
 * Tracks developer decisions for preference learning
 */
export const developerDecisionDb = {
  ...developerDecisionRepository,
  close: closeDatabase
};

/**
 * Learning Insight Database Operations
 * Manages AI-generated learning insights
 */
export const learningInsightDb = {
  ...learningInsightRepository,
  close: closeDatabase
};

/**
 * Code Pattern Usage Database Operations
 * Tracks code pattern usage for consistency learning
 */
export const codePatternUsageDb = {
  ...codePatternUsageRepository,
  close: closeDatabase
};

/**
 * Consistency Rule Database Operations
 * Manages consistency rules for code style enforcement
 */
export const consistencyRuleDb = {
  ...consistencyRuleRepository,
  close: closeDatabase
};

/**
 * Skill Tracking Database Operations
 * Tracks developer skill development and areas for improvement
 */
export const skillTrackingDb = {
  ...skillTrackingRepository,
  close: closeDatabase
};

/**
 * Learning Path Database Operations
 * Manages developer onboarding learning paths
 */
export const learningPathDb = {
  ...learningPathRepository,
  close: closeDatabase
};

/**
 * Learning Module Database Operations
 * Manages individual learning modules within paths
 */
export const learningModuleDb = {
  ...learningModuleRepository,
  close: closeDatabase
};

/**
 * Code Walkthrough Database Operations
 * Manages interactive code explanations
 */
export const codeWalkthroughDb = {
  ...codeWalkthroughRepository,
  close: closeDatabase
};

/**
 * Quiz Question Database Operations
 * Manages quiz questions for knowledge verification
 */
export const quizQuestionDb = {
  ...quizQuestionRepository,
  close: closeDatabase
};

/**
 * Quiz Response Database Operations
 * Tracks developer quiz answers and performance
 */
export const quizResponseDb = {
  ...quizResponseRepository,
  close: closeDatabase
};

/**
 * Learning Metrics Database Operations
 * Tracks adaptive learning metrics and progress
 */
export const learningMetricsDb = {
  ...learningMetricsRepository,
  close: closeDatabase
};

/**
 * Onboarding Recommendation Database Operations
 * Manages AI-generated learning recommendations
 */
export const onboardingRecommendationDb = {
  ...onboardingRecommendationRepository,
  close: closeDatabase
};

/**
 * Strategic Initiative Database Operations
 * Manages strategic development initiatives for the roadmap
 */
export const strategicInitiativeDb = {
  ...strategicInitiativeRepository,
  close: closeDatabase
};

/**
 * Roadmap Milestone Database Operations
 * Manages quarterly milestones and targets
 */
export const roadmapMilestoneDb = {
  ...roadmapMilestoneRepository,
  close: closeDatabase
};

/**
 * Impact Prediction Database Operations
 * Manages AI-predicted impact of decisions
 */
export const impactPredictionDb = {
  ...impactPredictionRepository,
  close: closeDatabase
};

/**
 * Feature Interaction Database Operations
 * Manages feature interactions (synergies, conflicts, dependencies)
 */
export const featureInteractionDb = {
  ...featureInteractionRepository,
  close: closeDatabase
};

/**
 * Debt Prevention Rule Database Operations
 * Manages proactive debt prevention rules
 */
export const debtPreventionRuleDb = {
  ...debtPreventionRuleRepository,
  close: closeDatabase
};

/**
 * Velocity Tracking Database Operations
 * Tracks development velocity over time
 */
export const velocityTrackingDb = {
  ...velocityTrackingRepository,
  close: closeDatabase
};

/**
 * Roadmap Simulation Database Operations
 * Manages roadmap simulation scenarios
 */
export const roadmapSimulationDb = {
  ...roadmapSimulationRepository,
  close: closeDatabase
};

/**
 * Roadmap Summary Database Operations
 * Provides aggregated roadmap statistics
 */
export const roadmapSummaryDb = {
  ...roadmapSummaryRepository,
};

/**
 * Hypothesis Database Operations
 * Manages AI-generated hypotheses about code behavior
 */
export const hypothesisDb = {
  ...hypothesisRepository,
  close: closeDatabase
};

/**
 * Invariant Database Operations
 * Manages discovered code invariants
 */
export const invariantDb = {
  ...invariantRepository,
  close: closeDatabase
};

/**
 * Fuzz Session Database Operations
 * Manages fuzzing test sessions
 */
export const fuzzSessionDb = {
  ...fuzzSessionRepository,
  close: closeDatabase
};

/**
 * Property Test Database Operations
 * Manages property-based tests
 */
export const propertyTestDb = {
  ...propertyTestRepository,
  close: closeDatabase
};

/**
 * Test Knowledge Database Operations
 * Manages test-derived knowledge artifacts
 */
export const testKnowledgeDb = {
  ...testKnowledgeRepository,
  close: closeDatabase
};

/**
 * Hypothesis Testing Summary Database Operations
 * Provides aggregated hypothesis testing statistics
 */
export const hypothesisTestingSummaryDb = {
  ...hypothesisTestingSummaryRepository,
};

/**
 * Project Health Score Database Operations
 * Manages project health scores, history, and configuration
 */
export const projectHealthDb = {
  ...projectHealthRepository,
  close: closeDatabase,
};

/**
 * Standup Summary Database Operations
 * Manages daily/weekly standup summaries and reports
 */
export const standupDb = {
  ...standupRepository,
  close: closeDatabase,
};

/**
 * Red Team Session Database Operations
 * Manages adversarial testing sessions
 */
export const redTeamSessionDb = {
  ...redTeamSessionRepository,
  close: closeDatabase,
};

/**
 * Red Team Attack Database Operations
 * Manages planned and executed attacks
 */
export const redTeamAttackDb = {
  ...redTeamAttackRepository,
  close: closeDatabase,
};

/**
 * Red Team Vulnerability Database Operations
 * Manages discovered vulnerabilities
 */
export const redTeamVulnerabilityDb = {
  ...redTeamVulnerabilityRepository,
  close: closeDatabase,
};

/**
 * Vulnerability Debate Database Operations
 * Manages Parliament debates on vulnerabilities
 */
export const vulnerabilityDebateDb = {
  ...vulnerabilityDebateRepository,
  close: closeDatabase,
};

/**
 * Red Team Summary Database Operations
 * Provides aggregated red team statistics
 */
export const redTeamSummaryDb = {
  ...redTeamSummaryRepository,
};

/**
 * Architecture Node Database Operations
 * Manages architecture graph nodes (modules, components, etc.)
 */
export const architectureNodeDb = {
  ...architectureNodeRepository,
  close: closeDatabase,
};

/**
 * Architecture Edge Database Operations
 * Manages dependency edges between architecture nodes
 */
export const architectureEdgeDb = {
  ...architectureEdgeRepository,
  close: closeDatabase,
};

/**
 * Architecture Drift Database Operations
 * Manages architecture drift alerts and violations
 */
export const architectureDriftDb = {
  ...architectureDriftRepository,
  close: closeDatabase,
};

/**
 * Architecture Suggestion Database Operations
 * Manages AI-generated refactoring suggestions
 */
export const architectureSuggestionDb = {
  ...architectureSuggestionRepository,
  close: closeDatabase,
};

/**
 * Architecture Ideal Database Operations
 * Manages architecture rules and ideals
 */
export const architectureIdealDb = {
  ...architectureIdealRepository,
  close: closeDatabase,
};

/**
 * Architecture Snapshot Database Operations
 * Manages point-in-time architecture snapshots
 */
export const architectureSnapshotDb = {
  ...architectureSnapshotRepository,
  close: closeDatabase,
};

/**
 * Focus Session Database Operations
 * Manages focus/pomodoro sessions with productivity tracking
 */
export const focusSessionDb = {
  ...focusSessionRepository,
  close: closeDatabase,
};

/**
 * Focus Break Database Operations
 * Manages break periods between focus sessions
 */
export const focusBreakDb = {
  ...focusBreakRepository,
  close: closeDatabase,
};

/**
 * Focus Stats Database Operations
 * Manages daily focus statistics and streaks
 */
export const focusStatsDb = {
  ...focusStatsRepository,
  close: closeDatabase,
};

/**
 * CI Pipeline Database Operations
 * Manages CI/CD pipeline configurations
 */
export const ciPipelineDb = {
  ...ciPipelineRepository,
  close: closeDatabase,
};

/**
 * Build Execution Database Operations
 * Manages individual build runs and test results
 */
export const buildExecutionDb = {
  ...buildExecutionRepository,
  close: closeDatabase,
};

/**
 * CI Prediction Database Operations
 * Manages AI-generated predictions about builds
 */
export const ciPredictionDb = {
  ...ciPredictionRepository,
  close: closeDatabase,
};

/**
 * Flaky Test Database Operations
 * Tracks and manages flaky tests for self-healing
 */
export const flakyTestDb = {
  ...flakyTestRepository,
  close: closeDatabase,
};

/**
 * CI Config Database Operations
 * Manages per-project CI configuration
 */
export const ciConfigDb = {
  ...ciConfigRepository,
  close: closeDatabase,
};

/**
 * Pipeline Optimization Database Operations
 * Manages AI-suggested pipeline optimizations
 */
export const pipelineOptimizationDb = {
  ...pipelineOptimizationRepository,
  close: closeDatabase,
};

/**
 * CI Dashboard Database Operations
 * Provides aggregated CI statistics for dashboards
 */
export const ciDashboardDb = {
  ...ciDashboardRepository,
};

/**
 * Refactoring Economics Database Operations
 * Manages refactoring items with economic modeling
 */
export const refactoringEconomicsDb = {
  ...refactoringEconomicsRepository,
  close: closeDatabase,
};

/**
 * ROI Simulation Database Operations
 * Manages ROI simulation scenarios
 */
export const roiSimulationDb = {
  ...roiSimulationRepository,
  close: closeDatabase,
};

/**
 * Portfolio Optimization Database Operations
 * Manages optimized refactoring portfolios
 */
export const portfolioOptimizationDb = {
  ...portfolioOptimizationRepository,
  close: closeDatabase,
};

/**
 * Velocity Prediction Database Operations
 * Manages velocity predictions based on technical decisions
 */
export const velocityPredictionDb = {
  ...velocityPredictionRepository,
  close: closeDatabase,
};

/**
 * Debt Paydown Strategy Database Operations
 * Manages game-theoretic debt paydown strategies
 */
export const debtPaydownStrategyDb = {
  ...debtPaydownStrategyRepository,
  close: closeDatabase,
};

/**
 * Economic Event Database Operations
 * Tracks actual economic events for ROI validation
 */
export const economicEventDb = {
  ...economicEventRepository,
  close: closeDatabase,
};

/**
 * ROI Config Database Operations
 * Manages per-project ROI configuration
 */
export const roiConfigDb = {
  ...roiConfigRepository,
  close: closeDatabase,
};

/**
 * ROI Summary Database Operations
 * Provides aggregated ROI statistics for dashboards
 */
export const roiSummaryDb = {
  ...roiSummaryRepository,
};

// Cleanup handlers
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    closeDatabase();
  });

  process.on('SIGINT', () => {
    closeDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    closeDatabase();
    process.exit(0);
  });
}
