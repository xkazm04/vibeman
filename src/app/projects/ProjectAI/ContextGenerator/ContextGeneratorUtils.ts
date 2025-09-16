import { readFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function readTemplate(templateName: string): Promise<string> {
  try {
    // Try multiple possible paths
    const possiblePaths = [
      join(process.cwd(), 'src', 'app', 'coder', 'Context', 'templates', templateName),
      join(process.cwd(), 'vibeman', 'src', 'app', 'coder', 'Context', 'templates', templateName),
      join(__dirname, '..', '..', 'coder', 'Context', 'templates', templateName),
      join(__dirname, '..', '..', '..', 'coder', 'Context', 'templates', templateName)
    ];

    for (const templatePath of possiblePaths) {
      try {
        console.log(`Attempting to read template from: ${templatePath}`);
        const content = await readFile(templatePath, 'utf-8');
        console.log(`Successfully read ${templateName} template (${content.length} characters)`);
        return content;
      } catch (pathError) {
        console.log(`Path ${templatePath} failed:`, pathError instanceof Error ? pathError.message : 'Unknown error');
        continue;
      }
    }

    throw new Error(`Could not find ${templateName} in any of the expected locations`);
  } catch (error) {
    console.warn(`Could not read ${templateName} template:`, error);
    return '';
  }
}

export async function readExistingContexts(projectPath: string): Promise<Array<{ filename: string; content: string }>> {
  const existingContexts: Array<{ filename: string; content: string }> = [];
  const contextDir = join(projectPath, 'context');

  try {
    if (!existsSync(contextDir)) {
      console.log('Context directory does not exist, will create it');
      return existingContexts;
    }

    const files = await readdir(contextDir);
    const contextFiles = files.filter(file => file.endsWith('_context.md'));

    console.log(`Found ${contextFiles.length} existing context files:`, contextFiles);

    for (const file of contextFiles) {
      try {
        const filePath = join(contextDir, file);
        const content = await readFile(filePath, 'utf-8');
        existingContexts.push({ filename: file, content });
        console.log(`Read existing context file: ${file} (${content.length} characters)`);
      } catch (error) {
        console.warn(`Failed to read context file ${file}:`, error);
      }
    }
  } catch (error) {
    console.warn('Failed to read context directory:', error);
  }

  return existingContexts;
}

export async function ensureContextDirectory(projectPath: string): Promise<string> {
  const contextDir = join(projectPath, 'context');
  if (!existsSync(contextDir)) {
    console.log('Creating context directory...');
    await mkdir(contextDir, { recursive: true });
  }
  return contextDir;
}