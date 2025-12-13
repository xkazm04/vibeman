import { NextRequest, NextResponse } from 'next/server';
import { securityIntelligenceDb, securityScanDb } from '@/app/db';
import type {
  RiskCalculationInput,
  RiskPrediction,
  RiskFactor,
} from '@/app/db/models/security-intelligence.types';
import { logger } from '@/lib/logger';

/**
 * Calculate predictive risk score based on multiple factors
 */
function calculateRiskScore(input: RiskCalculationInput): RiskPrediction {
  const factors: RiskFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // Factor 1: Critical vulnerabilities (weight: 30)
  const criticalWeight = 30;
  const criticalScore = Math.min(100, input.vulnerabilities.critical * 25);
  factors.push({
    name: 'Critical Vulnerabilities',
    weight: criticalWeight,
    contribution: criticalScore,
    severity: input.vulnerabilities.critical > 0 ? 'critical' : 'low',
    description: `${input.vulnerabilities.critical} critical vulnerabilities detected`,
  });
  totalScore += criticalScore * (criticalWeight / 100);
  totalWeight += criticalWeight;

  // Factor 2: High vulnerabilities (weight: 20)
  const highWeight = 20;
  const highScore = Math.min(100, input.vulnerabilities.high * 15);
  factors.push({
    name: 'High Vulnerabilities',
    weight: highWeight,
    contribution: highScore,
    severity: input.vulnerabilities.high > 2 ? 'high' : input.vulnerabilities.high > 0 ? 'medium' : 'low',
    description: `${input.vulnerabilities.high} high severity vulnerabilities detected`,
  });
  totalScore += highScore * (highWeight / 100);
  totalWeight += highWeight;

  // Factor 3: Medium/Low vulnerabilities (weight: 10)
  const medLowWeight = 10;
  const medLowScore = Math.min(100, (input.vulnerabilities.medium * 5) + (input.vulnerabilities.low * 2));
  factors.push({
    name: 'Medium/Low Vulnerabilities',
    weight: medLowWeight,
    contribution: medLowScore,
    severity: medLowScore > 50 ? 'medium' : 'low',
    description: `${input.vulnerabilities.medium} medium, ${input.vulnerabilities.low} low severity vulnerabilities`,
  });
  totalScore += medLowScore * (medLowWeight / 100);
  totalWeight += medLowWeight;

  // Factor 4: Patch age (weight: 15)
  const patchWeight = 15;
  const patchScore = Math.min(100, input.patchAge * 2); // 50 days = 100 score
  factors.push({
    name: 'Patch Age',
    weight: patchWeight,
    contribution: patchScore,
    severity: input.patchAge > 30 ? 'high' : input.patchAge > 14 ? 'medium' : 'low',
    description: `Last security patch was ${input.patchAge} days ago`,
  });
  totalScore += patchScore * (patchWeight / 100);
  totalWeight += patchWeight;

  // Factor 5: CI health (weight: 10)
  const ciWeight = 10;
  const ciScore = input.ciHealth ? 0 : 100;
  factors.push({
    name: 'CI Health',
    weight: ciWeight,
    contribution: ciScore,
    severity: input.ciHealth ? 'low' : 'high',
    description: input.ciHealth ? 'CI is passing' : 'CI is failing or unknown',
  });
  totalScore += ciScore * (ciWeight / 100);
  totalWeight += ciWeight;

  // Factor 6: Stale branches (weight: 10)
  const branchWeight = 10;
  const branchScore = Math.min(100, input.staleBranchCount * 10);
  factors.push({
    name: 'Stale Branches',
    weight: branchWeight,
    contribution: branchScore,
    severity: input.staleBranchCount > 5 ? 'medium' : 'low',
    description: `${input.staleBranchCount} stale branches with potential vulnerabilities`,
  });
  totalScore += branchScore * (branchWeight / 100);
  totalWeight += branchWeight;

  // Factor 7: Community score (weight: 5)
  if (input.communityScore !== null) {
    const communityWeight = 5;
    const communityScore = 100 - input.communityScore; // Invert: low community score = high risk
    factors.push({
      name: 'Community Trust',
      weight: communityWeight,
      contribution: communityScore,
      severity: input.communityScore < 50 ? 'medium' : 'low',
      description: `Community trust score: ${input.communityScore}%`,
    });
    totalScore += communityScore * (communityWeight / 100);
    totalWeight += communityWeight;
  }

  // Normalize score to 0-100
  const normalizedScore = Math.round((totalScore / totalWeight) * 100);
  const finalScore = Math.min(100, Math.max(0, normalizedScore));

  // Generate recommendations based on factors
  const recommendations: string[] = [];

  if (input.vulnerabilities.critical > 0) {
    recommendations.push('Immediately address critical vulnerabilities to reduce security risk');
  }
  if (input.vulnerabilities.high > 2) {
    recommendations.push('Prioritize fixing high severity vulnerabilities');
  }
  if (input.patchAge > 30) {
    recommendations.push('Apply pending security patches - last patch was over 30 days ago');
  }
  if (!input.ciHealth) {
    recommendations.push('Fix CI pipeline to ensure security checks are running');
  }
  if (input.staleBranchCount > 5) {
    recommendations.push('Clean up stale branches to reduce attack surface');
  }
  if (input.communityScore !== null && input.communityScore < 50) {
    recommendations.push('Review packages with low community trust scores');
  }

  if (recommendations.length === 0) {
    recommendations.push('Security posture is healthy - continue regular maintenance');
  }

  return {
    score: finalScore,
    trend: input.historicalTrend,
    factors,
    recommendations,
  };
}

/**
 * GET /api/security-intelligence/risk-score
 * Get risk score for a project
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const intelligence = securityIntelligenceDb.getByProjectId(projectId);

    if (!intelligence) {
      return NextResponse.json(
        { error: 'Security intelligence not found for this project' },
        { status: 404 }
      );
    }

    // Calculate days since last scan
    const daysSinceLastScan = intelligence.lastScanAt
      ? Math.floor((Date.now() - intelligence.lastScanAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const input: RiskCalculationInput = {
      vulnerabilities: {
        critical: intelligence.criticalCount,
        high: intelligence.highCount,
        medium: intelligence.mediumCount,
        low: intelligence.lowCount,
      },
      patchAge: daysSinceLastScan,
      ciHealth: intelligence.ciStatus === 'passing',
      staleBranchCount: intelligence.staleBranchesCount,
      communityScore: intelligence.communityScore,
      historicalTrend: intelligence.riskTrend,
    };

    const prediction = calculateRiskScore(input);

    return NextResponse.json({
      projectId,
      ...prediction,
    });
  } catch (error) {
    logger.error('Error calculating risk score:', { error });
    return NextResponse.json(
      { error: 'Failed to calculate risk score' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security-intelligence/risk-score
 * Calculate risk score from provided data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vulnerabilities,
      patchAge,
      ciHealth,
      staleBranchCount,
      communityScore,
      historicalTrend,
    } = body;

    if (!vulnerabilities) {
      return NextResponse.json(
        { error: 'vulnerabilities object is required' },
        { status: 400 }
      );
    }

    const input: RiskCalculationInput = {
      vulnerabilities: {
        critical: vulnerabilities.critical || 0,
        high: vulnerabilities.high || 0,
        medium: vulnerabilities.medium || 0,
        low: vulnerabilities.low || 0,
      },
      patchAge: patchAge || 0,
      ciHealth: ciHealth ?? true,
      staleBranchCount: staleBranchCount || 0,
      communityScore: communityScore ?? null,
      historicalTrend: historicalTrend || 'stable',
    };

    const prediction = calculateRiskScore(input);

    return NextResponse.json(prediction);
  } catch (error) {
    logger.error('Error calculating risk score:', { error });
    return NextResponse.json(
      { error: 'Failed to calculate risk score' },
      { status: 500 }
    );
  }
}
