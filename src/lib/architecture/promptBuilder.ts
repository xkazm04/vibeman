/**
 * Architecture Analysis Prompt Builder
 * Builds prompts for Claude Code to analyze cross-project architecture
 */

import type { IntegrationType, AnalysisResult } from '@/app/db/models/cross-project-architecture.types';

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  framework?: string;
  tier?: 'frontend' | 'backend' | 'external' | 'shared';
}

export interface AnalysisPromptConfig {
  analysisId: string;
  scope: 'project' | 'workspace';
  workspaceId?: string | null;
  projects: ProjectInfo[];
  callbackUrl: string;
  existingRelationships?: Array<{
    sourceId: string;
    targetId: string;
    integrationType: IntegrationType;
    label: string;
  }>;
}

/**
 * Build a prompt for workspace-level architecture analysis
 */
export function buildWorkspaceAnalysisPrompt(config: AnalysisPromptConfig): string {
  const { analysisId, projects, callbackUrl, existingRelationships } = config;

  const projectsList = projects
    .map((p, i) => `${i + 1}. **${p.name}** (${p.tier || 'unknown'})
   - Path: \`${p.path}\`
   - Framework: ${p.framework || 'unknown'}`)
    .join('\n');

  const existingRelsList = existingRelationships?.length
    ? existingRelationships
        .map(r => `- ${r.sourceId} → ${r.targetId} (${r.integrationType}): ${r.label}`)
        .join('\n')
    : 'None discovered yet.';

  return `# Cross-Project Architecture Analysis

You are analyzing the architecture of a workspace containing multiple projects to discover how they connect and communicate.

## Projects to Analyze

${projectsList}

## Existing Known Relationships

${existingRelsList}

## Your Task

Analyze these projects to discover:

1. **API Integrations**: REST, GraphQL, gRPC endpoints one project exposes that another consumes
2. **Data Flow**: How data moves between projects (events, messages, shared databases)
3. **Dependencies**: Shared libraries, packages, or code that multiple projects use
4. **Infrastructure**: Database connections, cache layers, storage services

### Analysis Steps

1. **Scan package.json / requirements.txt** in each project for shared dependencies
2. **Look for API clients/SDKs** that reference other projects
3. **Search for environment variables** pointing to other services
4. **Examine import statements** for cross-project references
5. **Check for event/message handlers** (Kafka, RabbitMQ, Redis pub/sub)
6. **Identify database connections** (connection strings, ORM configs)

### Integration Types

Use these integration types in your findings:
- \`rest\`: REST API calls (HTTP/HTTPS)
- \`graphql\`: GraphQL queries/mutations
- \`grpc\`: gRPC service calls
- \`websocket\`: WebSocket connections
- \`event\`: Event/message queues (Kafka, RabbitMQ, Redis)
- \`database\`: Shared database access
- \`storage\`: Shared file storage (S3, GCS, etc.)

## Output Format

After analysis, call the completion API with your findings:

\`\`\`bash
curl -X POST "${callbackUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "relationships": [
      {
        "source_project_id": "<project-id>",
        "target_project_id": "<project-id>",
        "integration_type": "<type>",
        "label": "Short description",
        "protocol": "Technical detail (e.g., POST /api/users)",
        "data_flow": "What data flows (e.g., User profiles)",
        "confidence": 0.9
      }
    ],
    "patterns": [
      {
        "name": "Pattern name",
        "description": "What the pattern is",
        "projects_involved": ["project-id-1", "project-id-2"],
        "strength": "strong|moderate|weak"
      }
    ],
    "recommendations": [
      {
        "type": "optimization|warning|suggestion|risk",
        "title": "Short title",
        "description": "Detailed explanation",
        "affected_projects": ["project-id"],
        "priority": "high|medium|low"
      }
    ],
    "narrative": "A brief summary of the overall architecture..."
  }'
\`\`\`

## Project IDs Reference

${projects.map(p => `- ${p.name}: \`${p.id}\``).join('\n')}

## Analysis ID

This analysis session ID is: \`${analysisId}\`

Begin your analysis now. Read the relevant files in each project, identify connections, and report your findings via the API.`;
}

/**
 * Build a prompt for single project analysis (during onboarding)
 */
export function buildProjectAnalysisPrompt(config: {
  analysisId: string;
  project: ProjectInfo;
  existingProjects: ProjectInfo[];
  callbackUrl: string;
}): string {
  const { analysisId, project, existingProjects, callbackUrl } = config;

  const existingList = existingProjects
    .map((p, i) => `${i + 1}. **${p.name}** (${p.tier || 'unknown'})
   - Path: \`${p.path}\`
   - Framework: ${p.framework || 'unknown'}`)
    .join('\n');

  return `# New Project Architecture Analysis

A new project has been added to the workspace. Analyze how it connects to existing projects.

## New Project

**${project.name}**
- Path: \`${project.path}\`
- Framework: ${project.framework || 'unknown'}
- Tier: ${project.tier || 'to be determined'}

## Existing Projects

${existingList || 'No other projects in workspace yet.'}

## Your Task

1. **Determine the project tier** (frontend, backend, external, shared)
2. **Identify the framework** if not already known
3. **Discover connections** to existing projects

### Analysis Steps

1. Check \`package.json\`, \`requirements.txt\`, or similar for dependencies
2. Look for API client code or SDK usage
3. Check for environment variables referencing other services
4. Examine configuration files for service URLs
5. Search for import statements or shared module references

### Integration Types

- \`rest\`: REST API calls
- \`graphql\`: GraphQL queries
- \`grpc\`: gRPC calls
- \`websocket\`: WebSocket connections
- \`event\`: Event/message queues
- \`database\`: Shared database
- \`storage\`: Shared file storage

## Output Format

Call the completion API when done:

\`\`\`bash
curl -X POST "${callbackUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_metadata": {
      "tier": "frontend|backend|external|shared",
      "framework": "detected framework",
      "framework_category": "react|nextjs|vue|node|python|go|java|database|cloud|other",
      "description": "Brief project description"
    },
    "relationships": [...],
    "patterns": [...],
    "recommendations": [...],
    "narrative": "..."
  }'
\`\`\`

## Project IDs

- New project: \`${project.id}\`
${existingProjects.map(p => `- ${p.name}: \`${p.id}\``).join('\n')}

## Analysis ID

\`${analysisId}\`

Begin analysis now.`;
}

/**
 * Parse analysis result from Claude Code response
 */
export function parseAnalysisResult(raw: unknown): AnalysisResult | null {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Validate required fields
    if (!data || typeof data !== 'object') return null;

    const result: AnalysisResult = {
      relationships: [],
      patterns: [],
      recommendations: [],
      narrative: data.narrative || '',
    };

    // Parse relationships
    if (Array.isArray(data.relationships)) {
      result.relationships = data.relationships
        .filter((r: unknown) => {
          if (!r || typeof r !== 'object') return false;
          const rel = r as Record<string, unknown>;
          return rel.source_project_id && rel.target_project_id && rel.integration_type;
        })
        .map((r: Record<string, unknown>) => ({
          source_project_id: String(r.source_project_id),
          target_project_id: String(r.target_project_id),
          integration_type: r.integration_type as IntegrationType,
          label: String(r.label || ''),
          protocol: r.protocol ? String(r.protocol) : undefined,
          data_flow: r.data_flow ? String(r.data_flow) : undefined,
          confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
        }));
    }

    // Parse patterns
    if (Array.isArray(data.patterns)) {
      result.patterns = data.patterns
        .filter((p: unknown) => p && typeof p === 'object')
        .map((p: Record<string, unknown>) => ({
          name: String(p.name || ''),
          description: String(p.description || ''),
          projects_involved: Array.isArray(p.projects_involved)
            ? p.projects_involved.map(String)
            : [],
          strength: (p.strength as 'strong' | 'moderate' | 'weak') || 'moderate',
        }));
    }

    // Parse recommendations
    if (Array.isArray(data.recommendations)) {
      result.recommendations = data.recommendations
        .filter((r: unknown) => r && typeof r === 'object')
        .map((r: Record<string, unknown>) => ({
          type: (r.type as 'optimization' | 'warning' | 'suggestion' | 'risk') || 'suggestion',
          title: String(r.title || ''),
          description: String(r.description || ''),
          affected_projects: Array.isArray(r.affected_projects)
            ? r.affected_projects.map(String)
            : [],
          priority: (r.priority as 'high' | 'medium' | 'low') || 'medium',
        }));
    }

    return result;
  } catch (e) {
    console.error('Failed to parse analysis result:', e);
    return null;
  }
}
