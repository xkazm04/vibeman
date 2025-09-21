interface ProjectContext {
  state: {
    activeProject: {
      id: string;
      name: string;
      path: string;
      port?: number;
      type: string;
      allowMultipleInstances?: boolean;
      basePort?: number;
      runScript?: string;
    };
  };
  version: number;
}

export function formatProjectMetadata(projectContext: ProjectContext): string {
  const project = projectContext.state.activeProject;
  
  return `
### Current Project Information
- **Project Name**: ${project.name}
- **Project ID**: ${project.id}
- **Project Path**: ${project.path}
- **Project Type**: ${project.type}
- **Development Port**: ${project.port || 'Not specified'}
- **Run Command**: ${project.runScript || 'Not specified'}
- **Multiple Instances**: ${project.allowMultipleInstances ? 'Allowed' : 'Single instance only'}

### Context Notes
- This is an active development project
- The user is currently working on this project
- All tool queries should be scoped to this specific project
- Use the Project ID (${project.id}) for all tool calls
`;
}

export function getDefaultProjectMetadata(): string {
  return `
### Current Project Information
- **Project Name**: Unknown
- **Project ID**: Not available
- **Project Path**: Not specified
- **Project Type**: Unknown

### Context Notes
- Project information not available
- Using fallback project context
- Some features may be limited without project data
`;
}