/**
 * Mock Data Generator for Architecture Visualization
 * Creates realistic tier-based project structure (no integration layer)
 */

import type {
  WorkspaceProjectNode,
  CrossProjectRelationship,
  ProjectTier,
  FrameworkCategory,
  IntegrationType,
  ConnectionSummary,
} from './types';
import { TIER_CONFIG } from './types';

// Sample project definitions organized by tier (removed integration layer)
const PROJECT_TEMPLATES: Array<{
  name: string;
  tier: ProjectTier;
  framework: string;
  frameworkCategory: FrameworkCategory;
  description: string;
}> = [
  // Frontend Layer
  {
    name: 'Web Dashboard',
    tier: 'frontend',
    framework: 'Next.js 14',
    frameworkCategory: 'nextjs',
    description: 'Main web application for customers',
  },
  {
    name: 'Mobile App',
    tier: 'frontend',
    framework: 'React Native',
    frameworkCategory: 'react',
    description: 'iOS & Android mobile application',
  },
  {
    name: 'Admin Portal',
    tier: 'frontend',
    framework: 'React + Vite',
    frameworkCategory: 'react',
    description: 'Internal administration interface',
  },

  // Backend Services (direct connections, no gateway)
  {
    name: 'Auth Service',
    tier: 'backend',
    framework: 'FastAPI',
    frameworkCategory: 'python',
    description: 'Authentication & authorization',
  },
  {
    name: 'User Service',
    tier: 'backend',
    framework: 'Go',
    frameworkCategory: 'go',
    description: 'User profiles & preferences',
  },
  {
    name: 'Order Service',
    tier: 'backend',
    framework: 'Node.js',
    frameworkCategory: 'node',
    description: 'Order management & processing',
  },
  {
    name: 'Analytics Engine',
    tier: 'backend',
    framework: 'Python',
    frameworkCategory: 'python',
    description: 'Data processing & insights',
  },

  // External Services
  {
    name: 'PostgreSQL',
    tier: 'external',
    framework: 'Database',
    frameworkCategory: 'database',
    description: 'Primary relational data store',
  },
  {
    name: 'Redis',
    tier: 'external',
    framework: 'Cache',
    frameworkCategory: 'database',
    description: 'Caching & session storage',
  },
  {
    name: 'AWS S3',
    tier: 'external',
    framework: 'Storage',
    frameworkCategory: 'cloud',
    description: 'File & media storage',
  },
];

// Connection templates with integration types and business labels
const CONNECTION_TEMPLATES: Array<{
  sourceName: string;
  targetName: string;
  integrationType: IntegrationType;
  label: string;
  dataFlow?: string;
}> = [
  // Frontend -> Backend (direct connections)
  { sourceName: 'Web Dashboard', targetName: 'Auth Service', integrationType: 'rest', label: 'User Authentication', dataFlow: 'JWT tokens' },
  { sourceName: 'Web Dashboard', targetName: 'User Service', integrationType: 'graphql', label: 'User Profiles', dataFlow: 'Profile data' },
  { sourceName: 'Web Dashboard', targetName: 'Order Service', integrationType: 'rest', label: 'Orders API', dataFlow: 'Order CRUD' },
  { sourceName: 'Web Dashboard', targetName: 'Analytics Engine', integrationType: 'websocket', label: 'Live Metrics', dataFlow: 'Real-time stats' },

  { sourceName: 'Mobile App', targetName: 'Auth Service', integrationType: 'rest', label: 'Mobile Auth', dataFlow: 'OAuth tokens' },
  { sourceName: 'Mobile App', targetName: 'User Service', integrationType: 'rest', label: 'User Data', dataFlow: 'Profile sync' },
  { sourceName: 'Mobile App', targetName: 'Order Service', integrationType: 'rest', label: 'Mobile Orders', dataFlow: 'Order status' },

  { sourceName: 'Admin Portal', targetName: 'Auth Service', integrationType: 'rest', label: 'Admin Auth', dataFlow: 'Admin tokens' },
  { sourceName: 'Admin Portal', targetName: 'User Service', integrationType: 'graphql', label: 'User Management', dataFlow: 'User CRUD' },
  { sourceName: 'Admin Portal', targetName: 'Analytics Engine', integrationType: 'graphql', label: 'Reports', dataFlow: 'Analytics data' },

  // Backend -> Backend (service-to-service)
  { sourceName: 'Order Service', targetName: 'User Service', integrationType: 'grpc', label: 'User Lookup', dataFlow: 'User validation' },
  { sourceName: 'Order Service', targetName: 'Analytics Engine', integrationType: 'event', label: 'Order Events', dataFlow: 'order.created' },
  { sourceName: 'Auth Service', targetName: 'User Service', integrationType: 'grpc', label: 'User Verify', dataFlow: 'Auth check' },

  // Backend -> External
  { sourceName: 'Auth Service', targetName: 'PostgreSQL', integrationType: 'database', label: 'Auth Data', dataFlow: 'Credentials' },
  { sourceName: 'Auth Service', targetName: 'Redis', integrationType: 'database', label: 'Sessions', dataFlow: 'Session cache' },
  { sourceName: 'User Service', targetName: 'PostgreSQL', integrationType: 'database', label: 'User Data', dataFlow: 'Profiles' },
  { sourceName: 'User Service', targetName: 'AWS S3', integrationType: 'storage', label: 'Avatars', dataFlow: 'Profile images' },
  { sourceName: 'Order Service', targetName: 'PostgreSQL', integrationType: 'database', label: 'Orders', dataFlow: 'Order records' },
  { sourceName: 'Analytics Engine', targetName: 'PostgreSQL', integrationType: 'database', label: 'Analytics', dataFlow: 'Metrics data' },
  { sourceName: 'Analytics Engine', targetName: 'Redis', integrationType: 'database', label: 'Cache', dataFlow: 'Query cache' },
];

// Generate mock projects
export function generateMockProjects(count: number = 10): WorkspaceProjectNode[] {
  const selected = PROJECT_TEMPLATES.slice(0, Math.min(count, PROJECT_TEMPLATES.length));

  return selected.map((template, index) => ({
    id: `proj_${index + 1}`,
    name: template.name,
    path: `/projects/${template.name.toLowerCase().replace(/\s+/g, '-')}`,
    tier: template.tier,
    framework: template.framework,
    frameworkCategory: template.frameworkCategory,
    description: template.description,
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    contextGroupCount: Math.floor(Math.random() * 4) + 2,
    contextCount: Math.floor(Math.random() * 15) + 5,
    connectionCount: 0,
    outgoingConnections: [],
    incomingConnections: [],
    color: TIER_CONFIG[template.tier].color,
  }));
}

// Generate relationships based on available projects
export function generateMockRelationships(
  projects: WorkspaceProjectNode[]
): CrossProjectRelationship[] {
  const relationships: CrossProjectRelationship[] = [];
  const projectByName = new Map(projects.map(p => [p.name, p]));

  let relId = 1;
  for (const template of CONNECTION_TEMPLATES) {
    const source = projectByName.get(template.sourceName);
    const target = projectByName.get(template.targetName);

    if (source && target) {
      const relationship: CrossProjectRelationship = {
        id: `rel_${relId++}`,
        sourceProjectId: source.id,
        targetProjectId: target.id,
        integrationType: template.integrationType,
        label: template.label,
        dataFlow: template.dataFlow,
        confidence: 0.85 + Math.random() * 0.15,
      };

      relationships.push(relationship);

      // Update connection counts
      source.connectionCount++;
      target.connectionCount++;

      // Add to connection summaries
      const outgoing: ConnectionSummary = {
        relationshipId: relationship.id,
        targetId: target.id,
        targetName: target.name,
        integrationType: template.integrationType,
        label: template.label,
        direction: 'outgoing',
      };
      source.outgoingConnections = source.outgoingConnections || [];
      source.outgoingConnections.push(outgoing);

      const incoming: ConnectionSummary = {
        relationshipId: relationship.id,
        targetId: source.id,
        targetName: source.name,
        integrationType: template.integrationType,
        label: template.label,
        direction: 'incoming',
      };
      target.incomingConnections = target.incomingConnections || [];
      target.incomingConnections.push(incoming);
    }
  }

  return relationships;
}

// Generate complete mock data
export function generateMockArchitectureData(projectCount: number = 10) {
  const projects = generateMockProjects(projectCount);
  const relationships = generateMockRelationships(projects);

  return {
    projects,
    relationships,
    analysisStatus: {
      isAnalyzing: false,
      lastAnalyzedAt: new Date(Date.now() - 1000 * 60 * 30),
      relationshipsDiscovered: relationships.length,
      patternsDetected: ['microservices', 'event_driven', 'polyglot'],
    },
  };
}

// Helper: Group connections by source-target tier pairs (for bundling)
export function groupConnectionsByTierPair(
  connections: CrossProjectRelationship[],
  nodes: WorkspaceProjectNode[]
): Map<string, CrossProjectRelationship[]> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const groups = new Map<string, CrossProjectRelationship[]>();

  for (const conn of connections) {
    const source = nodeMap.get(conn.sourceProjectId);
    const target = nodeMap.get(conn.targetProjectId);
    if (!source || !target) continue;

    const key = `${source.tier}->${target.tier}`;
    const list = groups.get(key) || [];
    list.push(conn);
    groups.set(key, list);
  }

  return groups;
}

// Helper: Build adjacency matrix for matrix view
export function buildAdjacencyMatrix(
  nodes: WorkspaceProjectNode[],
  connections: CrossProjectRelationship[]
): Map<string, CrossProjectRelationship[]> {
  const matrix = new Map<string, CrossProjectRelationship[]>();

  // Initialize empty cells
  for (const source of nodes) {
    for (const target of nodes) {
      if (source.id !== target.id) {
        matrix.set(`${source.id}-${target.id}`, []);
      }
    }
  }

  // Fill in connections
  for (const conn of connections) {
    const key = `${conn.sourceProjectId}-${conn.targetProjectId}`;
    const list = matrix.get(key) || [];
    list.push(conn);
    matrix.set(key, list);
  }

  return matrix;
}
