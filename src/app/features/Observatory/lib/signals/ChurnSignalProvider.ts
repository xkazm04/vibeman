/**
 * Churn Signal Provider
 * Tracks file change frequency and modification patterns
 * High churn files are often sources of bugs and complexity
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { SignalProvider, SignalResult, FileSignal } from './types';

const execAsync = promisify(exec);

// Churn thresholds (commits in last 30 days)
const THRESHOLDS = {
  commits: { warning: 10, critical: 20 },
  contributors: { warning: 3, critical: 5 },
  linesChangedRatio: { warning: 0.5, critical: 0.8 }, // Ratio of lines changed to total lines
};

interface GitLogEntry {
  file: string;
  commits: number;
  contributors: Set<string>;
  linesAdded: number;
  linesRemoved: number;
}

/**
 * Get git log for the project
 */
async function getGitLog(
  projectPath: string,
  days: number = 30
): Promise<Map<string, GitLogEntry>> {
  const result = new Map<string, GitLogEntry>();

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get commit count and authors per file
    const { stdout: logOutput } = await execAsync(
      `git log --since="${since}" --name-only --pretty=format:"%an" --`,
      { cwd: projectPath, maxBuffer: 10 * 1024 * 1024 }
    );

    const lines = logOutput.split('\n');
    let currentAuthor = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // If it doesn't look like a file path, it's an author
      if (!trimmed.includes('/') && !trimmed.includes('.')) {
        currentAuthor = trimmed;
        continue;
      }

      // It's a file
      if (!result.has(trimmed)) {
        result.set(trimmed, {
          file: trimmed,
          commits: 0,
          contributors: new Set(),
          linesAdded: 0,
          linesRemoved: 0,
        });
      }

      const entry = result.get(trimmed)!;
      entry.commits++;
      if (currentAuthor) {
        entry.contributors.add(currentAuthor);
      }
    }

    // Get lines changed per file (numstat)
    const { stdout: numstatOutput } = await execAsync(
      `git log --since="${since}" --numstat --pretty="" --`,
      { cwd: projectPath, maxBuffer: 10 * 1024 * 1024 }
    );

    const numstatLines = numstatOutput.split('\n');
    for (const line of numstatLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parts = trimmed.split('\t');
      if (parts.length >= 3) {
        const added = parseInt(parts[0], 10) || 0;
        const removed = parseInt(parts[1], 10) || 0;
        const file = parts[2];

        if (result.has(file)) {
          const entry = result.get(file)!;
          entry.linesAdded += added;
          entry.linesRemoved += removed;
        }
      }
    }
  } catch (error) {
    // Git not available or not a git repo
    console.warn('[ChurnSignalProvider] Git analysis failed:', error);
  }

  return result;
}

/**
 * Calculate churn score for a file
 */
function calculateChurnScore(entry: GitLogEntry, totalLines: number): number {
  let score = 100;

  // Penalize high commit count
  if (entry.commits > THRESHOLDS.commits.critical) {
    score -= 30;
  } else if (entry.commits > THRESHOLDS.commits.warning) {
    score -= 15;
  }

  // Penalize many contributors (can indicate unclear ownership)
  if (entry.contributors.size > THRESHOLDS.contributors.critical) {
    score -= 20;
  } else if (entry.contributors.size > THRESHOLDS.contributors.warning) {
    score -= 10;
  }

  // Penalize high churn ratio
  if (totalLines > 0) {
    const churnRatio = (entry.linesAdded + entry.linesRemoved) / totalLines;
    if (churnRatio > THRESHOLDS.linesChangedRatio.critical) {
      score -= 30;
    } else if (churnRatio > THRESHOLDS.linesChangedRatio.warning) {
      score -= 15;
    }
  }

  return Math.max(0, score);
}

/**
 * Churn Signal Provider
 */
export const ChurnSignalProvider: SignalProvider = {
  id: 'churn',
  name: 'File Churn',
  description: 'Tracks file change frequency and modification patterns to identify hotspots',
  weight: 0.2, // 20% weight in overall calculation

  async isAvailable(projectPath: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: projectPath });
      return true;
    } catch {
      return false;
    }
  },

  async collect(projectPath: string, files?: string[]): Promise<SignalResult> {
    const gitLog = await getGitLog(projectPath, 30);

    // If specific files provided, filter to those
    let targetFiles = files;
    if (!targetFiles) {
      targetFiles = Array.from(gitLog.keys());
    }

    const fileSignals = await this.getFileSignals(projectPath, targetFiles);

    // Calculate aggregates
    const scores = fileSignals.map((f) => f.score);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;

    // Find high churn files
    const highChurn = [...fileSignals]
      .filter((f) => f.score < 50)
      .sort((a, b) => a.score - b.score)
      .slice(0, 10);

    // Aggregate churn stats
    let totalCommits = 0;
    let totalContributors = new Set<string>();
    let totalLinesChanged = 0;

    for (const entry of gitLog.values()) {
      totalCommits += entry.commits;
      entry.contributors.forEach((c) => totalContributors.add(c));
      totalLinesChanged += entry.linesAdded + entry.linesRemoved;
    }

    return {
      providerId: this.id,
      timestamp: new Date().toISOString(),
      confidence: gitLog.size > 0 ? 0.9 : 0.1, // High confidence if git data available
      weight: this.weight,
      data: {
        averageScore: avgScore,
        filesAnalyzed: fileSignals.length,
        highChurnFiles: highChurn.map((f) => ({
          file: f.filePath,
          score: f.score,
          metrics: f.metrics,
        })),
        projectStats: {
          totalCommits,
          uniqueContributors: totalContributors.size,
          totalLinesChanged,
          analyzedDays: 30,
        },
      },
    };
  },

  async getFileSignals(projectPath: string, files: string[]): Promise<FileSignal[]> {
    const gitLog = await getGitLog(projectPath, 30);
    const results: FileSignal[] = [];

    for (const file of files) {
      const entry = gitLog.get(file);

      if (!entry) {
        // No git history for this file (might be new)
        results.push({
          filePath: file,
          score: 100,
          metrics: {
            commits: 0,
            contributors: 0,
            linesAdded: 0,
            linesRemoved: 0,
            churnRatio: 0,
          },
          flags: [],
        });
        continue;
      }

      // Get total lines in file
      let totalLines = 0;
      try {
        const fullPath = path.isAbsolute(file) ? file : path.join(projectPath, file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          totalLines = content.split('\n').length;
        }
      } catch {
        // Ignore read errors
      }

      const score = calculateChurnScore(entry, totalLines);
      const churnRatio = totalLines > 0 ? (entry.linesAdded + entry.linesRemoved) / totalLines : 0;

      const flags: string[] = [];
      if (entry.commits > THRESHOLDS.commits.critical) flags.push('high-commit-frequency');
      if (entry.contributors.size > THRESHOLDS.contributors.critical) flags.push('many-contributors');
      if (churnRatio > THRESHOLDS.linesChangedRatio.critical) flags.push('high-churn-ratio');

      results.push({
        filePath: file,
        score,
        metrics: {
          commits: entry.commits,
          contributors: entry.contributors.size,
          linesAdded: entry.linesAdded,
          linesRemoved: entry.linesRemoved,
          churnRatio: Math.round(churnRatio * 100) / 100,
        },
        flags,
      });
    }

    return results;
  },
};

export default ChurnSignalProvider;
