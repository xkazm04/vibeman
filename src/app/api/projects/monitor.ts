import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface ProjectStatus {
  path: string;
  name: string;
  lastCommit: string;
  branch: string;
  hasChanges: boolean;
  lastModified: Date;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { projects } = req.query;
    
    if (!projects) {
      return res.status(400).json({ message: 'Projects parameter is required' });
    }

    const projectPaths = Array.isArray(projects) ? projects : [projects];
    const projectStatuses: ProjectStatus[] = [];

    for (const projectPath of projectPaths) {
      if (typeof projectPath !== 'string') continue;

      try {
        // Get git info
        const { stdout: branch } = await execAsync(`cd "${projectPath}" && git branch --show-current`);
        const { stdout: lastCommit } = await execAsync(`cd "${projectPath}" && git log -1 --pretty=format:"%h %s"`);
        const { stdout: status } = await execAsync(`cd "${projectPath}" && git status --porcelain`);
        
        // Get last modified time
        const stats = await fs.stat(projectPath);
        
        projectStatuses.push({
          path: projectPath,
          name: path.basename(projectPath),
          lastCommit: lastCommit.trim(),
          branch: branch.trim(),
          hasChanges: status.trim().length > 0,
          lastModified: stats.mtime
        });

      } catch (error) {
        console.error(`Error monitoring project ${projectPath}:`, error);
        // Continue with other projects
      }
    }

    res.status(200).json({
      success: true,
      projects: projectStatuses,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error monitoring projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to monitor projects',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
