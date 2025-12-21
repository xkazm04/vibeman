/**
 * Bridge API - Generate Ideas
 * POST: Trigger idea generation with parameters
 */

import { NextRequest } from 'next/server';
import { requireBridgeAuth, bridgeSuccessResponse, bridgeErrorResponse } from '@/lib/bridge';
import { GenerateIdeasRequest } from '@/lib/bridge/types';
import { executeClaudeIdeasWithContexts } from '@/app/features/Ideas/sub_IdeasSetup/lib/claudeIdeasExecutor';
import { projectServiceDb } from '@/lib/projectServiceDb';
import { SCAN_TYPE_CONFIGS, ScanType } from '@/app/features/Ideas/lib/scanTypes';

export async function POST(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  try {
    const body: GenerateIdeasRequest = await request.json();
    const { projectId, scanTypes, contextIds } = body;

    if (!projectId) {
      return bridgeErrorResponse('projectId is required', 400);
    }

    if (!scanTypes || !Array.isArray(scanTypes) || scanTypes.length === 0) {
      return bridgeErrorResponse('scanTypes array is required', 400);
    }

    // Get project info
    const project = await projectServiceDb.getProject(projectId);
    if (!project) {
      return bridgeErrorResponse('Project not found', 404);
    }

    // Validate scan types and convert to ScanType values
    const validScanTypes: ScanType[] = [];
    for (const typeId of scanTypes) {
      const scanConfig = SCAN_TYPE_CONFIGS.find(st => st.value === typeId);
      if (!scanConfig) {
        return bridgeErrorResponse(`Invalid scan type: ${typeId}. Valid types: ${SCAN_TYPE_CONFIGS.map(st => st.value).join(', ')}`, 400);
      }
      validScanTypes.push(scanConfig.value);
    }

    // Execute idea generation
    const result = await executeClaudeIdeasWithContexts({
      projectId,
      projectName: project.name,
      projectPath: project.path,
      scanTypes: validScanTypes,
      contextIds: contextIds || [],
    });

    if (!result.success) {
      return bridgeErrorResponse(`Generation failed: ${result.errors.join(', ')}`, 500);
    }

    return bridgeSuccessResponse({
      success: true,
      filesCreated: result.filesCreated,
      message: `Created ${result.filesCreated} requirement files. Use TaskRunner to execute them.`,
    });
  } catch (error) {
    console.error('[Bridge/Ideas] Generate error:', error);
    return bridgeErrorResponse('Failed to generate ideas', 500);
  }
}

/**
 * GET: List available scan types
 */
export async function GET(request: NextRequest) {
  // Auth check
  const authError = requireBridgeAuth(request);
  if (authError) return authError;

  return bridgeSuccessResponse({
    scanTypes: SCAN_TYPE_CONFIGS.map(st => ({
      id: st.value,
      name: st.label,
      description: st.description,
      category: st.category,
    })),
  });
}
