/**
 * DocsAnalysis Types
 * Type definitions for the 3-level documentation analysis module
 */

// Level 1: System-level modules (Pages/Client/Server/External)
export type ModuleLayer = 'pages' | 'client' | 'server' | 'external';

export interface SystemModule {
  id: string;
  name: string;
  description: string;
  layer: ModuleLayer;
  icon: string; // Emoji or icon identifier
  color: string; // Hex color for theming
  connections: string[]; // IDs of connected modules
  useCases: string[]; // IDs of use cases within this module
  position?: { x: number; y: number }; // For positioning in the diagram
}

// Level 2: Use cases, APIs, and Data Sources
export interface UseCase {
  id: string;
  moduleId: string;
  name: string;
  description: string;
  icon: string;
  apis: string[]; // IDs of related APIs
  dataSources: string[]; // IDs of related data sources
  documentation?: string; // Markdown content for Level 3
}

export interface ApiEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  moduleId: string;
}

export interface Library {
  id: string;
  name: string;
  description: string;
  type: 'internal' | 'external';
  version?: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'cache' | 'queue';
  description: string;
  icon: string;
}

// Combined API/Library type for middle column
export interface ApiOrLibrary {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'library';
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path?: string;
  version?: string;
}

// Navigation state
export type ZoomLevel = 1 | 2 | 3;

export interface NavigationState {
  level: ZoomLevel;
  selectedModuleId: string | null;
  selectedUseCaseId: string | null;
  transitionDirection: 'in' | 'out' | null;
}

// Connection for visual rendering
export interface Connection {
  from: string;
  to: string;
  type: 'data' | 'control' | 'event';
  animated?: boolean;
}
