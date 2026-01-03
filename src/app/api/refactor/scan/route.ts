/**
 * Refactor Scan API
 * Scans a project for code quality issues using Observatory signals
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { collectAllSignals } from '@/app/features/Observatory/lib/signals';
import { generatePredictions } from '@/app/features/Observatory/lib/PredictionEngine';

// Get source files in a project
function getProjectFiles(projectPath: string): string[] {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs'];
  const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.claude'];
  const files: string[] = [];

  function walk(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectPath, fullPath);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(relativePath);
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  walk(projectPath);
  return files;
}

interface ScanIssue {
  id: string;
  file: string;
  type: 'complexity' | 'duplication' | 'code-quality' | 'churn' | 'risk';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  line?: number;
  score: number;
  category: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, scanTypes = ['code-quality', 'complexity', 'duplication'] } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    // Verify project path exists
    if (!fs.existsSync(projectPath)) {
      return NextResponse.json(
        { error: 'Project path does not exist' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Get project files
    const files = getProjectFiles(projectPath);

    // Collect signals from Observatory
    const signals = await collectAllSignals(projectPath, files);

    // Generate predictions for issues
    const predictions = await generatePredictions(projectPath, 'quick-refactor', files);

    // Convert signals and predictions to issues format
    const issues: ScanIssue[] = [];
    let issueId = 0;

    // Add issues from top concerns
    for (const concern of signals.aggregated.topConcerns) {
      // Map issue type from concern
      let issueType: ScanIssue['type'] = 'code-quality';
      if (concern.issue.includes('complex') || concern.issue.includes('nesting')) {
        issueType = 'complexity';
      } else if (concern.issue.includes('long') || concern.issue.includes('duplicate')) {
        issueType = 'duplication';
      } else if (concern.issue.includes('churn') || concern.issue.includes('change')) {
        issueType = 'churn';
      }

      // Filter by requested scan types
      const scanTypeMatch = scanTypes.some((st: string) => {
        if (st === 'complexity' && issueType === 'complexity') return true;
        if (st === 'duplication' && issueType === 'duplication') return true;
        if (st === 'code-quality' && (issueType === 'code-quality' || issueType === 'churn')) return true;
        return false;
      });

      if (!scanTypeMatch) continue;

      issues.push({
        id: `issue-${++issueId}`,
        file: concern.file,
        type: issueType,
        severity: concern.severity,
        message: formatIssueMessage(concern.issue),
        score: severityToScore(concern.severity),
        category: categorizeIssue(concern.issue),
      });
    }

    // Add issues from predictions (high confidence only)
    for (const prediction of predictions.predictions) {
      if (prediction.confidence < 0.6) continue;

      // Map prediction severity to issue type
      let issueType: ScanIssue['type'] = 'risk';
      if (prediction.title.toLowerCase().includes('complex')) {
        issueType = 'complexity';
      } else if (prediction.title.toLowerCase().includes('duplicate')) {
        issueType = 'duplication';
      } else if (prediction.severity === 'critical' || prediction.severity === 'high') {
        issueType = 'code-quality';
      }

      // Avoid duplicate issues for same file
      if (issues.some(i => i.file === prediction.file && i.type === issueType)) {
        continue;
      }

      issues.push({
        id: `issue-${++issueId}`,
        file: prediction.file,
        type: issueType,
        severity: prediction.severity,
        message: prediction.description,
        score: severityToScore(prediction.severity),
        category: categorizeIssue(prediction.title),
      });
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      duration,
      filesScanned: files.length,
      issueCount: issues.length,
      issues,
      summary: {
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
        byType: {
          complexity: issues.filter(i => i.type === 'complexity').length,
          duplication: issues.filter(i => i.type === 'duplication').length,
          codeQuality: issues.filter(i => i.type === 'code-quality').length,
          churn: issues.filter(i => i.type === 'churn').length,
          risk: issues.filter(i => i.type === 'risk').length,
        },
      },
      healthScore: signals.aggregated.overallScore,
    });
  } catch (error) {
    console.error('[Refactor Scan] Error:', error);
    return NextResponse.json(
      { error: 'Scan failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function formatIssueMessage(issue: string): string {
  const messages: Record<string, string> = {
    'very-long-file': 'File exceeds recommended length (>500 lines)',
    'high-complexity': 'High cyclomatic complexity detected',
    'deep-nesting': 'Excessive nesting depth (>4 levels)',
    'many-dependencies': 'Too many imports/dependencies',
    'high-churn': 'File changes frequently - potential instability',
    'multi-author': 'Multiple contributors - coordination risk',
  };
  return messages[issue] || issue.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function severityToScore(severity: string): number {
  switch (severity) {
    case 'critical': return 20;
    case 'high': return 40;
    case 'medium': return 60;
    case 'low': return 80;
    default: return 50;
  }
}

function urgencyToSeverity(urgency: number): 'critical' | 'high' | 'medium' | 'low' {
  if (urgency >= 0.8) return 'critical';
  if (urgency >= 0.6) return 'high';
  if (urgency >= 0.4) return 'medium';
  return 'low';
}

function categorizeIssue(type: string): string {
  if (type.includes('complex') || type.includes('nesting')) return 'Structure';
  if (type.includes('long') || type.includes('duplicate')) return 'Maintainability';
  if (type.includes('churn') || type.includes('change')) return 'Stability';
  if (type.includes('bug') || type.includes('error')) return 'Quality';
  if (type.includes('depend') || type.includes('import')) return 'Architecture';
  return 'General';
}
