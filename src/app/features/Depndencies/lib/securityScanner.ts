import { spawn } from 'child_process';
import { VulnerabilityInfo } from '@/app/db/models/security-patch.types';

interface VulnVia {
  source?: number | string;
  severity?: string;
  title?: string;
  url?: string;
}

interface VulnData {
  via?: Array<VulnVia | string>;
  range?: string;
  fixAvailable?: {
    version?: string;
  };
}

interface PipVuln {
  id?: string;
  severity?: string;
  description?: string;
  url?: string;
  fix_versions?: string[];
}

interface PipDependency {
  name: string;
  version: string;
  vulns?: PipVuln[];
}

interface NpmAuditMetadata {
  total?: number;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  vulnerabilities?: Record<string, number>;
}

interface NpmAuditOutput {
  metadata?: NpmAuditMetadata;
  vulnerabilities?: Record<string, VulnData>;
}

interface PipAuditOutput {
  dependencies?: PipDependency[];
}

export interface SecurityScanResult {
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  vulnerabilities: VulnerabilityInfo[];
  rawOutput: Record<string, unknown>;
}

/**
 * Helper to create VulnerabilityInfo from npm audit data
 */
function createNpmVulnerability(
  pkgName: string,
  vulnData: VulnData,
  via: VulnVia
): VulnerabilityInfo {
  return {
    id: via.source?.toString() || 'unknown',
    packageName: pkgName,
    currentVersion: vulnData.range || 'unknown',
    fixedVersion: vulnData.fixAvailable?.version || 'No fix available',
    severity: (via.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
    title: via.title || 'Security vulnerability',
    description: via.url || '',
    url: via.url
  };
}

/**
 * Helper to create VulnerabilityInfo from pip audit data
 */
function createPipVulnerability(
  dep: PipDependency,
  vuln: PipVuln
): VulnerabilityInfo {
  return {
    id: vuln.id || 'UNKNOWN',
    packageName: dep.name,
    currentVersion: dep.version,
    fixedVersion: vuln.fix_versions?.[0] || 'No fix available',
    severity: (vuln.severity?.toLowerCase() || 'medium') as 'critical' | 'high' | 'medium' | 'low',
    title: vuln.description || 'Security vulnerability',
    description: vuln.description || '',
    url: vuln.url
  };
}

/**
 * Helper to execute a command and collect output
 */
interface SpawnResult {
  stdout: string;
  stderr: string;
}

function executeCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd, shell: true });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', () => {
      resolve({ stdout, stderr });
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Run npm audit on a project
 */
export async function runNpmAudit(projectPath: string): Promise<SecurityScanResult> {
  try {
    const { stdout } = await executeCommand('npm', ['audit', '--json'], projectPath);

    // npm audit returns non-zero exit code when vulnerabilities are found
    // This is expected behavior, so we don't reject on non-zero codes
    const auditData: NpmAuditOutput = JSON.parse(stdout);

    const vulnerabilities: VulnerabilityInfo[] = [];

    // Extract vulnerability details from npm audit v2 format
    if (auditData.vulnerabilities) {
      Object.entries(auditData.vulnerabilities).forEach(([pkgName, vulnData]) => {
        if (vulnData.via && Array.isArray(vulnData.via)) {
          vulnData.via.forEach((via) => {
            if (typeof via === 'object' && via.source) {
              vulnerabilities.push(createNpmVulnerability(pkgName, vulnData, via));
            }
          });
        }
      });
    }

    return {
      totalVulnerabilities: auditData.metadata?.total || 0,
      criticalCount: auditData.metadata?.critical || 0,
      highCount: auditData.metadata?.high || 0,
      mediumCount: auditData.metadata?.medium || 0,
      lowCount: auditData.metadata?.low || 0,
      vulnerabilities,
      rawOutput: auditData as Record<string, unknown>
    };
  } catch (parseError) {
    throw new Error(`Failed to parse npm audit output: ${parseError}`);
  }
}

/**
 * Run pip-audit on a Python project
 */
export async function runPipAudit(projectPath: string): Promise<SecurityScanResult> {
  try {
    const { stdout } = await executeCommand('pip-audit', ['--format', 'json'], projectPath);

    const auditData: PipAuditOutput = JSON.parse(stdout);

    const vulnerabilities: VulnerabilityInfo[] = [];
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    // Extract vulnerability details from pip-audit format
    if (auditData.dependencies) {
      auditData.dependencies.forEach((dep) => {
        dep.vulns?.forEach((vuln) => {
          const severity = (vuln.severity?.toLowerCase() || 'medium') as 'critical' | 'high' | 'medium' | 'low';

          if (severity === 'critical') criticalCount++;
          else if (severity === 'high') highCount++;
          else if (severity === 'medium') mediumCount++;
          else if (severity === 'low') lowCount++;

          vulnerabilities.push(createPipVulnerability(dep, vuln));
        });
      });
    }

    return {
      totalVulnerabilities: vulnerabilities.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      vulnerabilities,
      rawOutput: auditData as Record<string, unknown>
    };
  } catch (parseError) {
    throw new Error(`pip-audit not found or failed to run: ${parseError}`);
  }
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
