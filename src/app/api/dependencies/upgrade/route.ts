import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface UpgradePackage {
  name: string;
  currentVersion: string;
  targetVersion: string;
  isDev: boolean;
}

interface UpgradeRequest {
  projectPath: string;
  packages: UpgradePackage[];
}

export async function POST(request: NextRequest) {
  let projectPath = '';

  try {
    const body: UpgradeRequest = await request.json();
    projectPath = body.projectPath;
    const { packages } = body;

    if (!projectPath || !packages || packages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: projectPath and packages' },
        { status: 400 }
      );
    }

    // Validate project path exists
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJsonExists = await fs.access(packageJsonPath)
      .then(() => true)
      .catch(() => false);

    if (!packageJsonExists) {
      return NextResponse.json(
        { error: 'package.json not found at specified path' },
        { status: 404 }
      );
    }

    // Read current package.json
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    let packageJson: Record<string, unknown>;

    try {
      packageJson = JSON.parse(packageJsonContent);
    } catch {
      return NextResponse.json(
        { error: 'Invalid package.json format' },
        { status: 400 }
      );
    }

    // Create backup
    const backupPath = path.join(projectPath, 'package.json.backup');
    await fs.writeFile(backupPath, packageJsonContent);

    // Update versions
    const updatedPackages: string[] = [];
    const dependencies = packageJson.dependencies as Record<string, string> | undefined;
    const devDependencies = packageJson.devDependencies as Record<string, string> | undefined;

    packages.forEach(pkg => {
      // Check dependencies first
      if (dependencies?.[pkg.name]) {
        // Preserve version prefix (^, ~, etc.)
        const currentVersion = dependencies[pkg.name];
        const prefix = currentVersion.match(/^[\^~>=<]*/)?.[0] || '^';
        dependencies[pkg.name] = `${prefix}${pkg.targetVersion}`;
        updatedPackages.push(`${pkg.name}@${pkg.targetVersion}`);
      }
      // Check devDependencies
      else if (devDependencies?.[pkg.name]) {
        const currentVersion = devDependencies[pkg.name];
        const prefix = currentVersion.match(/^[\^~>=<]*/)?.[0] || '^';
        devDependencies[pkg.name] = `${prefix}${pkg.targetVersion}`;
        updatedPackages.push(`${pkg.name}@${pkg.targetVersion}`);
      }
    });

    if (updatedPackages.length === 0) {
      // Clean up backup since no changes were made
      await fs.unlink(backupPath).catch(() => {});
      return NextResponse.json(
        { error: 'No matching packages found in dependencies or devDependencies' },
        { status: 400 }
      );
    }

    // Write updated package.json
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n'
    );

    // Run npm install with timeout
    let npmOutput = '';
    let npmWarnings: string | null = null;

    try {
      const { stdout, stderr } = await execAsync('npm install', {
        cwd: projectPath,
        timeout: 120000, // 2 minute timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
      });
      npmOutput = stdout;
      npmWarnings = stderr || null;
    } catch (npmError) {
      // Restore backup on npm install failure
      const backup = await fs.readFile(backupPath, 'utf-8');
      await fs.writeFile(packageJsonPath, backup);
      await fs.unlink(backupPath).catch(() => {});

      const errorMessage = npmError instanceof Error ? npmError.message : 'npm install failed';
      return NextResponse.json(
        {
          error: `npm install failed: ${errorMessage}`,
          restored: true
        },
        { status: 500 }
      );
    }

    // Remove backup on success
    await fs.unlink(backupPath).catch(() => {});

    return NextResponse.json({
      success: true,
      updatedPackages,
      npmOutput,
      npmWarnings
    });

  } catch (error) {
    // Attempt to restore backup if exists
    if (projectPath) {
      const backupPath = path.join(projectPath, 'package.json.backup');
      const packageJsonPath = path.join(projectPath, 'package.json');
      try {
        const backup = await fs.readFile(backupPath, 'utf-8');
        await fs.writeFile(packageJsonPath, backup);
        await fs.unlink(backupPath);
      } catch {
        // Backup restore failed or didn't exist
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upgrade failed',
        restored: true
      },
      { status: 500 }
    );
  }
}
