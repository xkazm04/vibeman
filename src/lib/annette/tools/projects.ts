/**
 * Project Tools - Implementation for Annette's project-related tool calls
 */

import { projectDb } from '@/lib/project_database';
import * as fs from 'fs';
import * as path from 'path';

export async function executeProjectTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string
): Promise<string> {
  switch (name) {
    case 'get_project_structure': {
      const depth = parseInt(String(input.depth || '3'), 10);
      const project = projectDb.getProject(projectId);

      if (!project?.path) {
        return JSON.stringify({ error: 'Project path not found' });
      }

      const structure = scanDirectory(project.path, depth);
      return JSON.stringify({
        projectPath: project.path,
        structure,
      });
    }

    case 'list_projects': {
      const projects = projectDb.getAllProjects();
      return JSON.stringify({
        total: projects.length,
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          path: p.path,
        })),
      });
    }

    case 'get_project_files': {
      const directory = input.directory as string || '';
      const project = projectDb.getProject(projectId);

      if (!project?.path) {
        return JSON.stringify({ error: 'Project path not found' });
      }

      const targetPath = directory
        ? path.join(project.path, directory)
        : project.path;

      try {
        if (!fs.existsSync(targetPath)) {
          return JSON.stringify({ error: `Directory not found: ${directory}` });
        }

        const entries = fs.readdirSync(targetPath, { withFileTypes: true });
        const files = entries
          .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
          .slice(0, 50) // Limit for token budget
          .map(e => ({
            name: e.name,
            type: e.isDirectory() ? 'directory' : 'file',
          }));

        return JSON.stringify({
          directory: directory || '/',
          files,
          total: entries.length,
        });
      } catch (error) {
        return JSON.stringify({ error: 'Failed to read directory' });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown project tool: ${name}` });
  }
}

function scanDirectory(dirPath: string, maxDepth: number, currentDepth: number = 0): object[] {
  if (currentDepth >= maxDepth) return [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result: object[] = [];

    for (const entry of entries) {
      // Skip hidden files, node_modules, etc.
      if (entry.name.startsWith('.') || entry.name === 'node_modules' ||
          entry.name === '.next' || entry.name === 'dist' || entry.name === 'build') {
        continue;
      }

      if (entry.isDirectory()) {
        const children = scanDirectory(
          path.join(dirPath, entry.name),
          maxDepth,
          currentDepth + 1
        );
        result.push({ name: entry.name, type: 'dir', children });
      } else {
        result.push({ name: entry.name, type: 'file' });
      }

      // Limit entries per directory
      if (result.length >= 30) break;
    }

    return result;
  } catch {
    return [];
  }
}
