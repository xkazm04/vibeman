import { TreeNode } from '../../../../types';

/**
 * Fetch project file structure from API
 */
export async function fetchProjectStructure(projectPath: string): Promise<TreeNode> {
  const response = await fetch('/api/project/structure', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectPath }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch project structure: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Initialize projects and load first project structure
 */
export async function initializeProjectsSequence(
  initializeProjects: () => Promise<void>,
  getAllProjects: () => Array<{ id: string; name: string; path: string }>,
  initializeWithFirstProject: () => void
): Promise<void> {
  await initializeProjects();
  
  const projects = getAllProjects();
  console.log('Available projects:', projects);
  
  if (projects.length > 0) {
    console.log('Loading structure for project:', projects[0]);
    try {
      const data = await fetchProjectStructure(projects[0].path);
      console.log('Structure data loaded:', data);
    } catch (error) {
      console.error('Structure API error:', error);
    }
  }
  
  initializeWithFirstProject();
}
