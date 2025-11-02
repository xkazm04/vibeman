/**
 * Scan Briefing Service for Voicebot
 * Generates spoken summaries of scan status and findings
 */

import { scanRepository } from '@/app/db/repositories/scan.repository';
import { scanQueueRepository } from '@/app/db/repositories/scanQueue.repository';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { DbScan, DbScanQueueItem } from '@/app/db/models/types';

export interface ScanBriefingSummary {
  text: string;
  data: {
    totalScans: number;
    recentScans: number;
    queuedScans: number;
    runningScans: number;
    totalIdeas: number;
    recentIdeas: number;
    tokenUsage: {
      input: number;
      output: number;
    };
  };
}

/**
 * Generate a comprehensive scan status briefing
 * @param projectId - Project to analyze
 * @param timeframeHours - How far back to look for "recent" scans (default: 24 hours)
 * @returns Spoken summary and data
 */
export async function generateScanBriefing(
  projectId: string,
  timeframeHours: number = 24
): Promise<ScanBriefingSummary> {
  // Fetch all relevant data
  const allScans = scanRepository.getScansByProject(projectId);
  const queueItems = scanQueueRepository.getQueueByProject(projectId);
  const allIdeas = ideaRepository.getAllIdeas();
  const projectIdeas = allIdeas.filter(idea => idea.project_id === projectId);
  const tokenStats = scanRepository.getTokenStatsByProject(projectId);

  // Calculate timeframe cutoff
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - timeframeHours);
  const cutoffIso = cutoffTime.toISOString();

  // Filter recent scans
  const recentScans = allScans.filter(scan => scan.created_at >= cutoffIso);

  // Filter recent ideas
  const recentIdeas = projectIdeas.filter(idea => idea.created_at >= cutoffIso);

  // Count queue statuses
  const queuedScans = queueItems.filter(item => item.status === 'queued').length;
  const runningScans = queueItems.filter(item => item.status === 'running').length;

  // Build spoken summary
  const summary = buildSpokenSummary({
    totalScans: allScans.length,
    recentScans: recentScans.length,
    queuedScans,
    runningScans,
    totalIdeas: projectIdeas.length,
    recentIdeas: recentIdeas.length,
    tokenStats,
    timeframeHours
  });

  return {
    text: summary,
    data: {
      totalScans: allScans.length,
      recentScans: recentScans.length,
      queuedScans,
      runningScans,
      totalIdeas: projectIdeas.length,
      recentIdeas: recentIdeas.length,
      tokenUsage: {
        input: tokenStats.totalInputTokens,
        output: tokenStats.totalOutputTokens
      }
    }
  };
}

/**
 * Build a natural-sounding spoken summary
 */
function buildSpokenSummary(data: {
  totalScans: number;
  recentScans: number;
  queuedScans: number;
  runningScans: number;
  totalIdeas: number;
  recentIdeas: number;
  tokenStats: { totalInputTokens: number; totalOutputTokens: number; scanCount: number };
  timeframeHours: number;
}): string {
  const parts: string[] = [];

  // Opening
  parts.push("Here's your scan briefing.");

  // Overall scan status
  if (data.totalScans === 0) {
    parts.push("No scans have been run yet.");
  } else {
    parts.push(`You have ${data.totalScans} total scan${data.totalScans === 1 ? '' : 's'}.`);

    if (data.recentScans > 0) {
      parts.push(`${data.recentScans} completed in the last ${data.timeframeHours} hours.`);
    }
  }

  // Queue status
  if (data.runningScans > 0) {
    parts.push(`${data.runningScans} scan${data.runningScans === 1 ? ' is' : 's are'} currently running.`);
  }

  if (data.queuedScans > 0) {
    parts.push(`${data.queuedScans} scan${data.queuedScans === 1 ? ' is' : 's are'} queued.`);
  }

  if (data.runningScans === 0 && data.queuedScans === 0 && data.totalScans > 0) {
    parts.push("All scans are complete.");
  }

  // Ideas generated
  if (data.totalIdeas > 0) {
    parts.push(`You've generated ${data.totalIdeas} idea${data.totalIdeas === 1 ? '' : 's'} so far.`);

    if (data.recentIdeas > 0) {
      parts.push(`${data.recentIdeas} of those came from recent scans.`);
    }
  }

  // Token usage (if significant)
  const totalTokens = data.tokenStats.totalInputTokens + data.tokenStats.totalOutputTokens;
  if (totalTokens > 0) {
    const tokenInK = Math.round(totalTokens / 1000);
    if (tokenInK > 0) {
      parts.push(`You've used approximately ${tokenInK} thousand tokens.`);
    }
  }

  // Closing
  if (data.queuedScans > 0 || data.runningScans > 0) {
    parts.push("Stay tuned for more results.");
  } else if (data.totalScans > 0 && data.totalIdeas > 0) {
    parts.push("Great work!");
  }

  return parts.join(' ');
}

/**
 * Generate a quick status update (shorter version)
 */
export async function generateQuickScanStatus(projectId: string): Promise<string> {
  const queueItems = scanQueueRepository.getQueueByProject(projectId);
  const allScans = scanRepository.getScansByProject(projectId);

  const queuedScans = queueItems.filter(item => item.status === 'queued').length;
  const runningScans = queueItems.filter(item => item.status === 'running').length;

  if (runningScans > 0) {
    return `${runningScans} scan${runningScans === 1 ? ' is' : 's are'} running. ${queuedScans > 0 ? `${queuedScans} queued.` : ''}`;
  }

  if (queuedScans > 0) {
    return `${queuedScans} scan${queuedScans === 1 ? ' is' : 's are'} queued and ready to start.`;
  }

  if (allScans.length === 0) {
    return "No scans yet. Ready to start scanning!";
  }

  return `All scans complete. ${allScans.length} total scans.`;
}
