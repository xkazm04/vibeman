/**
 * Template Config Parser
 * Extracts TemplateConfig exports from TypeScript files using ts-morph AST
 */

import 'server-only';
import { Project, SyntaxKind, VariableDeclaration } from 'ts-morph';
import crypto from 'crypto';
import fs from 'fs/promises';

export interface ParsedTemplateConfig {
  exportName: string;
  templateId: string;
  templateName: string;
  description: string;
  configJson: string; // Full config as JSON string
  contentHash: string; // SHA-256 of file content
}

export interface ParseResult {
  filePath: string;
  configs: ParsedTemplateConfig[];
  error?: string;
}

/**
 * Compute SHA-256 hash of file content for change detection
 */
export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Parse a TypeScript file and extract TemplateConfig exports
 */
export async function parseTemplateConfig(filePath: string): Promise<ParseResult> {
  try {
    // Read file content for hashing
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const contentHash = computeContentHash(fileContent);

    // Create ts-morph project (no full compilation needed)
    const project = new Project({
      compilerOptions: {
        allowJs: true,
        skipLibCheck: true,
      },
      skipAddingFilesFromTsConfig: true,
    });

    const sourceFile = project.addSourceFileAtPath(filePath);
    const configs: ParsedTemplateConfig[] = [];

    // Get all exported declarations
    const exportedDeclarations = sourceFile.getExportedDeclarations();

    for (const [exportName, declarations] of exportedDeclarations) {
      // Skip default exports (they duplicate named exports)
      if (exportName === 'default') {
        continue;
      }

      for (const decl of declarations) {
        // Check if it's a variable declaration
        if (decl.getKind() === SyntaxKind.VariableDeclaration) {
          const varDecl = decl as VariableDeclaration;
          const typeNode = varDecl.getType();
          const typeText = typeNode.getText();

          // Check if type is or includes TemplateConfig
          if (typeText.includes('TemplateConfig')) {
            const initializer = varDecl.getInitializer();
            if (initializer) {
              // Extract the config object
              const configText = initializer.getText();

              // Parse to extract key fields (templateId, templateName, description)
              const templateIdMatch = configText.match(/templateId:\s*['"]([^'"]+)['"]/);
              const templateNameMatch = configText.match(/templateName:\s*['"]([^'"]+)['"]/);
              const descriptionMatch = configText.match(/description:\s*['"]([^'"]+)['"]/);

              if (templateIdMatch && templateNameMatch) {
                configs.push({
                  exportName,
                  templateId: templateIdMatch[1],
                  templateName: templateNameMatch[1],
                  description: descriptionMatch?.[1] || '',
                  configJson: configText,
                  contentHash,
                });
              }
            }
          }
        }
      }
    }

    return { filePath, configs };
  } catch (error) {
    return {
      filePath,
      configs: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse multiple template files efficiently (reuse ts-morph Project)
 */
export async function parseTemplateConfigs(filePaths: string[]): Promise<ParseResult[]> {
  const results: ParseResult[] = [];

  // Process sequentially to avoid memory issues with large projects
  for (const filePath of filePaths) {
    const result = await parseTemplateConfig(filePath);
    results.push(result);
  }

  return results;
}
