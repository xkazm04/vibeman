import { NextRequest, NextResponse } from 'next/server';
import { getScanOrchestrator, initializeScanOrchestrator } from '@/lib/scan/scanOrchestrator';
import { createFileGatherer } from '@/lib/scan/fileGatherer';
import { databaseScanRepository } from '@/lib/scan/repositories/databaseScanRepository';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

/**
 * POST /api/test/scan-integration
 * 
 * Integration test for unified scan system
 * Tests the full flow from orchestrator to persistence
 * 
 * Request body:
 * {
 *   projectId?: string (generated if not provided)
 *   projectPath?: string (default: '/tmp/test-project')
 *   projectType?: string (default: 'generic')
 * }
 * 
 * Response shows:
 * - Test execution time
 * - Number of scans executed
 * - Findings discovered
 * - Database persistence verification
 * - Error details (if any)
 */

interface TestRequest {
  projectId?: string;
  projectPath?: string;
  projectType?: 'nextjs' | 'fastapi' | 'django' | 'express' | 'generic';
}

interface TestResult {
  success: boolean;
  tests: Array<{
    name: string;
    status: 'pass' | 'fail';
    duration: number;
    message: string;
    details?: Record<string, any>;
  }>;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    totalDuration: number;
  };
  error?: string;
}

async function handlePost(request: NextRequest): Promise<NextResponse<TestResult>> {
  const startTime = Date.now();
  const results: TestResult['tests'] = [];

  try {
    const body: TestRequest = await request.json();
    const projectId = body.projectId || uuidv4();
    const projectPath = body.projectPath || '/tmp/test-project';
    const projectType = body.projectType || 'generic';

    logger.info('Starting scan integration tests', { projectId });

    // Test 1: Orchestrator initialization
    let test1Start = Date.now();
    try {
      const orchestrator = getScanOrchestrator();
      if (!orchestrator) {
        const fileGatherer = createFileGatherer('http');
        initializeScanOrchestrator(fileGatherer, databaseScanRepository);
      }
      results.push({
        name: 'Orchestrator Initialization',
        status: 'pass',
        duration: Date.now() - test1Start,
        message: 'Successfully initialized ScanOrchestrator'
      });
    } catch (error) {
      results.push({
        name: 'Orchestrator Initialization',
        status: 'fail',
        duration: Date.now() - test1Start,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Repository availability
    let test2Start = Date.now();
    try {
      const countBefore = await databaseScanRepository.listByProject(projectId, 1);
      results.push({
        name: 'Database Repository Access',
        status: 'pass',
        duration: Date.now() - test2Start,
        message: 'Successfully accessed database repository',
        details: {
          existingScansCount: countBefore.length
        }
      });
    } catch (error) {
      results.push({
        name: 'Database Repository Access',
        status: 'fail',
        duration: Date.now() - test2Start,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Single scan execution (structure)
    let test3Start = Date.now();
    let scanResult = null;
    try {
      const orchestrator = getScanOrchestrator();
      if (orchestrator) {
        scanResult = await orchestrator.execute({
          projectId,
          projectPath,
          projectType: projectType as any,
          scanCategory: 'structure',
          provider: 'gemini'
        });

        results.push({
          name: 'Single Scan Execution (Structure)',
          status: scanResult?.success ? 'pass' : 'fail',
          duration: Date.now() - test3Start,
          message: scanResult?.success
            ? `Successfully executed structure scan, found ${scanResult?.findings?.length || 0} findings`
            : 'Scan execution returned failure status',
          details: {
            scanId: scanResult?.scanId,
            findingsCount: scanResult?.findings?.length || 0,
            category: scanResult?.category
          }
        });
      }
    } catch (error) {
      results.push({
        name: 'Single Scan Execution (Structure)',
        status: 'fail',
        duration: Date.now() - test3Start,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 4: Persistence verification
    let test4Start = Date.now();
    try {
      if (scanResult) {
        await databaseScanRepository.save(scanResult);
        const retrieved = await databaseScanRepository.getById(scanResult.scanId);

        results.push({
          name: 'Result Persistence & Retrieval',
          status: retrieved ? 'pass' : 'fail',
          duration: Date.now() - test4Start,
          message: retrieved
            ? `Successfully persisted and retrieved scan result (ID: ${scanResult.scanId})`
            : 'Saved result could not be retrieved',
          details: {
            savedScanId: scanResult.scanId,
            retrievedScanId: retrieved?.scanId
          }
        });
      } else {
        results.push({
          name: 'Result Persistence & Retrieval',
          status: 'fail',
          duration: Date.now() - test4Start,
          message: 'Skipped - no scan result to persist'
        });
      }
    } catch (error) {
      results.push({
        name: 'Result Persistence & Retrieval',
        status: 'fail',
        duration: Date.now() - test4Start,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 5: Project listing
    let test5Start = Date.now();
    try {
      const projectScans = await databaseScanRepository.listByProject(projectId, 10);
      results.push({
        name: 'Project Scan Listing',
        status: 'pass',
        duration: Date.now() - test5Start,
        message: `Successfully retrieved ${projectScans.length} scans for project`,
        details: {
          scansCount: projectScans.length,
          projectId
        }
      });
    } catch (error) {
      results.push({
        name: 'Project Scan Listing',
        status: 'fail',
        duration: Date.now() - test5Start,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 6: Parallel execution simulation
    let test6Start = Date.now();
    try {
      const orchestrator = getScanOrchestrator();
      if (orchestrator) {
        const parallelResults = await orchestrator.executeParallel([
          {
            projectId: projectId + '-1',
            projectPath,
            projectType: projectType as any,
            scanCategory: 'structure',
            provider: 'gemini'
          },
          {
            projectId: projectId + '-2',
            projectPath,
            projectType: projectType as any,
            scanCategory: 'structure',
            provider: 'gemini'
          }
        ]);

        results.push({
          name: 'Parallel Scan Execution',
          status: 'pass',
          duration: Date.now() - test6Start,
          message: `Successfully executed ${parallelResults.length} scans in parallel`,
          details: {
            scansCount: parallelResults.length,
            successCount: parallelResults.filter(r => r.success).length
          }
        });
      }
    } catch (error) {
      results.push({
        name: 'Parallel Scan Execution',
        status: 'fail',
        duration: Date.now() - test6Start,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Calculate summary
    const totalDuration = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;

    logger.info('Scan integration tests completed', {
      projectId,
      totalTests: results.length,
      passed,
      failed,
      duration: totalDuration
    });

    return NextResponse.json({
      success: failed === 0,
      tests: results,
      summary: {
        totalTests: results.length,
        passed,
        failed,
        totalDuration
      }
    });
  } catch (error) {
    logger.error('Scan integration test failed', { error });
    return NextResponse.json(
      {
        success: false,
        tests: [],
        summary: {
          totalTests: 0,
          passed: 0,
          failed: 1,
          totalDuration: Date.now() - startTime
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export const POST = handlePost;
export const maxDuration = 120; // 2 minutes for full test suite
