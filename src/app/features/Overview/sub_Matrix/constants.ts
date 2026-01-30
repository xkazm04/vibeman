/**
 * Visual constants for Matrix architecture visualization
 * Centralized here to avoid deep cross-folder imports
 */

import type { IntegrationType } from '../sub_WorkspaceArchitecture/lib/types';

/**
 * Integration type colors for connection lines and chips
 */
export const INTEGRATION_COLORS: Record<IntegrationType, string> = {
  rest: '#f59e0b',        // amber - REST APIs
  graphql: '#e879f9',     // fuchsia - GraphQL
  grpc: '#22d3ee',        // cyan - gRPC
  websocket: '#34d399',   // emerald - WebSocket
  event: '#a78bfa',       // violet - Events/Messages
  database: '#60a5fa',    // blue - Database
  storage: '#fb923c',     // orange - File storage
};

/**
 * Integration type labels and visual styles
 */
export const INTEGRATION_STYLES: Record<IntegrationType, {
  label: string;
  shortLabel: string;
  dashed: boolean;
  icon: string;
}> = {
  rest: { label: 'REST API', shortLabel: 'REST', dashed: false, icon: '↔' },
  graphql: { label: 'GraphQL', shortLabel: 'GQL', dashed: false, icon: '◈' },
  grpc: { label: 'gRPC', shortLabel: 'gRPC', dashed: false, icon: '⚡' },
  websocket: { label: 'WebSocket', shortLabel: 'WS', dashed: true, icon: '↺' },
  event: { label: 'Event/Message', shortLabel: 'Event', dashed: true, icon: '→' },
  database: { label: 'Database', shortLabel: 'DB', dashed: false, icon: '◉' },
  storage: { label: 'Storage', shortLabel: 'S3', dashed: false, icon: '◫' },
};
