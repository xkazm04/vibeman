# Predictive Intelligence Module - Implementation Plan

## Executive Summary

Transform the **RefactorWizard** from a point-in-time analysis tool into a **Code Health Observatory** - a continuous monitoring, prediction, and autonomous remediation platform that learns from outcomes and prevents issues before they occur.

---

## Current State Analysis

### RefactorWizard Strengths
- Solid 7-step wizard flow
- AI-powered analysis with LLM integration
- Map-Reduce package generation algorithm
- DSL system for transformation specs
- Integration with Claude Code requirements

### RefactorWizard Limitations
1. **Point-in-time only** - No historical tracking or trend analysis
2. **No feedback loop** - Doesn't learn from execution outcomes
3. **One-way flow** - Generates requirements but doesn't track results
4. **No predictions** - Reacts to problems, doesn't prevent them
5. **Manual triggering** - Requires human intervention each time
6. **Isolated analysis** - Doesn't correlate with production metrics

### DebtPrediction Assets (to merge)
- Trend analysis engine with velocity tracking
- Complexity history database tables
- Confidence/urgency scoring algorithms
- Pattern detection with occurrence counting
- Days-until-critical calculations

---

## New Architecture: Code Health Observatory

### Vision
A platform that continuously watches your codebase, predicts where problems will emerge, autonomously suggests and executes preventive fixes, and learns from every action to improve future predictions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CODE HEALTH OBSERVATORY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   OBSERVE    │───▶│   PREDICT    │───▶│    ACT       │───▶│  LEARN   │  │
│  │              │    │              │    │              │    │          │  │
│  │ • Git hooks  │    │ • ML models  │    │ • Auto-fix   │    │ • Track  │  │
│  │ • Scheduled  │    │ • Trend calc │    │ • Suggest    │    │ outcomes │  │
│  │ • On-demand  │    │ • Correlation│    │ • Escalate   │    │ • Adjust │  │
│  │ • File watch │    │ • Risk score │    │ • Schedule   │    │ weights  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘  │
│         │                   │                   │                   │       │
│         └───────────────────┴───────────────────┴───────────────────┘       │
│                                    │                                        │
│                         ┌──────────▼──────────┐                             │
│                         │   KNOWLEDGE BASE    │                             │
│                         │                     │                             │
│                         │ • Pattern history   │                             │
│                         │ • Execution outcomes│                             │
│                         │ • Prediction accuracy│                            │
│                         │ • Project learnings │                             │
│                         └─────────────────────┘                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation - Knowledge Base & Continuous Observation

### 1.1 Database Schema Extensions

**New Tables:**

```sql
-- Track every analysis run for historical comparison
CREATE TABLE analysis_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  snapshot_type TEXT NOT NULL, -- 'scheduled', 'manual', 'git-hook', 'file-watch'
  trigger_source TEXT, -- commit hash, file path, etc.

  -- Aggregate metrics
  total_files INTEGER,
  total_issues INTEGER,
  total_opportunities INTEGER,
  health_score REAL, -- 0-100

  -- Category breakdown
  metrics_json TEXT, -- { security: 5, performance: 12, ... }

  -- Timing
  scan_duration_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Track prediction accuracy over time
CREATE TABLE prediction_outcomes (
  id TEXT PRIMARY KEY,
  prediction_id TEXT NOT NULL,
  project_id TEXT NOT NULL,

  -- What we predicted
  predicted_issue_type TEXT,
  predicted_severity TEXT,
  predicted_timeframe_days INTEGER,
  confidence_at_prediction REAL,

  -- What actually happened
  outcome TEXT NOT NULL, -- 'confirmed', 'false_positive', 'prevented', 'evolved', 'expired'
  actual_severity TEXT,
  actual_timeframe_days INTEGER,

  -- How it was resolved
  resolution_method TEXT, -- 'auto_fix', 'manual_fix', 'dismissed', 'ignored'
  requirement_id TEXT, -- Link to Claude Code requirement if auto-fixed

  -- Learning
  feedback_score INTEGER, -- -2 to +2 user rating
  feedback_notes TEXT,

  -- Timing
  predicted_at TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (prediction_id) REFERENCES debt_predictions(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Track execution outcomes for learning
CREATE TABLE execution_outcomes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,

  -- What was attempted
  package_id TEXT,
  opportunity_ids TEXT, -- JSON array
  execution_type TEXT, -- 'package', 'dsl', 'direct', 'autonomous'

  -- Execution result
  status TEXT NOT NULL, -- 'success', 'partial', 'failed', 'rolled_back'
  files_modified INTEGER,
  tests_passed BOOLEAN,
  type_check_passed BOOLEAN,
  lint_passed BOOLEAN,

  -- Impact measurement
  issues_before INTEGER,
  issues_after INTEGER,
  health_score_before REAL,
  health_score_after REAL,

  -- Side effects
  new_issues_introduced INTEGER,
  regressions TEXT, -- JSON array of new issues

  -- Learning
  effectiveness_score REAL, -- Calculated: (issues_before - issues_after) / issues_before
  user_satisfaction INTEGER, -- -2 to +2

  -- Timing
  started_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER,

  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Track patterns that emerge across projects (global learning)
CREATE TABLE learned_patterns (
  id TEXT PRIMARY KEY,

  -- Pattern identification
  pattern_signature TEXT NOT NULL, -- Hash of pattern characteristics
  pattern_name TEXT,
  pattern_description TEXT,

  -- Detection
  detection_regex TEXT,
  detection_ast_pattern TEXT,
  detection_heuristics TEXT, -- JSON

  -- Statistics
  occurrence_count INTEGER DEFAULT 0,
  project_count INTEGER DEFAULT 0, -- How many projects have seen this

  -- Effectiveness
  fix_success_rate REAL DEFAULT 0,
  avg_fix_time_minutes REAL,
  recommended_fix_approach TEXT,

  -- Classification
  category TEXT,
  severity_distribution TEXT, -- JSON: { low: 10, medium: 5, high: 2 }

  -- Auto-fix capability
  can_auto_fix BOOLEAN DEFAULT FALSE,
  auto_fix_template TEXT, -- DSL spec or requirement template
  auto_fix_confidence REAL,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Store health metrics time series for visualization
CREATE TABLE health_metrics_history (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  context_id TEXT,

  -- Point-in-time metrics
  measured_at TEXT NOT NULL,

  -- Overall health
  health_score REAL,
  health_grade TEXT, -- A, B, C, D, F

  -- Category scores (0-100)
  security_score REAL,
  performance_score REAL,
  maintainability_score REAL,
  reliability_score REAL,

  -- Counts
  critical_issues INTEGER,
  high_issues INTEGER,
  medium_issues INTEGER,
  low_issues INTEGER,

  -- Trends (vs previous measurement)
  health_delta REAL,
  velocity REAL, -- Change rate

  -- Source
  source TEXT, -- 'scheduled', 'manual', 'git-hook'
  commit_hash TEXT,

  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### 1.2 Repository Layer

**New Files:**
```
src/app/db/repositories/
├── analysisSnapshotRepository.ts
├── predictionOutcomeRepository.ts
├── executionOutcomeRepository.ts
├── learnedPatternRepository.ts
└── healthMetricsRepository.ts
```

**Key Repository Methods:**

```typescript
// analysisSnapshotRepository.ts
export const analysisSnapshotDb = {
  create(snapshot: CreateAnalysisSnapshot): DbAnalysisSnapshot;
  getByProject(projectId: string, limit?: number): DbAnalysisSnapshot[];
  getLatest(projectId: string): DbAnalysisSnapshot | null;
  getHealthTrend(projectId: string, days: number): HealthTrendData;
  compareSnapshots(oldId: string, newId: string): SnapshotComparison;
};

// predictionOutcomeRepository.ts
export const predictionOutcomeDb = {
  recordOutcome(prediction: DbDebtPrediction, outcome: PredictionOutcome): void;
  getAccuracyStats(projectId: string): PredictionAccuracyStats;
  getPatternAccuracy(patternType: string): number;
  getFalsePositivePatterns(): LearnedPattern[];
};

// executionOutcomeRepository.ts
export const executionOutcomeDb = {
  record(outcome: CreateExecutionOutcome): DbExecutionOutcome;
  getSuccessRate(projectId: string): number;
  getEffectivePatterns(): EffectivePattern[];
  getRiskyPatterns(): RiskyPattern[]; // Patterns with high regression rate
};

// learnedPatternRepository.ts
export const learnedPatternDb = {
  findOrCreate(signature: string, data: PatternData): DbLearnedPattern;
  incrementOccurrence(id: string, projectId: string): void;
  updateFixSuccess(id: string, success: boolean): void;
  getAutoFixCandidates(): DbLearnedPattern[];
  getMostEffective(category: string): DbLearnedPattern[];
};
```

### 1.3 Continuous Observation System

**New Feature: `src/app/features/Observatory/`**

```
src/app/features/Observatory/
├── ObservatoryLayout.tsx           # Main dashboard
├── components/
│   ├── HealthDashboard.tsx         # Real-time health metrics
│   ├── TrendCharts.tsx             # Historical trends
│   ├── PredictionFeed.tsx          # Live predictions
│   ├── ActiveMonitors.tsx          # Running watchers
│   └── RecentActivity.tsx          # Activity log
├── lib/
│   ├── observationEngine.ts        # Core observation logic
│   ├── healthCalculator.ts         # Health score algorithms
│   ├── triggerManager.ts           # Manage observation triggers
│   └── snapshotComparator.ts       # Compare analysis snapshots
└── hooks/
    ├── useHealthMetrics.ts
    ├── usePredictions.ts
    └── useObservationStatus.ts
```

**Observation Triggers:**

```typescript
// triggerManager.ts
export interface ObservationTrigger {
  id: string;
  type: 'scheduled' | 'git-hook' | 'file-watch' | 'manual' | 'threshold';
  config: TriggerConfig;
  enabled: boolean;
  lastTriggered: string | null;
}

export interface TriggerConfig {
  // Scheduled
  cronExpression?: string; // "0 2 * * *" = 2am daily

  // Git hook
  gitEvents?: ('commit' | 'push' | 'merge')[];
  branchPatterns?: string[];

  // File watch
  watchPatterns?: string[];
  debounceMs?: number;

  // Threshold
  healthScoreBelow?: number;
  issueCountAbove?: number;
  velocityAbove?: number;
}

export const triggerManager = {
  registerTrigger(projectId: string, trigger: ObservationTrigger): void;
  removeTrigger(triggerId: string): void;
  enableTrigger(triggerId: string): void;
  disableTrigger(triggerId: string): void;
  handleEvent(event: TriggerEvent): Promise<void>;
  getActiveTriggers(projectId: string): ObservationTrigger[];
};
```

---

## Phase 2: Prediction Engine Enhancement

### 2.1 Multi-Signal Prediction Model

**Merge and enhance DebtPrediction with RefactorWizard:**

```typescript
// src/app/features/Observatory/lib/predictionEngine.ts

export interface PredictionSignal {
  source: string;
  weight: number;
  value: number;
  confidence: number;
  explanation: string;
}

export interface EnhancedPrediction {
  id: string;
  projectId: string;
  contextId?: string;

  // What we're predicting
  predictionType: 'bug' | 'debt' | 'performance' | 'security' | 'maintenance';
  targetFile: string;
  targetArea?: string; // function name, class name, etc.

  // Prediction details
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Multi-signal scoring
  signals: PredictionSignal[];
  aggregateConfidence: number; // 0-100
  aggregateUrgency: number; // 0-100

  // Timeframe
  predictedTimeframe: string; // "within 2 weeks", "by next sprint"
  daysUntilCritical: number | null;

  // Prevention
  canPrevent: boolean;
  preventionEffort: 'trivial' | 'small' | 'medium' | 'large';
  preventionAction: string;
  autoFixAvailable: boolean;
  autoFixConfidence: number;

  // If auto-fix is available
  suggestedRequirement?: {
    title: string;
    content: string;
    estimatedDuration: string;
  };

  // Learning context
  similarPastPredictions: string[]; // IDs
  patternAccuracy: number; // Historical accuracy for this pattern

  // Status
  status: 'active' | 'addressed' | 'dismissed' | 'expired' | 'confirmed';

  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export class PredictionEngine {
  private signals: Map<string, SignalProvider> = new Map();

  constructor() {
    // Register signal providers
    this.registerSignal('complexity', new ComplexitySignalProvider());
    this.registerSignal('churn', new ChurnSignalProvider());
    this.registerSignal('age', new AgeSignalProvider());
    this.registerSignal('coupling', new CouplingSignalProvider());
    this.registerSignal('test-coverage', new TestCoverageSignalProvider());
    this.registerSignal('historical', new HistoricalSignalProvider());
    this.registerSignal('similar-projects', new SimilarProjectsSignalProvider());
  }

  async generatePredictions(
    projectId: string,
    analysisResult: AnalysisResult
  ): Promise<EnhancedPrediction[]> {
    const predictions: EnhancedPrediction[] = [];

    for (const opportunity of analysisResult.opportunities) {
      // Gather signals from all providers
      const signals = await this.gatherSignals(projectId, opportunity);

      // Calculate aggregate scores
      const { confidence, urgency } = this.aggregateSignals(signals);

      // Skip low-confidence predictions
      if (confidence < 30) continue;

      // Check for auto-fix capability
      const autoFix = await this.checkAutoFixCapability(opportunity);

      // Generate prediction
      const prediction = this.buildPrediction({
        projectId,
        opportunity,
        signals,
        confidence,
        urgency,
        autoFix,
      });

      predictions.push(prediction);
    }

    // Sort by urgency * confidence
    return predictions.sort((a, b) =>
      (b.aggregateUrgency * b.aggregateConfidence) -
      (a.aggregateUrgency * a.aggregateConfidence)
    );
  }

  private async gatherSignals(
    projectId: string,
    opportunity: RefactorOpportunity
  ): Promise<PredictionSignal[]> {
    const signals: PredictionSignal[] = [];

    for (const [name, provider] of this.signals) {
      try {
        const signal = await provider.calculate(projectId, opportunity);
        if (signal) {
          signals.push({ source: name, ...signal });
        }
      } catch (error) {
        console.error(`Signal provider ${name} failed:`, error);
      }
    }

    return signals;
  }

  private aggregateSignals(signals: PredictionSignal[]): { confidence: number; urgency: number } {
    if (signals.length === 0) {
      return { confidence: 0, urgency: 0 };
    }

    // Weighted average based on signal weights and individual confidence
    let totalWeight = 0;
    let confidenceSum = 0;
    let urgencySum = 0;

    for (const signal of signals) {
      const effectiveWeight = signal.weight * signal.confidence;
      totalWeight += effectiveWeight;
      confidenceSum += signal.confidence * effectiveWeight;
      urgencySum += signal.value * effectiveWeight;
    }

    return {
      confidence: Math.round(confidenceSum / totalWeight),
      urgency: Math.round(urgencySum / totalWeight),
    };
  }
}
```

### 2.2 Signal Providers

```typescript
// Signal provider interface
interface SignalProvider {
  name: string;
  weight: number; // Default weight (adjustable)
  calculate(projectId: string, opportunity: RefactorOpportunity): Promise<{
    value: number; // 0-100 urgency contribution
    confidence: number; // 0-1 how confident in this signal
    explanation: string;
  } | null>;
}

// Example: Complexity Signal
class ComplexitySignalProvider implements SignalProvider {
  name = 'complexity';
  weight = 1.0;

  async calculate(projectId: string, opportunity: RefactorOpportunity) {
    const history = await complexityHistoryDb.getByFile(
      projectId,
      opportunity.filePath,
      30
    );

    if (history.length < 2) {
      return null; // Not enough data
    }

    const trend = this.calculateTrend(history);
    const velocity = this.calculateVelocity(history);

    // High urgency if complexity is increasing rapidly
    let value = 30; // Base
    if (trend === 'increasing') value += 20;
    if (velocity > 1) value += velocity * 10;

    // Higher confidence with more data points
    const confidence = Math.min(1, history.length / 10);

    return {
      value: Math.min(100, value),
      confidence,
      explanation: `Complexity ${trend} at ${velocity.toFixed(1)}/day`,
    };
  }
}

// Example: Churn Signal (how often file changes)
class ChurnSignalProvider implements SignalProvider {
  name = 'churn';
  weight = 0.8;

  async calculate(projectId: string, opportunity: RefactorOpportunity) {
    const changeEvents = await codeChangeEventDb.getByFile(
      projectId,
      opportunity.filePath,
      30
    );

    const changesPerWeek = changeEvents.length / 4;

    // High churn = high risk of bugs
    let value = Math.min(100, changesPerWeek * 15);

    return {
      value,
      confidence: 0.7,
      explanation: `${changeEvents.length} changes in 30 days`,
    };
  }
}

// Example: Historical Signal (learn from past)
class HistoricalSignalProvider implements SignalProvider {
  name = 'historical';
  weight = 1.2; // High weight - learn from history

  async calculate(projectId: string, opportunity: RefactorOpportunity) {
    // Find similar past predictions
    const similarPredictions = await predictionOutcomeDb.findSimilar(
      opportunity.category,
      opportunity.severity
    );

    if (similarPredictions.length < 5) {
      return null; // Not enough history
    }

    // Calculate how often similar predictions came true
    const confirmed = similarPredictions.filter(p =>
      p.outcome === 'confirmed' || p.outcome === 'prevented'
    ).length;

    const accuracy = confirmed / similarPredictions.length;

    return {
      value: accuracy * 100,
      confidence: Math.min(1, similarPredictions.length / 20),
      explanation: `${Math.round(accuracy * 100)}% of similar predictions were accurate`,
    };
  }
}
```

---

## Phase 3: Autonomous Action Engine

### 3.1 Action Classification

```typescript
// src/app/features/Observatory/lib/actionEngine.ts

export interface ActionDecision {
  action: 'auto_fix' | 'suggest' | 'schedule' | 'escalate' | 'ignore';
  reason: string;
  requirements?: RequirementSpec[];
  scheduledTime?: string;
  escalateTo?: 'user' | 'team' | 'critical_alert';
}

export class ActionEngine {
  // Thresholds (configurable per project)
  private config: ActionConfig = {
    autoFixConfidenceThreshold: 85,
    autoFixSeverityMax: 'medium',
    autoFixTestRequired: true,
    suggestConfidenceThreshold: 50,
    escalateUrgencyThreshold: 90,
    scheduleForOffHours: true,
  };

  async decideAction(prediction: EnhancedPrediction): Promise<ActionDecision> {
    // Rule 1: Critical issues always escalate
    if (prediction.severity === 'critical' || prediction.aggregateUrgency >= 95) {
      return {
        action: 'escalate',
        reason: 'Critical severity or urgency requires human attention',
        escalateTo: 'critical_alert',
      };
    }

    // Rule 2: High confidence + auto-fix available + not too severe
    if (
      prediction.autoFixAvailable &&
      prediction.autoFixConfidence >= this.config.autoFixConfidenceThreshold &&
      this.severityAllowsAutoFix(prediction.severity)
    ) {
      const requirement = await this.generateRequirement(prediction);
      return {
        action: 'auto_fix',
        reason: `High confidence (${prediction.autoFixConfidence}%) auto-fix available`,
        requirements: [requirement],
        scheduledTime: this.config.scheduleForOffHours
          ? this.getNextOffHours()
          : 'immediate',
      };
    }

    // Rule 3: Medium confidence - suggest to user
    if (prediction.aggregateConfidence >= this.config.suggestConfidenceThreshold) {
      return {
        action: 'suggest',
        reason: 'Confidence above suggestion threshold',
        requirements: prediction.suggestedRequirement
          ? [prediction.suggestedRequirement]
          : undefined,
      };
    }

    // Rule 4: Low confidence but high urgency - schedule for later
    if (prediction.aggregateUrgency >= 70) {
      return {
        action: 'schedule',
        reason: 'High urgency but low confidence - needs more observation',
        scheduledTime: this.getNextAnalysisWindow(),
      };
    }

    // Default: ignore low-priority predictions
    return {
      action: 'ignore',
      reason: 'Below action thresholds',
    };
  }

  private async generateRequirement(
    prediction: EnhancedPrediction
  ): Promise<RequirementSpec> {
    // Use learned patterns to generate optimal requirement
    const pattern = await learnedPatternDb.findBySignature(
      prediction.signals.map(s => s.source).sort().join('-')
    );

    if (pattern?.auto_fix_template) {
      return this.applyTemplate(pattern.auto_fix_template, prediction);
    }

    // Generate from prediction details
    return {
      title: `Fix: ${prediction.title}`,
      content: this.buildRequirementContent(prediction),
      estimatedDuration: this.estimateDuration(prediction.preventionEffort),
      tags: ['auto-generated', prediction.predictionType, prediction.severity],
    };
  }
}
```

### 3.2 Execution Pipeline with Feedback

```typescript
// src/app/features/Observatory/lib/executionPipeline.ts

export class ExecutionPipeline {
  async executeWithFeedback(
    prediction: EnhancedPrediction,
    requirement: RequirementSpec
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // 1. Record pre-execution state
    const preState = await this.captureState(prediction.projectId);

    // 2. Create execution record
    const execution = await executionOutcomeDb.create({
      projectId: prediction.projectId,
      requirementId: requirement.id,
      predictionIds: [prediction.id],
      executionType: 'autonomous',
      status: 'running',
      issuesBefore: preState.issueCount,
      healthScoreBefore: preState.healthScore,
      startedAt: new Date().toISOString(),
    });

    try {
      // 3. Execute via Claude Code
      const result = await this.executeRequirement(requirement);

      // 4. Wait for completion and run validation
      if (result.success) {
        // Run tests
        const testResult = await this.runTests(prediction.projectId);

        // Run type check
        const typeResult = await this.runTypeCheck(prediction.projectId);

        // Re-analyze affected files
        const postState = await this.captureState(prediction.projectId);

        // 5. Record outcome
        await executionOutcomeDb.update(execution.id, {
          status: testResult.passed && typeResult.passed ? 'success' : 'partial',
          testsPassed: testResult.passed,
          typeCheckPassed: typeResult.passed,
          filesModified: result.filesChanged.length,
          issuesAfter: postState.issueCount,
          healthScoreAfter: postState.healthScore,
          effectivenessScore: this.calculateEffectiveness(preState, postState),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        });

        // 6. Update prediction outcome
        await predictionOutcomeDb.recordOutcome(prediction, {
          outcome: postState.issueCount < preState.issueCount ? 'prevented' : 'partial',
          resolutionMethod: 'auto_fix',
          actualSeverity: prediction.severity,
        });

        // 7. Update learned patterns
        await this.updateLearnedPatterns(prediction, execution, postState);

        return {
          success: true,
          execution,
          improvement: preState.issueCount - postState.issueCount,
        };
      } else {
        // Handle failure
        await executionOutcomeDb.update(execution.id, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        });

        // Record as learning opportunity
        await predictionOutcomeDb.recordOutcome(prediction, {
          outcome: 'false_positive',
          resolutionMethod: 'auto_fix',
          feedbackNotes: result.error,
        });

        return {
          success: false,
          execution,
          error: result.error,
        };
      }
    } catch (error) {
      // Rollback if needed
      await this.rollback(prediction.projectId, preState);

      await executionOutcomeDb.update(execution.id, {
        status: 'rolled_back',
        completedAt: new Date().toISOString(),
      });

      throw error;
    }
  }

  private async updateLearnedPatterns(
    prediction: EnhancedPrediction,
    execution: DbExecutionOutcome,
    postState: ProjectState
  ): Promise<void> {
    // Calculate pattern signature from prediction characteristics
    const signature = this.generatePatternSignature(prediction);

    // Find or create learned pattern
    const pattern = await learnedPatternDb.findOrCreate(signature, {
      patternName: prediction.title,
      category: prediction.predictionType,
      detectionHeuristics: JSON.stringify(prediction.signals),
    });

    // Update success rate
    const wasSuccessful = execution.status === 'success' &&
      execution.issues_after < execution.issues_before;

    await learnedPatternDb.updateFixSuccess(pattern.id, wasSuccessful);

    // If highly successful, enable auto-fix
    const updatedPattern = await learnedPatternDb.get(pattern.id);
    if (updatedPattern.fix_success_rate > 0.9 && updatedPattern.occurrence_count > 10) {
      await learnedPatternDb.update(pattern.id, {
        canAutoFix: true,
        autoFixConfidence: updatedPattern.fix_success_rate,
      });
    }
  }
}
```

---

## Phase 4: UI Redesign

### 4.1 New Module Structure

Replace `RefactorWizard` with `Observatory`:

```
src/app/features/Observatory/
├── ObservatoryLayout.tsx              # Main entry point
├── components/
│   ├── dashboard/
│   │   ├── HealthOverview.tsx         # Health score + trend
│   │   ├── PredictionsFeed.tsx        # Live predictions list
│   │   ├── ActiveActions.tsx          # Running/scheduled fixes
│   │   ├── RecentOutcomes.tsx         # Recent execution results
│   │   └── QuickStats.tsx             # Key metrics
│   ├── predictions/
│   │   ├── PredictionCard.tsx         # Individual prediction
│   │   ├── PredictionDetail.tsx       # Expanded view
│   │   ├── SignalBreakdown.tsx        # Show all signals
│   │   ├── SimilarPredictions.tsx     # Historical comparison
│   │   └── ActionPanel.tsx            # Accept/dismiss/schedule
│   ├── trends/
│   │   ├── HealthTrendChart.tsx       # Overall health over time
│   │   ├── CategoryBreakdown.tsx      # By category
│   │   ├── VelocityGauge.tsx          # Change velocity
│   │   └── ForecastPanel.tsx          # Future projections
│   ├── learning/
│   │   ├── PatternLibrary.tsx         # Learned patterns
│   │   ├── AccuracyReport.tsx         # Prediction accuracy
│   │   ├── EffectivenessChart.tsx     # Fix effectiveness
│   │   └── FeedbackPanel.tsx          # Provide feedback
│   ├── settings/
│   │   ├── AutomationRules.tsx        # Configure auto-fix rules
│   │   ├── TriggerConfig.tsx          # Observation triggers
│   │   ├── ThresholdConfig.tsx        # Confidence thresholds
│   │   └── NotificationConfig.tsx     # Alerts setup
│   └── analysis/
│       ├── OnDemandScan.tsx           # Manual analysis trigger
│       ├── ScanResults.tsx            # Analysis results
│       ├── CompareSnapshots.tsx       # Compare two points in time
│       └── FileExplorer.tsx           # Browse files with health
```

### 4.2 Dashboard Layout

```tsx
// ObservatoryLayout.tsx
export default function ObservatoryLayout() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20
                         flex items-center justify-center">
            <Telescope className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Code Health Observatory</h1>
            <p className="text-xs text-gray-500">Continuous monitoring & prediction</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ObservationStatus /> {/* Shows if watching is active */}
          <Button onClick={triggerManualScan}>Scan Now</Button>
          <SettingsButton />
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left: Health Overview */}
        <div className="col-span-3 flex flex-col gap-4">
          <HealthOverview />
          <QuickStats />
          <ActiveActions />
        </div>

        {/* Center: Predictions Feed */}
        <div className="col-span-6 flex flex-col">
          <PredictionsFeed />
        </div>

        {/* Right: Trends & Learning */}
        <div className="col-span-3 flex flex-col gap-4">
          <HealthTrendChart />
          <AccuracyReport />
          <RecentOutcomes />
        </div>
      </div>
    </div>
  );
}
```

### 4.3 Prediction Card

```tsx
// PredictionCard.tsx
function PredictionCard({ prediction }: { prediction: EnhancedPrediction }) {
  return (
    <motion.div
      className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4"
      whileHover={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <PredictionIcon type={prediction.predictionType} />
          <span className="font-medium">{prediction.title}</span>
        </div>
        <SeverityBadge severity={prediction.severity} />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-400 mb-3">{prediction.description}</p>

      {/* Confidence & Urgency Bars */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Confidence</span>
            <span className="text-purple-400">{prediction.aggregateConfidence}%</span>
          </div>
          <ProgressBar value={prediction.aggregateConfidence} color="purple" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Urgency</span>
            <span className="text-orange-400">{prediction.aggregateUrgency}%</span>
          </div>
          <ProgressBar value={prediction.aggregateUrgency} color="orange" />
        </div>
      </div>

      {/* Signal Preview */}
      <SignalPreview signals={prediction.signals.slice(0, 3)} />

      {/* Timeframe */}
      {prediction.daysUntilCritical && (
        <div className="flex items-center gap-2 text-xs text-amber-400 mt-3">
          <Clock className="w-3 h-3" />
          <span>Critical in ~{prediction.daysUntilCritical} days</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-800">
        {prediction.autoFixAvailable ? (
          <>
            <Button size="sm" variant="primary" onClick={() => autoFix(prediction)}>
              <Wand2 className="w-4 h-4 mr-1" />
              Auto-fix ({prediction.autoFixConfidence}%)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => viewDetails(prediction)}>
              Review
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="primary" onClick={() => createRequirement(prediction)}>
              Create Task
            </Button>
            <Button size="sm" variant="ghost" onClick={() => dismiss(prediction)}>
              Dismiss
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
```

---

## Phase 5: Integration with Claude Code

### 5.1 Bidirectional Integration

```typescript
// src/app/features/Observatory/lib/claudeIntegration.ts

export class ClaudeCodeIntegration {
  /**
   * Execute requirement and monitor outcome
   */
  async executeAndMonitor(
    projectPath: string,
    requirement: RequirementSpec,
    prediction?: EnhancedPrediction
  ): Promise<ExecutionResult> {
    // 1. Create requirement file
    const reqFile = await this.createRequirementFile(projectPath, requirement);

    // 2. Record pre-execution snapshot
    const preSnapshot = await this.createSnapshot(projectPath);

    // 3. Start execution monitor
    const monitor = new ExecutionMonitor(projectPath);
    monitor.start();

    // 4. Wait for Claude Code to pick up and execute
    // (This integrates with existing Claude Code queue system)
    const executionResult = await this.waitForExecution(reqFile);

    // 5. Stop monitor and analyze changes
    const changes = monitor.stop();

    // 6. Create post-execution snapshot
    const postSnapshot = await this.createSnapshot(projectPath);

    // 7. Compare snapshots and record outcome
    const comparison = this.compareSnapshots(preSnapshot, postSnapshot);

    // 8. If prediction exists, record outcome
    if (prediction) {
      await this.recordPredictionOutcome(prediction, comparison);
    }

    // 9. Update learned patterns
    await this.updatePatterns(requirement, comparison, changes);

    return {
      success: comparison.improved,
      filesChanged: changes.files,
      issuesDelta: comparison.issuesDelta,
      healthDelta: comparison.healthDelta,
    };
  }

  /**
   * Generate optimized requirement from prediction
   */
  async generateRequirement(
    prediction: EnhancedPrediction
  ): Promise<RequirementSpec> {
    // Check if we have a learned pattern with high success rate
    const pattern = await learnedPatternDb.findBestMatch(
      prediction.predictionType,
      prediction.signals
    );

    if (pattern?.auto_fix_template && pattern.fix_success_rate > 0.8) {
      // Use proven template
      return this.applyTemplate(pattern.auto_fix_template, prediction);
    }

    // Generate custom requirement with context
    const projectContext = await loadProjectContext(prediction.projectId);

    return {
      title: `[Auto] ${prediction.title}`,
      content: this.buildRequirementContent(prediction, projectContext),
      priority: this.mapUrgencyToPriority(prediction.aggregateUrgency),
      tags: [
        'observatory-generated',
        prediction.predictionType,
        `confidence-${Math.round(prediction.aggregateConfidence / 10) * 10}`,
      ],
      context: {
        predictionId: prediction.id,
        signals: prediction.signals,
        expectedImprovement: prediction.preventionAction,
      },
    };
  }

  private buildRequirementContent(
    prediction: EnhancedPrediction,
    context: ProjectContext
  ): string {
    return `# ${prediction.title}

## Context
${prediction.description}

**Predicted Impact**: ${prediction.severity}
**Confidence**: ${prediction.aggregateConfidence}%
**Timeframe**: ${prediction.predictedTimeframe}

## Evidence
${prediction.signals.map(s => `- **${s.source}**: ${s.explanation}`).join('\n')}

## Target
- File: ${prediction.targetFile}
${prediction.targetArea ? `- Area: ${prediction.targetArea}` : ''}

## Suggested Action
${prediction.preventionAction}

## Project Context
- Type: ${context.projectType}
- Stack: ${context.techStack.join(', ')}

## Validation
After making changes:
1. Run tests: \`npm test\`
2. Type check: \`npx tsc --noEmit\`
3. Verify the prediction's target area is improved

## Notes
- This requirement was auto-generated by the Code Health Observatory
- Pattern accuracy for similar issues: ${(prediction.patternAccuracy * 100).toFixed(0)}%
`;
  }
}
```

### 5.2 Execution Monitor

```typescript
// src/app/features/Observatory/lib/executionMonitor.ts

export class ExecutionMonitor {
  private watcher: FSWatcher | null = null;
  private changes: FileChange[] = [];
  private startTime: number = 0;

  constructor(private projectPath: string) {}

  start(): void {
    this.startTime = Date.now();
    this.changes = [];

    // Watch for file changes
    this.watcher = watch(this.projectPath, {
      ignored: /(^|[\/\\])(\.|node_modules)/,
      persistent: true,
    });

    this.watcher.on('change', (path) => {
      this.changes.push({
        type: 'modify',
        path,
        timestamp: Date.now(),
      });
    });

    this.watcher.on('add', (path) => {
      this.changes.push({
        type: 'create',
        path,
        timestamp: Date.now(),
      });
    });

    this.watcher.on('unlink', (path) => {
      this.changes.push({
        type: 'delete',
        path,
        timestamp: Date.now(),
      });
    });
  }

  stop(): MonitorResult {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    return {
      files: this.changes,
      duration: Date.now() - this.startTime,
      fileCount: new Set(this.changes.map(c => c.path)).size,
    };
  }
}
```

---

## Phase 6: Learning System

### 6.1 Pattern Learning

```typescript
// src/app/features/Observatory/lib/learningEngine.ts

export class LearningEngine {
  /**
   * Learn from execution outcomes to improve predictions
   */
  async learnFromOutcome(
    execution: DbExecutionOutcome,
    prediction: EnhancedPrediction
  ): Promise<void> {
    // 1. Update signal weights based on outcome
    await this.updateSignalWeights(prediction.signals, execution.status === 'success');

    // 2. Update pattern success rate
    const patternSignature = this.generateSignature(prediction);
    await learnedPatternDb.updateFixSuccess(patternSignature, execution.status === 'success');

    // 3. If very successful, create/update auto-fix template
    if (execution.effectiveness_score > 0.8) {
      await this.createAutoFixTemplate(prediction, execution);
    }

    // 4. If failed, mark pattern as risky
    if (execution.status === 'failed' || execution.new_issues_introduced > 0) {
      await this.markPatternRisky(patternSignature, execution.regressions);
    }
  }

  /**
   * Adjust signal weights based on prediction accuracy
   */
  private async updateSignalWeights(
    signals: PredictionSignal[],
    wasAccurate: boolean
  ): Promise<void> {
    const adjustment = wasAccurate ? 0.05 : -0.03;

    for (const signal of signals) {
      const currentWeight = await this.getSignalWeight(signal.source);
      const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + adjustment));
      await this.setSignalWeight(signal.source, newWeight);
    }
  }

  /**
   * Generate auto-fix template from successful execution
   */
  private async createAutoFixTemplate(
    prediction: EnhancedPrediction,
    execution: DbExecutionOutcome
  ): Promise<void> {
    // Get the requirement that was executed
    const requirement = await requirementDb.get(execution.requirement_id);
    if (!requirement) return;

    // Create a template from it
    const template = {
      name: `Auto-fix: ${prediction.predictionType}`,
      baseContent: requirement.content,
      variables: this.extractVariables(requirement.content, prediction),
      applicableTo: {
        predictionType: prediction.predictionType,
        severity: prediction.severity,
        signals: prediction.signals.map(s => s.source),
      },
    };

    const signature = this.generateSignature(prediction);
    await learnedPatternDb.setAutoFixTemplate(signature, template);
  }

  /**
   * Generate weekly learning report
   */
  async generateLearningReport(projectId: string): Promise<LearningReport> {
    const outcomes = await executionOutcomeDb.getRecent(projectId, 7);
    const predictions = await predictionOutcomeDb.getRecent(projectId, 7);

    return {
      period: '7 days',

      // Prediction accuracy
      predictionsMade: predictions.length,
      predictionsConfirmed: predictions.filter(p => p.outcome === 'confirmed').length,
      predictionsPrevented: predictions.filter(p => p.outcome === 'prevented').length,
      falsePositives: predictions.filter(p => p.outcome === 'false_positive').length,
      accuracy: this.calculateAccuracy(predictions),

      // Execution effectiveness
      executionsAttempted: outcomes.length,
      executionsSuccessful: outcomes.filter(o => o.status === 'success').length,
      averageEffectiveness: this.average(outcomes.map(o => o.effectiveness_score)),
      issuesFixed: outcomes.reduce((sum, o) => sum + (o.issues_before - o.issues_after), 0),

      // Learning progress
      newPatternsLearned: await learnedPatternDb.countNew(7),
      patternsPromotedToAutoFix: await learnedPatternDb.countPromoted(7),

      // Recommendations
      signalAdjustments: await this.getSignalAdjustments(),
      underperformingPatterns: await this.getUnderperformingPatterns(),
      topPerformingPatterns: await this.getTopPerformingPatterns(),
    };
  }
}
```

---

## Implementation Roadmap

### Sprint 1: Foundation (2 weeks)
- [ ] Create database schema and migrations
- [ ] Implement repository layer
- [ ] Build observation trigger system
- [ ] Create analysis snapshot comparison

### Sprint 2: Prediction Engine (2 weeks)
- [ ] Implement signal providers
- [ ] Build multi-signal aggregation
- [ ] Create prediction generation pipeline
- [ ] Integrate with existing pattern detection

### Sprint 3: Action Engine (2 weeks)
- [ ] Implement action decision logic
- [ ] Build execution pipeline
- [ ] Create rollback mechanism
- [ ] Integrate with Claude Code

### Sprint 4: Learning System (2 weeks)
- [ ] Implement outcome tracking
- [ ] Build weight adjustment system
- [ ] Create auto-fix template generation
- [ ] Build learning reports

### Sprint 5: UI Implementation (2 weeks)
- [ ] Build Observatory dashboard
- [ ] Create prediction cards and feed
- [ ] Implement trend visualizations
- [ ] Build settings panels

### Sprint 6: Integration & Polish (2 weeks)
- [ ] Integrate with existing modules
- [ ] Add notification system
- [ ] Performance optimization
- [ ] Documentation and testing

---

## Migration Path

1. **Keep RefactorWizard** as "On-Demand Analysis" mode within Observatory
2. **Merge DebtPrediction** engine into Observatory's prediction system
3. **Deprecate** standalone DebtPrediction modal
4. **Maintain** DSL builder as advanced tool for custom transformations
5. **Preserve** package generation for manual refactoring workflows

---

## Success Metrics

1. **Prediction Accuracy**: Target 70%+ confirmed/prevented outcomes
2. **Auto-fix Success Rate**: Target 85%+ for auto-fixed issues
3. **Health Score Improvement**: Average 10+ point improvement per month
4. **Time to Prevention**: <24 hours from prediction to fix for critical issues
5. **False Positive Rate**: <20% dismissed predictions
6. **User Adoption**: 80%+ of users with active observation triggers

---

## Future Enhancements

1. **Cross-Project Learning**: Share patterns across all Vibeman users (anonymized)
2. **Production Correlation**: Connect predictions with production error rates
3. **Team Insights**: Show team-level patterns and recommendations
4. **IDE Integration**: Show predictions inline in VS Code
5. **Slack/Discord Alerts**: Notify team of critical predictions
6. **CI/CD Integration**: Block merges if health score drops below threshold
