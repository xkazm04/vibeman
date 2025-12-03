/**
 * DocsAnalysis Types
 * Type definitions for the 3-level documentation analysis module
 */

// Level 1: System-level modules (Pages/Client/Server/External)
export type ModuleLayer = 'pages' | 'client' | 'server' | 'external';

// Navigation state
export type ZoomLevel = 1 | 2 | 3;

export interface NavigationState {
  level: ZoomLevel;
  selectedModuleId: string | null;
  selectedUseCaseId: string | null;
  transitionDirection: 'in' | 'out' | null;
}
