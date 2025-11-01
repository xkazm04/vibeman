/**
 * Technical Debt Scan API
 * POST /api/tech-debt/scan - Initiate a new tech debt scan for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { techDebtDb, scanDb } from '@/app/db';
import { scanProjectForTechDebt, prepareIssuesForDatabase } from '@/app/features/TechDebtRadar/lib/techDebtScanner';
import type { TechDebtScanConfig } from '@/app/db/models/tech-debt.types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      scanTypes,
      filePatterns,
      excludePatterns,
      maxItems,
      autoCreateBacklog
    } = body;

    // Validate required fields
    if (!projectId || !scanTypes || !Array.isArray(scanTypes)) {
      return NextResponse.json(
        { error: 'projectId and scanTypes (array) are required' },
        { status: 400 }
      );
    }

    // Create scan record
    const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const scan = scanDb.createScan({
      id: scanId,
      project_id: projectId,
      scan_type: 'tech_debt',
      summary: `Technical debt scan: ${scanTypes.join(', ')}`,
      input_tokens: null,
      output_tokens: null
    });

    // Configure scan
    const config: TechDebtScanConfig = {
      projectId,
      scanTypes,
      filePatterns,
      excludePatterns,
      maxItems,
      autoCreateBacklog
    };

    // Run scan
    const detectedIssues = await scanProjectForTechDebt(config);

    // Prepare issues for database
    const techDebtItems = prepareIssuesForDatabase(detectedIssues, projectId, scanId);

    // Insert into database
    const createdItems = techDebtItems.map((item) => techDebtDb.createTechDebt(item));

    // Optionally create backlog items
    if (autoCreateBacklog) {
      // Import backlog creation logic
      const { backlogDb } = await import('@/app/db');

      for (const item of createdItems) {
        if (item.severity === 'critical' || item.severity === 'high') {
          const backlogId = `backlog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          const backlogItem = backlogDb.createBacklogItem({
            id: backlogId,
            project_id: projectId,
            goal_id: null,
            agent: 'developer',
            title: `[Tech Debt] ${item.title}`,
            description: item.description,
            status: 'pending',
            type: 'custom',
            impacted_files: item.file_paths ? JSON.parse(item.file_paths).map((path: string) => ({
              path,
              changeType: 'modify',
              description: 'Address technical debt'
            })) : []
          });

          // Link tech debt to backlog item
          techDebtDb.updateTechDebt(item.id, {
            backlog_item_id: backlogId
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      scanId,
      itemsFound: createdItems.length,
      items: createdItems
    }, { status: 201 });
  } catch (error) {
    console.error('Error running tech debt scan:', error);
    return NextResponse.json(
      { error: 'Failed to run tech debt scan', details: String(error) },
      { status: 500 }
    );
  }
}
