import { NextRequest, NextResponse } from 'next/server';
import { securityScanDb, securityPatchDb } from '@/app/db';
import { runSecurityScan } from '@/app/features/Depndencies/lib/securityScanner';
import { generatePatchProposals } from '@/app/features/Depndencies/lib/patchGenerator';

/**
 * POST /api/security/scan
 * Initiates a security scan for a project
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, projectPath, projectType } = await request.json();

    if (!projectId || !projectPath) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, projectPath' },
        { status: 400 }
      );
    }

    // Run security scan
    const scanResult = await runSecurityScan(projectPath, projectType);

    // Create security scan record
    const scanId = `sec-scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const scan = securityScanDb.create({
      id: scanId,
      projectId,
      scanDate: new Date(),
      totalVulnerabilities: scanResult.totalVulnerabilities,
      criticalCount: scanResult.criticalCount,
      highCount: scanResult.highCount,
      mediumCount: scanResult.mediumCount,
      lowCount: scanResult.lowCount,
      scanOutput: scanResult.rawOutput,
      status: 'analyzing'
    });

    // Generate AI patch proposals asynchronously
    (async () => {
      try {
        const proposals = await generatePatchProposals(
          scanResult.vulnerabilities,
          projectPath
        );

        // Save patch proposals to database
        scanResult.vulnerabilities.forEach((vuln, index) => {
          const proposal = proposals[index];
          if (proposal) {
            const patchId = `sec-patch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            securityPatchDb.create({
              id: patchId,
              scanId,
              projectId,
              vulnerabilityId: vuln.id,
              packageName: vuln.packageName,
              currentVersion: vuln.currentVersion,
              fixedVersion: vuln.fixedVersion,
              severity: vuln.severity,
              description: vuln.description,
              aiAnalysis: proposal.analysis,
              patchProposal: proposal.proposal,
              patchApplied: false
            });
          }
        });

        // Update scan status
        securityScanDb.updateStatus(scanId, 'patch_generated');
      } catch (error) {
        console.error('Failed to generate patch proposals:', error);
        securityScanDb.updateStatus(scanId, 'failed');
      }
    })();

    return NextResponse.json({
      success: true,
      scanId,
      scan: {
        id: scan.id,
        totalVulnerabilities: scan.totalVulnerabilities,
        criticalCount: scan.criticalCount,
        highCount: scan.highCount,
        mediumCount: scan.mediumCount,
        lowCount: scan.lowCount,
        status: scan.status
      }
    });
  } catch (error) {
    console.error('Security scan error:', error);
    return NextResponse.json(
      {
        error: 'Failed to run security scan',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/security/scan?projectId=xxx
 * Get all security scans for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    const scans = securityScanDb.getByProjectId(projectId);

    return NextResponse.json({ scans });
  } catch (error) {
    console.error('Failed to fetch security scans:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch security scans',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
