/**
 * Topology Builder
 * Builds network topology data structures for visualization
 */

import type { RemoteDevice } from './deviceTypes';

/**
 * Node in the topology graph
 */
export interface TopologyNode {
  id: string;
  deviceId: string;
  name: string;
  type: 'desktop' | 'emulator' | 'hub';
  status: 'online' | 'offline' | 'busy' | 'idle';
  activeSessions: number;
  maxSessions: number;
  isLocal: boolean;
  // Position (computed by D3 or stored)
  x?: number;
  y?: number;
  fx?: number | null; // Fixed x position
  fy?: number | null; // Fixed y position
}

/**
 * Connection quality level
 */
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'unknown';

/**
 * Edge (connection) in the topology graph
 */
export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  // Quality metrics
  quality: ConnectionQuality;
  latencyMs: number | null;
  throughputKbps: number | null;
  packetLoss: number | null;
  // Status
  isActive: boolean;
  lastActivity: string | null;
  // Data flow animation
  dataFlowDirection: 'source-to-target' | 'target-to-source' | 'bidirectional' | 'none';
}

/**
 * Network partition information
 */
export interface NetworkPartition {
  id: string;
  nodes: string[];
  isIsolated: boolean;
  reason?: string;
}

/**
 * Complete topology structure
 */
export interface NetworkTopology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  partitions: NetworkPartition[];
  hubNodeId: string | null;
  stats: TopologyStats;
  lastUpdated: string;
}

/**
 * Topology statistics
 */
export interface TopologyStats {
  totalNodes: number;
  onlineNodes: number;
  busyNodes: number;
  totalConnections: number;
  activeConnections: number;
  avgLatencyMs: number | null;
  healthScore: number; // 0-100
}

/**
 * Convert connection quality to numeric score (0-100)
 */
export function qualityToScore(quality: ConnectionQuality): number {
  switch (quality) {
    case 'excellent':
      return 100;
    case 'good':
      return 80;
    case 'fair':
      return 60;
    case 'poor':
      return 40;
    case 'critical':
      return 20;
    case 'unknown':
      return 50;
  }
}

/**
 * Convert latency to connection quality
 */
export function latencyToQuality(latencyMs: number | null): ConnectionQuality {
  if (latencyMs === null) return 'unknown';
  if (latencyMs < 50) return 'excellent';
  if (latencyMs < 100) return 'good';
  if (latencyMs < 200) return 'fair';
  if (latencyMs < 500) return 'poor';
  return 'critical';
}

/**
 * Get color for connection quality
 */
export function qualityToColor(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return '#22c55e'; // green-500
    case 'good':
      return '#84cc16'; // lime-500
    case 'fair':
      return '#eab308'; // yellow-500
    case 'poor':
      return '#f97316'; // orange-500
    case 'critical':
      return '#ef4444'; // red-500
    case 'unknown':
      return '#6b7280'; // gray-500
  }
}

/**
 * Get color for node status
 */
export function statusToColor(status: TopologyNode['status']): string {
  switch (status) {
    case 'online':
      return '#22c55e'; // green-500
    case 'busy':
      return '#f59e0b'; // amber-500
    case 'idle':
      return '#6366f1'; // indigo-500
    case 'offline':
      return '#6b7280'; // gray-500
  }
}

/**
 * Build topology from device list
 * Creates a star topology with the local device as the hub
 */
export function buildTopologyFromDevices(
  devices: RemoteDevice[],
  localDeviceId: string,
  connectionMetrics?: Map<string, { latencyMs: number; lastPing: string }>
): NetworkTopology {
  const now = new Date().toISOString();

  // Create nodes from devices
  const nodes: TopologyNode[] = devices.map((device) => ({
    id: device.device_id,
    deviceId: device.device_id,
    name: device.device_name,
    type: device.device_type,
    status: device.status,
    activeSessions: device.active_sessions,
    maxSessions: device.capabilities?.session_slots || 4,
    isLocal: device.device_id === localDeviceId,
  }));

  // Create edges (star topology - each device connects to local hub)
  const edges: TopologyEdge[] = [];
  const localNode = nodes.find((n) => n.isLocal);

  if (localNode) {
    // Connect all other devices to local node
    nodes
      .filter((n) => !n.isLocal && n.status !== 'offline')
      .forEach((node) => {
        const metrics = connectionMetrics?.get(node.id);
        const latency = metrics?.latencyMs ?? null;
        const quality = latencyToQuality(latency);

        edges.push({
          id: `${localNode.id}-${node.id}`,
          source: localNode.id,
          target: node.id,
          quality,
          latencyMs: latency,
          throughputKbps: null, // Would need actual measurement
          packetLoss: null,
          isActive: node.status === 'online' || node.status === 'busy',
          lastActivity: metrics?.lastPing ?? null,
          dataFlowDirection: node.status === 'busy' ? 'bidirectional' : 'none',
        });
      });
  }

  // Detect partitions (isolated nodes)
  const connectedNodeIds = new Set<string>();
  if (localNode) {
    connectedNodeIds.add(localNode.id);
    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
  }

  const partitions: NetworkPartition[] = [];
  const isolatedNodes = nodes.filter(
    (n) => !connectedNodeIds.has(n.id) && n.status !== 'offline'
  );

  if (isolatedNodes.length > 0) {
    partitions.push({
      id: 'isolated',
      nodes: isolatedNodes.map((n) => n.id),
      isIsolated: true,
      reason: 'No connection to local hub',
    });
  }

  // Calculate statistics
  const onlineNodes = nodes.filter((n) => n.status !== 'offline');
  const activeConnections = edges.filter((e) => e.isActive);
  const latencies = edges
    .filter((e) => e.latencyMs !== null)
    .map((e) => e.latencyMs as number);
  const avgLatency =
    latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : null;

  // Calculate health score
  const nodeScore = onlineNodes.length / Math.max(nodes.length, 1);
  const connectionScore =
    edges.length > 0
      ? edges.reduce((sum, e) => sum + qualityToScore(e.quality), 0) / edges.length / 100
      : 1;
  const partitionScore = partitions.length > 0 ? 0.5 : 1;
  const healthScore = Math.round((nodeScore * 0.3 + connectionScore * 0.5 + partitionScore * 0.2) * 100);

  const stats: TopologyStats = {
    totalNodes: nodes.length,
    onlineNodes: onlineNodes.length,
    busyNodes: nodes.filter((n) => n.status === 'busy').length,
    totalConnections: edges.length,
    activeConnections: activeConnections.length,
    avgLatencyMs: avgLatency,
    healthScore,
  };

  return {
    nodes,
    edges,
    partitions,
    hubNodeId: localNode?.id ?? null,
    stats,
    lastUpdated: now,
  };
}

/**
 * Create an adjacency matrix from topology
 */
export function buildAdjacencyMatrix(topology: NetworkTopology): Map<string, Set<string>> {
  const matrix = new Map<string, Set<string>>();

  // Initialize all nodes
  topology.nodes.forEach((node) => {
    matrix.set(node.id, new Set());
  });

  // Add edges
  topology.edges.forEach((edge) => {
    matrix.get(edge.source)?.add(edge.target);
    matrix.get(edge.target)?.add(edge.source);
  });

  return matrix;
}

/**
 * Find shortest path between two nodes using BFS
 */
export function findShortestPath(
  adjacencyMatrix: Map<string, Set<string>>,
  startId: string,
  endId: string
): string[] | null {
  if (!adjacencyMatrix.has(startId) || !adjacencyMatrix.has(endId)) {
    return null;
  }

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: string[] }> = [
    { nodeId: startId, path: [startId] },
  ];

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;

    if (nodeId === endId) {
      return path;
    }

    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);

    const neighbors = adjacencyMatrix.get(nodeId) ?? new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({ nodeId: neighbor, path: [...path, neighbor] });
      }
    }
  }

  return null; // No path found
}

/**
 * Suggest topology improvements
 */
export interface TopologyImprovement {
  type: 'add_connection' | 'upgrade_connection' | 'relocate_hub' | 'partition_warning';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  affectedNodes?: string[];
}

export function suggestImprovements(topology: NetworkTopology): TopologyImprovement[] {
  const improvements: TopologyImprovement[] = [];

  // Check for partitions
  if (topology.partitions.length > 0) {
    improvements.push({
      type: 'partition_warning',
      severity: 'critical',
      description: `Network has ${topology.partitions.length} isolated partition(s) with ${topology.partitions.reduce((sum, p) => sum + p.nodes.length, 0)} unreachable nodes`,
      affectedNodes: topology.partitions.flatMap((p) => p.nodes),
    });
  }

  // Check for poor connections
  const poorConnections = topology.edges.filter(
    (e) => e.quality === 'poor' || e.quality === 'critical'
  );
  if (poorConnections.length > 0) {
    improvements.push({
      type: 'upgrade_connection',
      severity: 'warning',
      description: `${poorConnections.length} connection(s) have poor quality and may affect performance`,
      affectedNodes: [...new Set(poorConnections.flatMap((e) => [e.source, e.target]))],
    });
  }

  // Check hub load
  const hubNode = topology.nodes.find((n) => n.id === topology.hubNodeId);
  if (hubNode && hubNode.activeSessions >= hubNode.maxSessions) {
    improvements.push({
      type: 'relocate_hub',
      severity: 'warning',
      description: 'Hub node is at capacity. Consider distributing load or adding more session slots.',
      affectedNodes: [hubNode.id],
    });
  }

  // Check for single points of failure
  if (topology.nodes.length > 2 && topology.edges.length < topology.nodes.length) {
    improvements.push({
      type: 'add_connection',
      severity: 'info',
      description: 'Network has limited redundancy. Consider adding peer-to-peer connections for resilience.',
    });
  }

  return improvements;
}
