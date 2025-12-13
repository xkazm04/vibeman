/**
 * Roadmap Generation API
 * Generates strategic roadmap using AI and game-theoretic modeling
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  strategicInitiativeDb,
  roadmapMilestoneDb,
  roadmapSimulationDb,
  impactPredictionDb,
  featureInteractionDb,
  techDebtDb,
  ideaDb,
  goalDb,
} from '@/app/db';
import type { DbStrategicInitiative, DbImpactPrediction, DbFeatureInteraction } from '@/app/db/models/strategic-roadmap.types';

import { logger } from '@/lib/logger';
interface GenerationOptions {
  includeDebt: boolean;
  includeIdeas: boolean;
  includeGoals: boolean;
  horizonMonths: number;
  debtReductionWeight: number;
  velocityWeight: number;
  riskWeight: number;
}

/**
 * POST /api/strategic-roadmap/generate
 * Generate a strategic roadmap based on current project state
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      options = {},
    } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const genOptions: GenerationOptions = {
      includeDebt: options.includeDebt !== false,
      includeIdeas: options.includeIdeas !== false,
      includeGoals: options.includeGoals !== false,
      horizonMonths: options.horizonMonths || 6,
      debtReductionWeight: options.debtReductionWeight || 0.3,
      velocityWeight: options.velocityWeight || 0.4,
      riskWeight: options.riskWeight || 0.3,
    };

    // Gather current project data
    const techDebt = genOptions.includeDebt ? techDebtDb.getTechDebtByProject(projectId) : [];
    const ideas = genOptions.includeIdeas ? ideaDb.getIdeasByProject(projectId) : [];
    const goals = genOptions.includeGoals ? goalDb.getGoalsByProject(projectId) : [];

    // Map to analysis input types
    const techDebtInput = techDebt.map(d => ({
      severity: d.severity,
      category: d.category,
      status: d.status,
    }));

    const ideasInput = ideas.map(i => ({
      category: i.category,
      effort: i.effort ?? 5,  // Default effort if null
      impact: i.impact ?? 5,  // Default impact if null
    }));

    const goalsInput = goals.map(g => ({
      status: g.status,
    }));

    // Analyze and categorize items
    const analysisResult = analyzeProjectState(techDebtInput, ideasInput, goalsInput, genOptions);

    // Generate strategic initiatives
    const initiatives = generateInitiatives(projectId, analysisResult, genOptions);

    // Analyze feature interactions
    const interactions = analyzeInteractions(projectId, initiatives);

    // Generate impact predictions
    const predictions = generatePredictions(projectId, initiatives, interactions);

    // Generate milestones
    const milestones = generateMilestones(projectId, initiatives, genOptions.horizonMonths);

    // Create simulation
    const simulation = createSimulation(projectId, initiatives, milestones, predictions, analysisResult);

    return NextResponse.json({
      success: true,
      generated: {
        initiatives: initiatives.length,
        interactions: interactions.length,
        predictions: predictions.length,
        milestones: milestones.length,
      },
      simulation,
      analysis: analysisResult,
    });
  } catch (error) {
    logger.error('Error generating roadmap:', { data: error });
    return NextResponse.json(
      { error: 'Failed to generate roadmap' },
      { status: 500 }
    );
  }
}

interface AnalysisResult {
  debtSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    categories: Record<string, number>;
  };
  ideaSummary: {
    total: number;
    highPriority: number;
    categories: Record<string, number>;
  };
  goalSummary: {
    total: number;
    active: number;
  };
  recommendedFocus: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  healthScore: number;
}

function analyzeProjectState(
  techDebt: Array<{ severity: string; category: string; status: string }>,
  ideas: Array<{ category: string; effort: number; impact: number }>,
  goals: Array<{ status: string }>,
  _options: GenerationOptions
): AnalysisResult {
  // Analyze tech debt
  const debtBySeverity = techDebt.reduce((acc, d) => {
    acc[d.severity] = (acc[d.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const debtByCategory = techDebt.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Analyze ideas
  const ideaByCategory = ideas.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const highPriorityIdeas = ideas.filter(i => i.impact >= 7 && i.effort <= 5).length;

  // Analyze goals
  const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'in_progress').length;

  // Determine risk level and health score
  const criticalDebt = debtBySeverity['critical'] || 0;
  const highDebt = debtBySeverity['high'] || 0;

  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let healthScore = 80;

  if (criticalDebt > 5) {
    riskLevel = 'critical';
    healthScore = 30;
  } else if (criticalDebt > 0 || highDebt > 10) {
    riskLevel = 'high';
    healthScore = 50;
  } else if (highDebt > 5) {
    riskLevel = 'medium';
    healthScore = 65;
  }

  // Determine recommended focus areas
  const recommendedFocus: string[] = [];

  if (criticalDebt > 0) {
    recommendedFocus.push('Critical debt remediation');
  }
  if (debtByCategory['security'] > 0) {
    recommendedFocus.push('Security hardening');
  }
  if (debtByCategory['performance'] > 2) {
    recommendedFocus.push('Performance optimization');
  }
  if (highPriorityIdeas > 5) {
    recommendedFocus.push('High-impact feature development');
  }
  if (activeGoals === 0) {
    recommendedFocus.push('Goal setting and planning');
  }

  return {
    debtSummary: {
      critical: debtBySeverity['critical'] || 0,
      high: debtBySeverity['high'] || 0,
      medium: debtBySeverity['medium'] || 0,
      low: debtBySeverity['low'] || 0,
      categories: debtByCategory,
    },
    ideaSummary: {
      total: ideas.length,
      highPriority: highPriorityIdeas,
      categories: ideaByCategory,
    },
    goalSummary: {
      total: goals.length,
      active: activeGoals,
    },
    recommendedFocus,
    riskLevel,
    healthScore,
  };
}

function generateInitiatives(
  projectId: string,
  analysis: AnalysisResult,
  options: GenerationOptions
): DbStrategicInitiative[] {
  const initiatives: DbStrategicInitiative[] = [];
  const now = new Date();
  const currentQuarter = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;

  // Generate debt reduction initiatives if needed
  if (analysis.debtSummary.critical > 0) {
    const initiative = strategicInitiativeDb.create({
      project_id: projectId,
      title: 'Critical Technical Debt Elimination',
      description: `Address ${analysis.debtSummary.critical} critical technical debt items to reduce risk and improve stability.`,
      initiative_type: 'debt_reduction',
      priority: 10,
      business_impact_score: 70,
      technical_impact_score: 90,
      risk_reduction_score: 95,
      velocity_impact_score: 20,
      estimated_effort_hours: analysis.debtSummary.critical * 8,
      estimated_complexity: 'high',
      target_quarter: currentQuarter,
      target_month: 1,
      depends_on: '[]',
      blocks: '[]',
      status: 'proposed',
      confidence_score: 85,
      simulated_outcomes: '{}',
      related_tech_debt_ids: '[]',
      related_goal_ids: '[]',
      related_idea_ids: '[]',
      completed_at: null,
    });
    initiatives.push(initiative);
  }

  // Generate security initiative if needed
  if ((analysis.debtSummary.categories['security'] || 0) > 0) {
    const initiative = strategicInitiativeDb.create({
      project_id: projectId,
      title: 'Security Hardening Initiative',
      description: `Address ${analysis.debtSummary.categories['security']} security-related issues to improve application security posture.`,
      initiative_type: 'security',
      priority: 9,
      business_impact_score: 85,
      technical_impact_score: 80,
      risk_reduction_score: 90,
      velocity_impact_score: -5,
      estimated_effort_hours: (analysis.debtSummary.categories['security'] || 0) * 6,
      estimated_complexity: 'high',
      target_quarter: currentQuarter,
      target_month: 2,
      depends_on: '[]',
      blocks: '[]',
      status: 'proposed',
      confidence_score: 80,
      simulated_outcomes: '{}',
      related_tech_debt_ids: '[]',
      related_goal_ids: '[]',
      related_idea_ids: '[]',
      completed_at: null,
    });
    initiatives.push(initiative);
  }

  // Generate performance initiative if needed
  if ((analysis.debtSummary.categories['performance'] || 0) > 2) {
    const initiative = strategicInitiativeDb.create({
      project_id: projectId,
      title: 'Performance Optimization Sprint',
      description: `Optimize ${analysis.debtSummary.categories['performance']} performance-related areas to improve user experience and scalability.`,
      initiative_type: 'performance',
      priority: 7,
      business_impact_score: 75,
      technical_impact_score: 70,
      risk_reduction_score: 30,
      velocity_impact_score: 25,
      estimated_effort_hours: (analysis.debtSummary.categories['performance'] || 0) * 5,
      estimated_complexity: 'medium',
      target_quarter: currentQuarter,
      target_month: 3,
      depends_on: '[]',
      blocks: '[]',
      status: 'proposed',
      confidence_score: 75,
      simulated_outcomes: '{}',
      related_tech_debt_ids: '[]',
      related_goal_ids: '[]',
      related_idea_ids: '[]',
      completed_at: null,
    });
    initiatives.push(initiative);
  }

  // Generate feature initiative based on high-priority ideas
  if (analysis.ideaSummary.highPriority > 0 && options.includeIdeas) {
    const initiative = strategicInitiativeDb.create({
      project_id: projectId,
      title: 'High-Impact Feature Development',
      description: `Implement ${analysis.ideaSummary.highPriority} high-impact, low-effort features to deliver quick value.`,
      initiative_type: 'feature',
      priority: 8,
      business_impact_score: 90,
      technical_impact_score: 50,
      risk_reduction_score: 10,
      velocity_impact_score: 15,
      estimated_effort_hours: analysis.ideaSummary.highPriority * 10,
      estimated_complexity: 'medium',
      target_quarter: currentQuarter,
      target_month: 2,
      depends_on: '[]',
      blocks: '[]',
      status: 'proposed',
      confidence_score: 70,
      simulated_outcomes: '{}',
      related_tech_debt_ids: '[]',
      related_goal_ids: '[]',
      related_idea_ids: '[]',
      completed_at: null,
    });
    initiatives.push(initiative);
  }

  // Generate refactoring initiative for architecture debt
  if ((analysis.debtSummary.categories['architecture'] || 0) > 0 ||
      (analysis.debtSummary.categories['maintainability'] || 0) > 3) {
    const initiative = strategicInitiativeDb.create({
      project_id: projectId,
      title: 'Architecture Modernization',
      description: 'Improve code architecture and maintainability to enable faster future development.',
      initiative_type: 'refactoring',
      priority: 6,
      business_impact_score: 40,
      technical_impact_score: 85,
      risk_reduction_score: 50,
      velocity_impact_score: 40,
      estimated_effort_hours: 40,
      estimated_complexity: 'high',
      target_quarter: currentQuarter,
      target_month: 4,
      depends_on: '[]',
      blocks: '[]',
      status: 'proposed',
      confidence_score: 65,
      simulated_outcomes: '{}',
      related_tech_debt_ids: '[]',
      related_goal_ids: '[]',
      related_idea_ids: '[]',
      completed_at: null,
    });
    initiatives.push(initiative);
  }

  // Generate infrastructure initiative for long-term stability
  const initiative = strategicInitiativeDb.create({
    project_id: projectId,
    title: 'Infrastructure & Tooling Enhancement',
    description: 'Improve development infrastructure, CI/CD, and tooling for better developer experience.',
    initiative_type: 'infrastructure',
    priority: 5,
    business_impact_score: 30,
    technical_impact_score: 75,
    risk_reduction_score: 40,
    velocity_impact_score: 35,
    estimated_effort_hours: 24,
    estimated_complexity: 'medium',
    target_quarter: currentQuarter,
    target_month: 5,
    depends_on: '[]',
    blocks: '[]',
    status: 'proposed',
    confidence_score: 70,
    simulated_outcomes: '{}',
    related_tech_debt_ids: '[]',
    related_goal_ids: '[]',
    related_idea_ids: '[]',
    completed_at: null,
  });
  initiatives.push(initiative);

  return initiatives;
}

function analyzeInteractions(
  projectId: string,
  initiatives: DbStrategicInitiative[]
): DbFeatureInteraction[] {
  const interactions: DbFeatureInteraction[] = [];

  // Analyze interactions between initiatives
  for (let i = 0; i < initiatives.length; i++) {
    for (let j = i + 1; j < initiatives.length; j++) {
      const a = initiatives[i];
      const b = initiatives[j];

      // Determine interaction type based on initiative types
      let interactionType: DbFeatureInteraction['interaction_type'] = 'neutral';
      let strength = 30;
      let impactAOnB = 0;
      let impactBOnA = 0;

      // Security and debt reduction often have synergy
      if ((a.initiative_type === 'security' && b.initiative_type === 'debt_reduction') ||
          (a.initiative_type === 'debt_reduction' && b.initiative_type === 'security')) {
        interactionType = 'synergy';
        strength = 70;
        impactAOnB = 20;
        impactBOnA = 20;
      }

      // Refactoring enables feature development
      if ((a.initiative_type === 'refactoring' && b.initiative_type === 'feature') ||
          (a.initiative_type === 'feature' && b.initiative_type === 'refactoring')) {
        interactionType = 'dependency';
        strength = 60;
        if (a.initiative_type === 'refactoring') {
          impactAOnB = 30;
        } else {
          impactBOnA = 30;
        }
      }

      // Performance and feature might conflict for resources
      if ((a.initiative_type === 'performance' && b.initiative_type === 'feature') ||
          (a.initiative_type === 'feature' && b.initiative_type === 'performance')) {
        interactionType = 'conflict';
        strength = 40;
        impactAOnB = -15;
        impactBOnA = -15;
      }

      // Infrastructure supports everything
      if (a.initiative_type === 'infrastructure' || b.initiative_type === 'infrastructure') {
        interactionType = 'synergy';
        strength = 50;
        impactAOnB = 15;
        impactBOnA = 15;
      }

      if (interactionType !== 'neutral') {
        const interaction = featureInteractionDb.create({
          project_id: projectId,
          feature_a_id: a.id,
          feature_a_type: 'initiative',
          feature_b_id: b.id,
          feature_b_type: 'initiative',
          interaction_type: interactionType,
          interaction_strength: strength,
          is_bidirectional: 1,
          impact_a_on_b: impactAOnB,
          impact_b_on_a: impactBOnA,
          shared_files: '[]',
          shared_contexts: '[]',
          analysis: `${a.initiative_type} and ${b.initiative_type} initiatives have a ${interactionType} relationship.`,
          recommendations: '[]',
        });
        interactions.push(interaction);
      }
    }
  }

  return interactions;
}

function generatePredictions(
  projectId: string,
  initiatives: DbStrategicInitiative[],
  interactions: DbFeatureInteraction[]
): DbImpactPrediction[] {
  const predictions: DbImpactPrediction[] = [];

  for (const initiative of initiatives) {
    // Calculate impacts based on initiative scores
    const debtImpact = initiative.initiative_type === 'debt_reduction'
      ? initiative.risk_reduction_score
      : initiative.initiative_type === 'refactoring'
        ? initiative.risk_reduction_score * 0.5
        : 0;

    const velocityImpact = initiative.velocity_impact_score;
    const riskImpact = initiative.risk_reduction_score;
    const complexityImpact = initiative.initiative_type === 'refactoring'
      ? 30
      : initiative.initiative_type === 'infrastructure'
        ? 20
        : -5;

    // Adjust based on interactions
    const relatedInteractions = interactions.filter(
      i => i.feature_a_id === initiative.id || i.feature_b_id === initiative.id
    );

    let interactionBonus = 0;
    for (const interaction of relatedInteractions) {
      if (interaction.interaction_type === 'synergy') {
        interactionBonus += interaction.interaction_strength * 0.2;
      } else if (interaction.interaction_type === 'conflict') {
        interactionBonus -= interaction.interaction_strength * 0.15;
      }
    }

    // Create 6-month prediction
    const prediction = impactPredictionDb.create({
      project_id: projectId,
      subject_type: 'initiative',
      subject_id: initiative.id,
      prediction_horizon: '6_months',
      predicted_at: new Date().toISOString(),
      debt_impact: Math.round(Math.max(-100, Math.min(100, debtImpact + interactionBonus))),
      velocity_impact: Math.round(Math.max(-100, Math.min(100, velocityImpact + interactionBonus))),
      risk_impact: Math.round(Math.max(-100, Math.min(100, riskImpact))),
      complexity_impact: Math.round(Math.max(-100, Math.min(100, complexityImpact))),
      confidence_score: initiative.confidence_score,
      methodology: 'Game-theoretic analysis with interaction modeling',
      interactions: JSON.stringify(relatedInteractions.map(i => i.id)),
      nash_equilibrium: null,
      pareto_optimal: relatedInteractions.every(i => i.interaction_type !== 'conflict') ? 1 : 0,
      simulation_runs: 100,
      best_case_outcome: JSON.stringify({
        velocityIncrease: velocityImpact * 1.5,
        debtReduction: debtImpact * 1.3,
        riskReduction: riskImpact * 1.2,
      }),
      worst_case_outcome: JSON.stringify({
        velocityIncrease: velocityImpact * 0.5,
        debtReduction: debtImpact * 0.7,
        riskReduction: riskImpact * 0.6,
      }),
      most_likely_outcome: JSON.stringify({
        velocityIncrease: velocityImpact,
        debtReduction: debtImpact,
        riskReduction: riskImpact,
      }),
      actual_outcome: null,
      prediction_accuracy: null,
      validated_at: null,
    });
    predictions.push(prediction);
  }

  return predictions;
}

function generateMilestones(
  projectId: string,
  initiatives: DbStrategicInitiative[],
  horizonMonths: number
) {
  const milestones = [];
  const now = new Date();

  // Group initiatives by month
  const initiativesByMonth: Record<number, DbStrategicInitiative[]> = {};
  for (const initiative of initiatives) {
    const month = initiative.target_month;
    if (!initiativesByMonth[month]) {
      initiativesByMonth[month] = [];
    }
    initiativesByMonth[month].push(initiative);
  }

  // Create monthly milestones
  for (let month = 1; month <= horizonMonths; month++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + month, 1);
    const monthInitiatives = initiativesByMonth[month] || [];

    // Calculate expected health score improvement
    let healthImprovement = 0;
    let debtReduction = 0;
    let velocityImprovement = 0;

    for (const initiative of monthInitiatives) {
      healthImprovement += initiative.risk_reduction_score * 0.3 +
                          initiative.technical_impact_score * 0.2;
      debtReduction += initiative.initiative_type === 'debt_reduction' ? 5 : 1;
      velocityImprovement += initiative.velocity_impact_score;
    }

    const milestone = roadmapMilestoneDb.create({
      project_id: projectId,
      initiative_id: monthInitiatives.length > 0 ? monthInitiatives[0].id : null,
      title: `Month ${month} Checkpoint`,
      description: monthInitiatives.length > 0
        ? `Complete ${monthInitiatives.map(i => i.title).join(', ')}`
        : `Review progress and adjust roadmap`,
      target_date: targetDate.toISOString(),
      quarter_index: Math.ceil(month / 3),
      month_index: month,
      target_health_score: Math.min(100, 70 + healthImprovement),
      target_debt_reduction: debtReduction,
      target_velocity_improvement: Math.round(velocityImprovement),
      actual_health_score: null,
      actual_debt_reduction: null,
      actual_velocity_change: null,
      status: 'upcoming',
      key_results: JSON.stringify(monthInitiatives.map(i => ({
        initiativeId: i.id,
        title: i.title,
        target: i.status === 'completed' ? 'verified' : 'completion',
      }))),
      achieved_at: null,
    });
    milestones.push(milestone);
  }

  return milestones;
}

function createSimulation(
  projectId: string,
  initiatives: DbStrategicInitiative[],
  milestones: ReturnType<typeof generateMilestones>,
  predictions: DbImpactPrediction[],
  analysis: AnalysisResult
) {
  // Calculate aggregate metrics
  let totalDebtReduction = 0;
  let velocityImprovement = 0;
  let riskReduction = 0;

  for (const prediction of predictions) {
    totalDebtReduction += prediction.debt_impact;
    velocityImprovement += prediction.velocity_impact;
    riskReduction += prediction.risk_impact;
  }

  // Create health score projection
  const healthScores = [];
  let currentScore = analysis.healthScore;
  for (let month = 1; month <= 6; month++) {
    currentScore = Math.min(100, currentScore + (riskReduction / 6) * 0.3);
    healthScores.push({
      month,
      score: Math.round(currentScore),
    });
  }

  // Create velocity projection
  const velocityProjection = [];
  let baseVelocity = 10;
  for (let month = 1; month <= 6; month++) {
    baseVelocity += velocityImprovement / 6 * 0.1;
    velocityProjection.push({
      month,
      velocity: Math.round(baseVelocity * 10) / 10,
    });
  }

  const simulation = roadmapSimulationDb.create({
    project_id: projectId,
    name: `Generated Roadmap - ${new Date().toLocaleDateString()}`,
    description: 'AI-generated strategic roadmap based on current project analysis',
    simulation_type: 'baseline',
    input_parameters: JSON.stringify({
      analysisDate: new Date().toISOString(),
      includeDebt: true,
      includeIdeas: true,
      includeGoals: true,
    }),
    assumptions: JSON.stringify([
      'Current team velocity is maintained',
      'No major scope changes',
      'Resources remain constant',
      'Dependencies are resolved on time',
    ]),
    projected_initiatives: JSON.stringify(initiatives.map(i => ({
      id: i.id,
      title: i.title,
      month: i.target_month,
      type: i.initiative_type,
    }))),
    projected_milestones: JSON.stringify(milestones.map(m => ({
      id: m.id,
      title: m.title,
      month: m.month_index,
      targetHealth: m.target_health_score,
    }))),
    projected_health_scores: JSON.stringify(healthScores),
    projected_velocity: JSON.stringify(velocityProjection),
    total_debt_reduction: Math.round(totalDebtReduction),
    velocity_improvement: Math.round(velocityImprovement),
    risk_reduction: Math.round(riskReduction),
    is_selected: 1,
    comparison_notes: null,
  });

  return simulation;
}
