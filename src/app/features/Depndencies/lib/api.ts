import { Scan, ScanData } from './types';

/**
 * Fetch all dependency scans
 */
export async function fetchScans(): Promise<Scan[]> {
  const response = await fetch('/api/dependencies/scans');
  const data = await response.json();
  return data.scans || [];
}

/**
 * Fetch scan data with stats
 */
export async function fetchScanData(scanId: string): Promise<ScanData> {
  const [scanResponse, statsResponse] = await Promise.all([
    fetch(`/api/dependencies/${scanId}`),
    fetch(`/api/dependencies/${scanId}/graph`)
  ]);

  const scanData = await scanResponse.json();
  const statsData = await statsResponse.json();

  return {
    ...scanData,
    stats: statsData.stats
  };
}

/**
 * Run a new dependency scan
 */
export async function runDependencyScan(
  projectIds: string[],
  scanName: string
): Promise<{ scanId: string }> {
  const response = await fetch('/api/dependencies/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectIds,
      scanName: scanName || `Scan ${new Date().toLocaleString()}`
    })
  });

  if (!response.ok) {
    throw new Error('Failed to run dependency scan');
  }

  return await response.json();
}

/**
 * Create a Claude requirement file for package updates
 */
export async function createPackageUpdateRequirement(
  projectPath: string,
  projectName: string,
  packages: Array<{
    name: string;
    currentVersion: string | null;
    targetVersion: string | null;
  }>
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const requirementName = `update-packages-${Date.now()}`;

  // Build package list for the instruction
  const packageList = packages
    .map(pkg => `- ${pkg.name}${pkg.targetVersion ? ` to version ${pkg.targetVersion}` : ''}`)
    .join('\n');

  const content = `# Package Update Request

## Objective
Update the following packages in the project:

${packageList}

## Instructions

1. **Update package.json**:
   - Update each package version in package.json${packages.some(p => p.currentVersion?.startsWith('~') || p.currentVersion?.startsWith('^')) ? ' (maintain version range prefix if present)' : ''}

2. **Install dependencies**:
   - Run \`npm install\` to update packages

3. **Start the server**:
   - Run \`npm run dev\` to start the development server
   - Wait 10-15 seconds for the server to fully load
   - Check the console output for any errors

4. **Verify startup**:
   - Confirm the server started successfully
   - Check for any compilation errors or warnings
   - Verify no dependency conflicts

5. **Clean up**:
   - Stop the server (Ctrl+C or kill the process)
   - Close the terminal

## Expected Outcome
- All specified packages are updated
- Server starts without errors
- No dependency conflicts
- Terminal is properly closed

## Notes
- If any package update causes errors, document them
- Check for peer dependency warnings
- Verify package compatibility before finalizing
`;

  const response = await fetch('/api/claude-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create-requirement',
      projectPath,
      requirementName,
      content
    })
  });

  const result = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: result.error || 'Failed to create requirement'
    };
  }

  return {
    success: true,
    filePath: result.filePath
  };
}

/**
 * Batch update multiple dependencies across projects
 * This leverages the existing createPackageUpdateRequirement for each project
 */
export async function batchUpdateDependencies(
  projectPath: string,
  projectName: string,
  packages: Array<{
    name: string;
    currentVersion: string | null;
    targetVersion: string | null;
  }>
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  // Reuse the existing createPackageUpdateRequirement logic
  return createPackageUpdateRequirement(projectPath, projectName, packages);
}
