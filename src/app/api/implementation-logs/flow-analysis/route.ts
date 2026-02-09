/**
 * Flow Analysis API
 * Computes cross-context implementation adjacency matrix,
 * success rates per context-group pair, and bottleneck detection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { implementationLogDb, contextDb } from '@/app/db';

interface FlowPair {
  source_group_id: string;
  target_group_id: string;
  total_count: number;
  success_count: number;
  fail_count: number;
  success_rate: number;
  log_ids: string[];
}

interface Bottleneck {
  group_id: string;
  cross_context_fail_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get all implementation logs for the project
    const allLogs = implementationLogDb.getLogsByProject(projectId);

    // Get all contexts for the project to build file-to-group mapping
    const contexts = contextDb.getContextsByProject(projectId);

    // Build a map: context_id -> group_id
    const contextToGroup = new Map<string, string>();
    contexts.forEach(ctx => {
      if (ctx.group_id) {
        contextToGroup.set(ctx.id, ctx.group_id);
      }
    });

    // Build a map: file_path -> group_id (via context file_paths)
    const fileToGroups = new Map<string, Set<string>>();
    contexts.forEach(ctx => {
      if (!ctx.group_id) return;
      try {
        const filePaths: string[] = JSON.parse(ctx.file_paths || '[]');
        filePaths.forEach(fp => {
          const normalized = fp.replace(/\\/g, '/');
          if (!fileToGroups.has(normalized)) {
            fileToGroups.set(normalized, new Set());
          }
          fileToGroups.get(normalized)!.add(ctx.group_id!);
        });
      } catch {
        // Skip contexts with invalid file_paths JSON
      }
    });

    // For each log, determine which groups it touches
    // Primary: via context_id -> group_id
    // The log's context_id directly maps to a group
    const logGroupMap = new Map<string, Set<string>>();

    allLogs.forEach(log => {
      const groups = new Set<string>();

      // Direct context assignment
      if (log.context_id) {
        const groupId = contextToGroup.get(log.context_id);
        if (groupId) {
          groups.add(groupId);
        }
      }

      if (groups.size > 0) {
        logGroupMap.set(log.id, groups);
      }
    });

    // Build adjacency matrix for cross-context group pairs
    // A log that touches groups A and B counts as a cross-context implementation
    // For logs with a single group, we still track them for potential pairing
    // with other logs in the same requirement_name
    const pairCounts = new Map<string, { total: number; success: number; fail: number; logIds: string[] }>();

    // Group logs by requirement_name to find cross-context implementations
    const logsByRequirement = new Map<string, typeof allLogs>();
    allLogs.forEach(log => {
      const key = log.requirement_name;
      if (!logsByRequirement.has(key)) {
        logsByRequirement.set(key, []);
      }
      logsByRequirement.get(key)!.push(log);
    });

    // For each requirement, collect all groups touched
    logsByRequirement.forEach((reqLogs) => {
      const allGroupsInReq = new Set<string>();
      reqLogs.forEach(log => {
        const groups = logGroupMap.get(log.id);
        if (groups) {
          groups.forEach(g => allGroupsInReq.add(g));
        }
      });

      // If requirement touches 2+ groups, create pairs
      const groupArray = Array.from(allGroupsInReq);
      if (groupArray.length < 2) return;

      // Determine if this requirement was successful (tested=1) or failed
      const isSuccess = reqLogs.some(l => l.tested === 1);

      for (let i = 0; i < groupArray.length; i++) {
        for (let j = i + 1; j < groupArray.length; j++) {
          const pairKey = [groupArray[i], groupArray[j]].sort().join('::');
          if (!pairCounts.has(pairKey)) {
            pairCounts.set(pairKey, { total: 0, success: 0, fail: 0, logIds: [] });
          }
          const pair = pairCounts.get(pairKey)!;
          pair.total += 1;
          if (isSuccess) {
            pair.success += 1;
          } else {
            pair.fail += 1;
          }
          reqLogs.forEach(l => {
            if (!pair.logIds.includes(l.id)) {
              pair.logIds.push(l.id);
            }
          });
        }
      }
    });

    // Convert to output format
    const pairs: FlowPair[] = [];
    pairCounts.forEach((data, key) => {
      const [sourceId, targetId] = key.split('::');
      pairs.push({
        source_group_id: sourceId,
        target_group_id: targetId,
        total_count: data.total,
        success_count: data.success,
        fail_count: data.fail,
        success_rate: data.total > 0 ? data.success / data.total : 0,
        log_ids: data.logIds,
      });
    });

    // Sort by total count descending
    pairs.sort((a, b) => b.total_count - a.total_count);

    // Detect bottlenecks: groups appearing in 3+ failed cross-context implementations
    const groupFailCounts = new Map<string, number>();
    pairs.forEach(pair => {
      if (pair.fail_count > 0) {
        groupFailCounts.set(
          pair.source_group_id,
          (groupFailCounts.get(pair.source_group_id) || 0) + pair.fail_count
        );
        groupFailCounts.set(
          pair.target_group_id,
          (groupFailCounts.get(pair.target_group_id) || 0) + pair.fail_count
        );
      }
    });

    const bottlenecks: Bottleneck[] = [];
    groupFailCounts.forEach((failCount, groupId) => {
      if (failCount >= 3) {
        bottlenecks.push({ group_id: groupId, cross_context_fail_count: failCount });
      }
    });
    bottlenecks.sort((a, b) => b.cross_context_fail_count - a.cross_context_fail_count);

    return NextResponse.json({
      success: true,
      data: {
        pairs,
        bottlenecks,
        total_logs: allLogs.length,
        cross_context_count: pairs.reduce((sum, p) => sum + p.total_count, 0),
      },
    });
  } catch (error) {
    console.error('Flow analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compute flow analysis' },
      { status: 500 }
    );
  }
}
