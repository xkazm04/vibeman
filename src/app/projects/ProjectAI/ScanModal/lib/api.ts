/**
 * API utility functions for ScanModal components
 * Centralized API calls for file reading and Claude Code operations
 */

/**
 * Read a file from disk using the API
 */
export async function readFileFromDisk(filePath: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/disk/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read', filePath })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, content: data.content || '' };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    console.error('Failed to read file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if AI documentation exists for a project
 */
export async function checkAIDocsExist(projectPath: string): Promise<boolean> {
  if (!projectPath) return false;

  try {
    const response = await fetch('/api/disk/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'read',
        filePath: `${projectPath}/context/high.md`
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error checking AI docs:', error);
    return false;
  }
}

/**
 * Read AI documentation for a project
 */
export async function readAIDocs(projectPath: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  const filePath = `${projectPath}/context/high.md`;
  return readFileFromDisk(filePath);
}

/**
 * Check Claude Code folder status in a project
 */
export async function checkClaudeCodeStatus(projectPath: string): Promise<{
  exists: boolean;
  initialized: boolean;
  missing: string[];
  error?: string;
}> {
  try {
    const response = await fetch('/api/claude-code/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        exists: data.exists || false,
        initialized: data.initialized || false,
        missing: data.missing || [],
      };
    } else {
      const errorText = await response.text();
      return {
        exists: false,
        initialized: false,
        missing: [],
        error: errorText
      };
    }
  } catch (error) {
    console.error('Failed to check Claude Code status:', error);
    return {
      exists: false,
      initialized: false,
      missing: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Initialize Claude Code folder structure in a project
 */
export async function initializeClaudeCode(
  projectPath: string,
  projectName?: string,
  projectId?: string,
  projectType?: 'nextjs' | 'fastapi' | 'other'
): Promise<{
  success: boolean;
  error?: string;
  message?: string;
  contextScanRequirement?: {
    created: boolean;
    filePath?: string;
    error?: string;
  };
  structureRules?: {
    created: boolean;
    filePath?: string;
    error?: string;
  };
}> {
  try {
    const response = await fetch('/api/claude-code/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        projectName,
        projectId,
        projectType
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Claude Code initialized successfully',
        contextScanRequirement: data.contextScanRequirement,
        structureRules: data.structureRules
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText
      };
    }
  } catch (error) {
    console.error('Failed to initialize Claude Code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
