export interface PackageUpgrade {
  name: string;
  currentVersion: string;
  targetVersion: string;
  isDev: boolean;
}

export interface UpgradeResult {
  success: boolean;
  updatedPackages?: string[];
  npmOutput?: string;
  npmWarnings?: string | null;
  error?: string;
  restored?: boolean;
}

/**
 * Upgrade packages directly by modifying package.json and running npm install
 */
export async function upgradePackages(
  projectPath: string,
  packages: PackageUpgrade[]
): Promise<UpgradeResult> {
  const response = await fetch('/api/dependencies/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath, packages })
  });

  return response.json();
}

/**
 * Upgrade packages with progress callbacks for better UX
 */
export async function upgradePackagesWithProgress(
  projectPath: string,
  packages: PackageUpgrade[],
  onProgress: (message: string, percent: number) => void
): Promise<UpgradeResult> {
  onProgress('Reading package.json...', 10);

  await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for UX
  onProgress('Updating package versions...', 30);

  const response = await fetch('/api/dependencies/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath, packages })
  });

  onProgress('Running npm install...', 60);

  const result = await response.json();

  if (result.success) {
    onProgress('Upgrade complete!', 100);
  } else {
    onProgress('Upgrade failed, restoring backup...', 90);
  }

  return result;
}
