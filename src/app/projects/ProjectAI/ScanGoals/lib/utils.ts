/**
 * Utility functions for goals generation
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Helper function to read AI docs if available
 */
export async function readAIDocs(projectPath: string): Promise<string | null> {
  try {
    const aiDocsPath = join(projectPath, 'context', 'high.md');
    const aiDocsContent = await readFile(aiDocsPath, 'utf-8');
    return aiDocsContent;
  } catch (error) {
    console.log('AI docs not found at context/high.md, proceeding without them');
    return null;
  }
}

/**
 * Read the project goals template from disk
 * Tries multiple possible paths
 */
export async function readProjectGoalsTemplate(): Promise<string | null> {
  const possiblePaths = [
    join(process.cwd(), 'vibeman', 'src', 'app', 'projects', 'templates', 'project-goals.md'),
    join(process.cwd(), 'src', 'app', 'projects', 'templates', 'project-goals.md'),
    join(__dirname, '..', '..', 'templates', 'project-goals.md'),
    join(__dirname, '..', '..', '..', 'templates', 'project-goals.md')
  ];

  for (const templatePath of possiblePaths) {
    try {
      console.log(`Attempting to read project-goals template from: ${templatePath}`);
      const content = await readFile(templatePath, 'utf-8');
      console.log(`Successfully read project-goals.md template (${content.length} characters)`);
      return content;
    } catch (pathError: any) {
      console.log(`Path ${templatePath} failed:`, pathError.message);
      continue;
    }
  }

  console.warn('Could not find project-goals.md in any of the expected locations');
  return null;
}
