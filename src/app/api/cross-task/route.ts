/**
 * Cross Task API Route
 * POST: Create a new cross-task analysis plan
 * GET: List cross-task plans for a workspace
 */

import { NextResponse } from 'next/server';
import { crossTaskPlanDb, contextDb, crossProjectRelationshipDb, architectureAnalysisDb, serverProjectDb } from '@/app/db';
import { generateId } from '@/app/db/repositories/repository.utils';
import { buildCrossTaskPrompt } from '@/lib/cross-task/promptBuilder';
import type { CrossTaskContextData, CrossTaskArchitectureContext, CrossTaskArchitectureRelationship } from '@/app/db/models/cross-task.types';

interface CreateCrossTaskRequest {
  workspaceId: string | null;
  projectIds: string[];
  requirement: string;
  projects: Array<{
    id: string;
    name: string;
    path: string;
  }>;
}

export async function POST(request: Request) {
  try {
    const body: CreateCrossTaskRequest = await request.json();
    const { workspaceId, projectIds, requirement, projects } = body;

    // Validate required fields
    if (!projectIds || projectIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one project must be selected' },
        { status: 400 }
      );
    }

    if (!requirement || requirement.trim().length === 0) {
      return NextResponse.json(
        { error: 'Requirement is required' },
        { status: 400 }
      );
    }

    // Check for running analysis
    const running = crossTaskPlanDb.getRunning(workspaceId);
    if (running) {
      return NextResponse.json(
        { error: 'An analysis is already running for this workspace', runningPlanId: running.id },
        { status: 409 }
      );
    }

    // Generate plan ID
    const planId = generateId('ctp');

    // Build context data for each project
    const projectContexts: CrossTaskContextData[] = [];

    for (const project of projects) {
      // Get contexts for this project
      const contexts = contextDb.getContextsByProject(project.id);

      const contextData: CrossTaskContextData = {
        projectId: project.id,
        projectName: project.name,
        projectPath: project.path,
        contexts: contexts.map((ctx) => ({
          id: ctx.id,
          name: ctx.name,
          businessFeature: ctx.business_feature || null,
          category: ctx.category as 'ui' | 'lib' | 'api' | 'data' | null,
          apiRoutes: ctx.api_routes ? JSON.parse(ctx.api_routes) : null,
          filePaths: ctx.file_paths ? JSON.parse(ctx.file_paths) : [],
          contextFilePath: ctx.context_file_path || null,
        })),
      };

      projectContexts.push(contextData);
    }

    // Get callback URL from request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const callbackUrl = `${baseUrl}/api/cross-task/${planId}/complete`;

    // Load architecture data for the selected projects
    let architectureContext: CrossTaskArchitectureContext | null = null;
    try {
      // Get all relationships for this workspace
      const allRelationships = crossProjectRelationshipDb.getByWorkspace(workspaceId);

      // Filter to relationships involving selected projects
      const projectIdSet = new Set(projectIds);
      const relevantRelationships = allRelationships.filter(
        (rel) => projectIdSet.has(rel.source_project_id) || projectIdSet.has(rel.target_project_id)
      );

      // Build a map of project IDs to names
      const projectNameMap = new Map<string, string>();
      for (const p of projects) {
        projectNameMap.set(p.id, p.name);
      }
      // Also get names for projects outside our selection that are in relationships
      const allProjectIds = new Set<string>();
      relevantRelationships.forEach((rel) => {
        allProjectIds.add(rel.source_project_id);
        allProjectIds.add(rel.target_project_id);
      });
      for (const pid of allProjectIds) {
        if (!projectNameMap.has(pid)) {
          const proj = serverProjectDb.getById(pid);
          if (proj) {
            projectNameMap.set(pid, proj.name);
          }
        }
      }

      // Transform relationships
      const architectureRelationships: CrossTaskArchitectureRelationship[] = relevantRelationships.map((rel) => ({
        sourceProjectId: rel.source_project_id,
        sourceProjectName: projectNameMap.get(rel.source_project_id) || rel.source_project_id,
        targetProjectId: rel.target_project_id,
        targetProjectName: projectNameMap.get(rel.target_project_id) || rel.target_project_id,
        integrationType: rel.integration_type as CrossTaskArchitectureRelationship['integrationType'],
        label: rel.label || '',
        protocol: rel.protocol || null,
        dataFlow: rel.data_flow || null,
      }));

      // Get latest completed analysis for patterns and narrative
      const latestAnalysis = architectureAnalysisDb.getLatestCompleted('workspace', workspaceId);
      let patterns: CrossTaskArchitectureContext['patterns'] = [];
      let narrative: string | null = null;

      if (latestAnalysis) {
        narrative = latestAnalysis.ai_analysis || null;
        if (latestAnalysis.detected_patterns) {
          try {
            const parsedPatterns = JSON.parse(latestAnalysis.detected_patterns);
            patterns = parsedPatterns.map((p: { name: string; description: string; projects_involved?: string[] }) => ({
              name: p.name,
              description: p.description,
              projectsInvolved: p.projects_involved || [],
            }));
          } catch {
            // Ignore parse errors
          }
        }
      }

      if (architectureRelationships.length > 0 || patterns.length > 0 || narrative) {
        architectureContext = {
          relationships: architectureRelationships,
          patterns,
          narrative,
        };
      }
    } catch (err) {
      console.error('Error loading architecture data:', err);
      // Continue without architecture context
    }

    // Build the prompt
    const promptContent = buildCrossTaskPrompt({
      planId,
      workspaceId,
      requirement,
      projects: projectContexts,
      architecture: architectureContext,
      callbackUrl,
    });

    // Create the plan record
    const plan = crossTaskPlanDb.create({
      id: planId,
      workspace_id: workspaceId,
      project_ids: projectIds,
      requirement,
    });

    // Save the prompt used
    crossTaskPlanDb.updatePrompt(planId, promptContent);

    return NextResponse.json({
      success: true,
      planId,
      promptContent,
      callbackUrl,
    });
  } catch (error) {
    console.error('Error creating cross-task plan:', error);
    return NextResponse.json(
      { error: 'Failed to create cross-task plan' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search');

    let plans;
    if (search) {
      plans = crossTaskPlanDb.search(workspaceId, search, limit);
    } else {
      plans = crossTaskPlanDb.getByWorkspace(workspaceId, limit);
    }

    // Parse project_ids JSON for each plan
    const parsedPlans = plans.map((plan) => ({
      ...plan,
      project_ids: JSON.parse(plan.project_ids),
    }));

    // Also get counts by status
    const counts = crossTaskPlanDb.getCountByStatus(workspaceId);

    return NextResponse.json({
      success: true,
      plans: parsedPlans,
      counts,
    });
  } catch (error) {
    console.error('Error fetching cross-task plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-task plans' },
      { status: 500 }
    );
  }
}
