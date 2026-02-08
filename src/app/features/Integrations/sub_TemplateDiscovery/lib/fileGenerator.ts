/**
 * File Generator - Stub for backward compatibility
 */

export interface FileGeneratorOptions {
  templateId: string;
  variables: Record<string, unknown>;
  outputPath?: string;
}

export function generateFiles(options: FileGeneratorOptions): Promise<string[]> {
  console.warn('fileGenerator.generateFiles is a stub and needs implementation');
  return Promise.resolve([]);
}
