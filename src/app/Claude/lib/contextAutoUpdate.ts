import * as fs from 'fs';
import * as path from 'path';
import { contextDb, DbContext } from '@/lib/database';
import { contextQueries } from '@/lib/queries/contextQueries';
import { llmManager } from '@/lib/llm/llm-manager';
import { SupportedProvider } from '@/lib/llm/types';

export interface FileChange {
  path: string;
  status: 'created' | 'modified' | 'deleted';
  relativePath: string;
}

export interface ContextUpdateResult {
  success: boolean;
  contextId?: string;
  action: 'created' | 'updated' | 'none';
  message?: string;
  error?: string;
}

/**
 * Detect file changes in a project directory by comparing current state
 * with a snapshot taken before execution
 */
export async function detectFileChanges(
  projectPath: string,
  beforeSnapshot: Map<string, number> // file path -> modified time
): Promise<FileChange[]> {
  const changes: FileChange[] = [];
  const currentFiles = new Map<string, number>();

  // Recursively scan project directory
  const scanDirectory = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(projectPath, fullPath).replace(/\\/g, '/');

      // Skip node_modules, .git, .next, etc.
      if (
        relativePath.includes('node_modules') ||
        relativePath.includes('.git') ||
        relativePath.includes('.next') ||
        relativePath.includes('dist') ||
        relativePath.includes('build')
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        try {
          scanDirectory(fullPath);
        } catch (error) {
          // Skip directories we can't access
          continue;
        }
      } else if (entry.isFile()) {
        // Only track source code files
        const ext = path.extname(entry.name).toLowerCase();
        if (
          ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.md', '.json', '.py'].includes(ext)
        ) {
          const stats = fs.statSync(fullPath);
          currentFiles.set(relativePath, stats.mtimeMs);
        }
      }
    }
  };

  try {
    scanDirectory(projectPath);
  } catch (error) {
    console.error('Error scanning directory:', error);
    return [];
  }

  // Detect created and modified files
  for (const [filePath, modTime] of currentFiles.entries()) {
    const beforeModTime = beforeSnapshot.get(filePath);

    if (!beforeModTime) {
      // File didn't exist before - created
      changes.push({
        path: path.join(projectPath, filePath),
        status: 'created',
        relativePath: filePath,
      });
    } else if (modTime > beforeModTime) {
      // File was modified
      changes.push({
        path: path.join(projectPath, filePath),
        status: 'modified',
        relativePath: filePath,
      });
    }
  }

  // Detect deleted files
  for (const [filePath] of beforeSnapshot.entries()) {
    if (!currentFiles.has(filePath)) {
      changes.push({
        path: path.join(projectPath, filePath),
        status: 'deleted',
        relativePath: filePath,
      });
    }
  }

  return changes;
}

/**
 * Create a snapshot of file modification times in a project
 */
export function createProjectSnapshot(projectPath: string): Map<string, number> {
  const snapshot = new Map<string, number>();

  const scanDirectory = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectPath, fullPath).replace(/\\/g, '/');

        // Skip ignored directories
        if (
          relativePath.includes('node_modules') ||
          relativePath.includes('.git') ||
          relativePath.includes('.next') ||
          relativePath.includes('dist') ||
          relativePath.includes('build')
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          try {
            scanDirectory(fullPath);
          } catch {
            continue;
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (
            ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.md', '.json', '.py'].includes(ext)
          ) {
            const stats = fs.statSync(fullPath);
            snapshot.set(relativePath, stats.mtimeMs);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't access
    }
  };

  scanDirectory(projectPath);
  return snapshot;
}

/**
 * Determine if file changes represent a new feature or updates to existing feature
 */
export async function analyzeChanges(
  changes: FileChange[],
  projectId: string,
  projectPath: string
): Promise<{
  isNewFeature: boolean;
  affectedContexts: DbContext[];
  newFeatureName?: string;
  newFeatureFiles?: string[];
}> {
  // Get all contexts for the project
  const allContexts = contextDb.getContextsByProject(projectId);

  const createdFiles = changes.filter((c) => c.status === 'created').map((c) => c.relativePath);
  const deletedFiles = changes.filter((c) => c.status === 'deleted').map((c) => c.relativePath);
  const modifiedFiles = changes
    .filter((c) => c.status === 'modified')
    .map((c) => c.relativePath);

  // Find contexts that contain the changed files
  const affectedContexts: DbContext[] = [];

  for (const context of allContexts) {
    try {
      const contextFilePaths = JSON.parse(context.file_paths) as string[];
      const normalizedContextPaths = contextFilePaths.map((fp) =>
        fp.replace(/\\/g, '/').toLowerCase()
      );

      const hasAffectedFile = [...createdFiles, ...deletedFiles, ...modifiedFiles].some((cf) =>
        normalizedContextPaths.some((cp) => cp === cf.toLowerCase() || cf.toLowerCase().includes(cp))
      );

      if (hasAffectedFile) {
        affectedContexts.push(context);
      }
    } catch (error) {
      console.error(`Failed to parse file paths for context ${context.id}:`, error);
    }
  }

  // Heuristic: if there are created files and no affected contexts, it's likely a new feature
  const isNewFeature = createdFiles.length > 0 && affectedContexts.length === 0;

  // If new feature, try to infer feature name from file paths
  let newFeatureName: string | undefined;
  let newFeatureFiles: string[] | undefined;

  if (isNewFeature && createdFiles.length > 0) {
    // Try to extract feature name from file paths
    // Pattern: app/features/<feature-name>/ or src/features/<feature-name>/
    const featureMatch = createdFiles[0].match(/(?:app|src)\/features\/([^\/]+)/);
    if (featureMatch) {
      newFeatureName = featureMatch[1];
      // Collect all files in this feature directory
      newFeatureFiles = createdFiles.filter((f) => f.includes(`/features/${newFeatureName}/`));
    } else {
      // Fallback: use parent directory name
      const dirPath = path.dirname(createdFiles[0]);
      newFeatureName = path.basename(dirPath);
      newFeatureFiles = createdFiles;
    }
  }

  return {
    isNewFeature,
    affectedContexts,
    newFeatureName,
    newFeatureFiles,
  };
}

/**
 * Generate a context description using LLM based on file contents
 */
export async function generateContextDescription(
  contextName: string,
  filePaths: string[],
  projectPath: string,
  provider: SupportedProvider = 'ollama'
): Promise<string> {
  try {
    // Load file contents (limit to 500 chars per file)
    const fileContents: Array<{ path: string; content: string }> = [];

    for (const filePath of filePaths.slice(0, 10)) {
      // Max 10 files
      try {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          fileContents.push({
            path: filePath,
            content: content.substring(0, 500),
          });
        }
      } catch {
        // Skip files we can't read
      }
    }

    if (fileContents.length === 0) {
      return `Context for ${contextName}`;
    }

    // Build prompt for LLM
    const systemPrompt = `You are a technical documentation expert. Generate a concise 1-2 sentence description of what this code context represents based on the provided files.`;

    let userPrompt = `Context name: ${contextName}\n\nFiles:\n\n`;
    for (const file of fileContents) {
      userPrompt += `**${file.path}**\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
    }
    userPrompt += `Generate a concise description (1-2 sentences) of what this context represents.`;

    const response = await llmManager.generate({
      prompt: userPrompt,
      systemPrompt,
      provider,
      maxTokens: 2000,
      temperature: 0.5,
      taskType: 'context-auto-update',
      taskDescription: 'Generate context description for auto-update',
    });

    if (response.success && response.response) {
      return response.response.trim();
    }

    return `Context for ${contextName}`;
  } catch (error) {
    console.error('Failed to generate context description:', error);
    return `Context for ${contextName}`;
  }
}

/**
 * Main function: Auto-update or create contexts based on file changes
 */
export async function autoUpdateContexts(
  projectId: string,
  projectPath: string,
  beforeSnapshot: Map<string, number>,
  provider: SupportedProvider = 'ollama'
): Promise<ContextUpdateResult[]> {
  const results: ContextUpdateResult[] = [];

  try {
    // 1. Detect file changes
    const changes = await detectFileChanges(projectPath, beforeSnapshot);

    if (changes.length === 0) {
      return [
        {
          success: true,
          action: 'none',
          message: 'No file changes detected',
        },
      ];
    }

    console.log(`Detected ${changes.length} file changes`);

    // 2. Analyze changes to determine if new feature or existing feature update
    const analysis = await analyzeChanges(changes, projectId, projectPath);

    // 3. Handle new feature creation
    if (analysis.isNewFeature && analysis.newFeatureName && analysis.newFeatureFiles) {
      console.log(`New feature detected: ${analysis.newFeatureName}`);

      try {
        // Generate description for new context
        const description = await generateContextDescription(
          analysis.newFeatureName,
          analysis.newFeatureFiles,
          projectPath,
          provider
        );

        // Create new context
        const newContext = await contextQueries.createContext({
          projectId,
          groupId: null, // No group by default
          name: analysis.newFeatureName,
          description,
          filePaths: analysis.newFeatureFiles,
        });

        results.push({
          success: true,
          contextId: newContext.id,
          action: 'created',
          message: `Created new context "${analysis.newFeatureName}" with ${analysis.newFeatureFiles.length} files`,
        });
      } catch (error) {
        results.push({
          success: false,
          action: 'created',
          error: error instanceof Error ? error.message : 'Failed to create context',
        });
      }
    }

    // 4. Handle updates to existing contexts
    if (analysis.affectedContexts.length > 0) {
      console.log(`Found ${analysis.affectedContexts.length} affected contexts`);

      for (const context of analysis.affectedContexts) {
        try {
          const contextFilePaths = JSON.parse(context.file_paths) as string[];
          const normalizedContextPaths = contextFilePaths.map((fp) => fp.replace(/\\/g, '/'));

          // Remove deleted files
          const deletedRelativePaths = changes
            .filter((c) => c.status === 'deleted')
            .map((c) => c.relativePath);
          let updatedFilePaths = normalizedContextPaths.filter(
            (fp) =>
              !deletedRelativePaths.some((dp) => fp.toLowerCase() === dp.toLowerCase())
          );

          // Add created files that are in the same directory structure
          const createdRelativePaths = changes
            .filter((c) => c.status === 'created')
            .map((c) => c.relativePath);

          // Only add created files if they're in similar directory to existing context files
          for (const createdPath of createdRelativePaths) {
            const createdDir = path.dirname(createdPath);
            const isRelevant = updatedFilePaths.some((fp) => {
              const fpDir = path.dirname(fp);
              return fpDir === createdDir || createdDir.startsWith(fpDir);
            });

            if (isRelevant && !updatedFilePaths.includes(createdPath)) {
              updatedFilePaths.push(createdPath);
            }
          }

          // Check if file list changed
          const fileListChanged =
            updatedFilePaths.length !== contextFilePaths.length ||
            updatedFilePaths.some((fp) => !contextFilePaths.includes(fp));

          if (fileListChanged) {
            // Regenerate description
            const newDescription = await generateContextDescription(
              context.name,
              updatedFilePaths,
              projectPath,
              provider
            );

            // Update context
            const updatedContext = await contextQueries.updateContext(context.id, {
              file_paths: updatedFilePaths,
              description: newDescription,
            });

            if (updatedContext) {
              results.push({
                success: true,
                contextId: context.id,
                action: 'updated',
                message: `Updated context "${context.name}" (${updatedFilePaths.length} files)`,
              });
            }
          } else {
            results.push({
              success: true,
              contextId: context.id,
              action: 'none',
              message: `Context "${context.name}" unchanged`,
            });
          }
        } catch (error) {
          results.push({
            success: false,
            contextId: context.id,
            action: 'updated',
            error: error instanceof Error ? error.message : 'Failed to update context',
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error in autoUpdateContexts:', error);
    return [
      {
        success: false,
        action: 'none',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    ];
  }
}
