import { NextRequest, NextResponse } from 'next/server';
import { securityScanDb, securityPatchDb, securityPrDb } from '@/app/db';
import { createSecurityPr, runTests, runBuild, mergePrIfTestsPass } from '@/app/features/Depndencies/lib/prAutomation';
import { createPatchDocument } from '@/app/features/Depndencies/lib/patchGenerator';
import { withObservability } from '@/lib/observability/middleware';

/**
 * Helper to create error response
 */
function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Validate request and fetch required data
 */
function validateAndFetchData(scanId: string, projectPath: string):
  | { error: NextResponse<{ error: string }> }
  | { scan: NonNullable<ReturnType<typeof securityScanDb.getById>>; patches: ReturnType<typeof securityPatchDb.getByScanId> } {
  if (!scanId || !projectPath) {
    return { error: createErrorResponse('Missing required fields: scanId, projectPath', 400) };
  }

  const scan = securityScanDb.getById(scanId);
  if (!scan) {
    return { error: createErrorResponse('Security scan not found', 404) };
  }

  const patches = securityPatchDb.getByScanId(scanId);
  if (patches.length === 0) {
    return { error: createErrorResponse('No patches found for this scan', 404) };
  }

  return { scan, patches };
}

/**
 * Convert patches to vulnerabilities and proposals
 */
function convertPatchesToVulnerabilities(patches: any[]) {
  const vulnerabilities = patches.map((patch) => ({
    id: patch.vulnerabilityId,
    packageName: patch.packageName,
    currentVersion: patch.currentVersion,
    fixedVersion: patch.fixedVersion,
    severity: patch.severity,
    title: patch.description,
    description: patch.description
  }));

  const proposals = patches.map((patch) => ({
    vulnerabilityId: patch.vulnerabilityId,
    analysis: patch.aiAnalysis || 'No AI analysis available',
    proposal: patch.patchProposal || `Update ${patch.packageName} to ${patch.fixedVersion}`,
    minimalChanges: [
      `Update ${patch.packageName} from ${patch.currentVersion} to ${patch.fixedVersion}`,
      'Run npm install'
    ],
    riskAssessment: 'Assess risk based on changelog and breaking changes'
  }));

  return { vulnerabilities, proposals };
}

/**
 * POST /api/security/pr
 * Create a PR with security patches
 */
async function handlePost(request: NextRequest): Promise<NextResponse> {
  try {
    const { scanId, projectPath } = await request.json();

    // Validate and fetch data
    const result = validateAndFetchData(scanId, projectPath);
    if ('error' in result) {
      return result.error;
    }
    const { scan, patches } = result;

    // Convert patches to vulnerability info and proposals
    const { vulnerabilities, proposals } = convertPatchesToVulnerabilities(patches);

    // Create patch document
    const patchDocument = createPatchDocument(vulnerabilities, proposals);

    // Create PR
    const prResult = await createSecurityPr(
      projectPath,
      vulnerabilities,
      proposals,
      patchDocument
    );

    if (!prResult.success) {
      return NextResponse.json(
        { error: 'Failed to create PR', details: prResult.error },
        { status: 500 }
      );
    }

    // Create PR record
    const prId = `sec-pr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const pr = securityPrDb.create({
      id: prId,
      scanId,
      projectId: scan.projectId,
      prNumber: prResult.prNumber || null,
      prUrl: prResult.prUrl || null,
      branchName: prResult.branchName,
      commitSha: prResult.commitSha || null,
      testStatus: 'pending',
      testOutput: null,
      mergeStatus: 'pending',
      mergeError: null
    });

    // Update scan status
    securityScanDb.updateStatus(scanId, 'pr_created');

    // Run tests asynchronously
    (async () => {
      try {
        // Update test status
        securityPrDb.updateTestStatus(prId, 'running');
        securityScanDb.updateStatus(scanId, 'tests_running');

        // Run tests
        const testResult = await runTests(projectPath);

        // Run build
        const buildResult = await runBuild(projectPath);

        const allPassed = testResult.success && buildResult.success;

        // Update test status
        securityPrDb.updateTestStatus(
          prId,
          allPassed ? 'passed' : 'failed',
          {
            testResult,
            buildResult
          }
        );

        securityScanDb.updateStatus(scanId, allPassed ? 'tests_passed' : 'tests_failed');

        // Auto-merge if tests passed
        if (allPassed && prResult.prNumber) {
          const mergeResult = await mergePrIfTestsPass(projectPath, prResult.prNumber);

          if (mergeResult.success) {
            securityPrDb.updateMergeStatus(prId, 'merged');
            securityScanDb.updateStatus(scanId, 'merged');

            // Mark all patches as applied
            patches.forEach((patch) => {
              securityPatchDb.markApplied(patch.id);
            });
          } else {
            securityPrDb.updateMergeStatus(prId, 'rejected', mergeResult.error);
          }
        }
      } catch (error) {
        securityPrDb.updateTestStatus(prId, 'failed', {
          error: error instanceof Error ? error.message : String(error)
        });
        securityScanDb.updateStatus(scanId, 'failed');
      }
    })();

    return NextResponse.json({
      success: true,
      prId,
      pr: {
        id: pr.id,
        prNumber: pr.prNumber,
        prUrl: pr.prUrl,
        branchName: pr.branchName,
        testStatus: pr.testStatus,
        mergeStatus: pr.mergeStatus
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create security PR',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/security/pr');
