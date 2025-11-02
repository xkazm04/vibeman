import { spawn } from 'child_process';
import { VulnerabilityInfo } from '@/app/db/models/security-patch.types';

export interface SecurityScanResult {
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  vulnerabilities: VulnerabilityInfo[];
  rawOutput: any;
}

/**
 * Run npm audit on a project
 */
export async function runNpmAudit(projectPath: string): Promise<SecurityScanResult> {
  return new Promise((resolve, reject) => {
    const npmAudit = spawn('npm', ['audit', '--json'], {
      cwd: projectPath,
      shell: true
    });

    let stdout = '';
    let stderr = '';

    npmAudit.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    npmAudit.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    npmAudit.on('close', (code) => {
      try {
        // npm audit returns non-zero exit code when vulnerabilities are found
        // This is expected behavior, so we don't reject on non-zero codes
        const auditData = JSON.parse(stdout);

        const vulnerabilities: VulnerabilityInfo[] = [];
        const metadata = auditData.metadata?.vulnerabilities || {};

        // Extract vulnerability details from npm audit v2 format
        if (auditData.vulnerabilities) {
          Object.entries(auditData.vulnerabilities).forEach(([pkgName, vulnData]: [string, any]) => {
            if (vulnData.via && Array.isArray(vulnData.via)) {
              vulnData.via.forEach((via: any) => {
                if (typeof via === 'object' && via.source) {
                  vulnerabilities.push({
                    id: via.source.toString(),
                    packageName: pkgName,
                    currentVersion: vulnData.range || 'unknown',
                    fixedVersion: vulnData.fixAvailable?.version || 'No fix available',
                    severity: (via.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
                    title: via.title || 'Security vulnerability',
                    description: via.url || '',
                    url: via.url
                  });
                }
              });
            }
          });
        }

        resolve({
          totalVulnerabilities: metadata.total || 0,
          criticalCount: metadata.critical || 0,
          highCount: metadata.high || 0,
          mediumCount: metadata.medium || 0,
          lowCount: metadata.low || 0,
          vulnerabilities,
          rawOutput: auditData
        });
      } catch (parseError) {
        reject(new Error(`Failed to parse npm audit output: ${parseError}`));
      }
    });

    npmAudit.on('error', (error) => {
      reject(new Error(`Failed to run npm audit: ${error.message}`));
    });
  });
}

/**
 * Run pip-audit on a Python project
 */
export async function runPipAudit(projectPath: string): Promise<SecurityScanResult> {
  return new Promise((resolve, reject) => {
    const pipAudit = spawn('pip-audit', ['--format', 'json'], {
      cwd: projectPath,
      shell: true
    });

    let stdout = '';
    let stderr = '';

    pipAudit.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pipAudit.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pipAudit.on('close', (code) => {
      try {
        const auditData = JSON.parse(stdout);

        const vulnerabilities: VulnerabilityInfo[] = [];
        let criticalCount = 0;
        let highCount = 0;
        let mediumCount = 0;
        let lowCount = 0;

        // Extract vulnerability details from pip-audit format
        if (auditData.dependencies) {
          auditData.dependencies.forEach((dep: any) => {
            dep.vulns?.forEach((vuln: any) => {
              const severity = (vuln.severity?.toLowerCase() || 'medium') as 'critical' | 'high' | 'medium' | 'low';

              if (severity === 'critical') criticalCount++;
              else if (severity === 'high') highCount++;
              else if (severity === 'medium') mediumCount++;
              else if (severity === 'low') lowCount++;

              vulnerabilities.push({
                id: vuln.id || 'UNKNOWN',
                packageName: dep.name,
                currentVersion: dep.version,
                fixedVersion: vuln.fix_versions?.[0] || 'No fix available',
                severity,
                title: vuln.description || 'Security vulnerability',
                description: vuln.description || '',
                url: vuln.url
              });
            });
          });
        }

        resolve({
          totalVulnerabilities: vulnerabilities.length,
          criticalCount,
          highCount,
          mediumCount,
          lowCount,
          vulnerabilities,
          rawOutput: auditData
        });
      } catch (parseError) {
        reject(new Error(`Failed to parse pip-audit output: ${parseError}`));
      }
    });

    pipAudit.on('error', (error) => {
      reject(new Error(`pip-audit not found or failed to run: ${error.message}`));
    });
  });
}

/**
 * Detect project type and run appropriate security scan
 */
export async function runSecurityScan(
  projectPath: string,
  projectType?: 'nextjs' | 'fastapi' | 'other'
): Promise<SecurityScanResult> {
  // Determine project type if not provided
  if (!projectType) {
    const fs = require('fs');
    const path = require('path');

    const hasPackageJson = fs.existsSync(path.join(projectPath, 'package.json'));
    const hasRequirementsTxt = fs.existsSync(path.join(projectPath, 'requirements.txt'));

    if (hasPackageJson) {
      projectType = 'nextjs';
    } else if (hasRequirementsTxt) {
      projectType = 'fastapi';
    } else {
      projectType = 'other';
    }
  }

  // Run appropriate scan based on project type
  if (projectType === 'nextjs' || projectType === 'other') {
    return runNpmAudit(projectPath);
  } else if (projectType === 'fastapi') {
    return runPipAudit(projectPath);
  } else {
    throw new Error(`Unsupported project type: ${projectType}`);
  }
}
