/**
 * Types for Cross-Project Architecture Visualization
 * UML Component Diagram Style with Tier-Based Layout
 */

// Project tier for swimlane grouping (removed 'integration')
export type ProjectTier = 'frontend' | 'backend' | 'external' | 'shared';

// Integration/Protocol types - determines connection color
export type IntegrationType = 'rest' | 'graphql' | 'grpc' | 'websocket' | 'event' | 'database' | 'storage';

// Cross-project relationship
export interface CrossProjectRelationship {
  id: string;
  sourceProjectId: string;
  targetProjectId: string;
  integrationType: IntegrationType;
  label: string;           // Business label (e.g., "User Auth", "Order Data")
  protocol?: string;       // Technical detail (e.g., "POST /api/auth")
  dataFlow?: string;       // What data flows (e.g., "JWT tokens", "User profiles")
  confidence: number;      // 0-1
}

// Framework categories for visual grouping
export type FrameworkCategory = 'react' | 'nextjs' | 'vue' | 'node' | 'python' | 'go' | 'java' | 'database' | 'cloud' | 'other';

// Project node for visualization
export interface WorkspaceProjectNode {
  id: string;
  name: string;
  path: string;
  tier: ProjectTier;
  framework?: string;
  frameworkCategory: FrameworkCategory;
  description?: string;

  // Git info (like IDE status bar)
  branch?: string;         // Current git branch name
  branchDirty?: boolean;   // Has uncommitted changes

  // Position (calculated by layout)
  x: number;
  y: number;
  width: number;
  height: number;

  // Stats
  contextGroupCount: number;
  contextCount: number;
  connectionCount: number;

  // Connections summary for inline display
  outgoingConnections?: ConnectionSummary[];
  incomingConnections?: ConnectionSummary[];

  // Visual
  color: string;
  icon?: string;
}

// Connection summary for inline port display
export interface ConnectionSummary {
  relationshipId: string;
  targetId: string;
  targetName: string;
  integrationType: IntegrationType;
  label: string;
  direction: 'outgoing' | 'incoming';
}

// Tier configuration for swimlanes
export interface TierConfig {
  id: ProjectTier;
  label: string;
  color: string;
  bgColor: string;
  y: number;
  height: number;
}

// Analysis status
export interface ArchitectureAnalysisStatus {
  isAnalyzing: boolean;
  lastAnalyzedAt: Date | null;
  relationshipsDiscovered: number;
  patternsDetected: string[];
}

// Tier colors and styling (removed integration)
export const TIER_CONFIG: Record<ProjectTier, Omit<TierConfig, 'y' | 'height'>> = {
  frontend: {
    id: 'frontend',
    label: 'Frontend Applications',
    color: '#06b6d4',     // cyan-500
    bgColor: 'rgba(6, 182, 212, 0.03)',
  },
  backend: {
    id: 'backend',
    label: 'Backend Services',
    color: '#8b5cf6',     // violet-500
    bgColor: 'rgba(139, 92, 246, 0.03)',
  },
  external: {
    id: 'external',
    label: 'External & Infrastructure',
    color: '#f59e0b',     // amber-500
    bgColor: 'rgba(245, 158, 11, 0.03)',
  },
  shared: {
    id: 'shared',
    label: 'Shared Libraries',
    color: '#10b981',     // emerald-500
    bgColor: 'rgba(16, 185, 129, 0.03)',
  },
};

// NOTE: INTEGRATION_COLORS and INTEGRATION_STYLES moved to sub_Matrix/constants.ts
// to avoid deep cross-folder imports from Matrix components

// Framework category colors
export const FRAMEWORK_COLORS: Record<FrameworkCategory, string> = {
  react: '#61dafb',
  nextjs: '#ffffff',
  vue: '#42b883',
  node: '#339933',
  python: '#3776ab',
  go: '#00add8',
  java: '#ed8b00',
  database: '#336791',
  cloud: '#ff9900',
  other: '#6b7280',
};

// Matrix cell state for Approach 2
export interface MatrixCell {
  sourceId: string;
  targetId: string;
  connections: CrossProjectRelationship[];
  hasConnection: boolean;
}
