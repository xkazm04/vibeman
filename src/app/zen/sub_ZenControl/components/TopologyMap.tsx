'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  Activity,
  Wifi,
  WifiOff,
  Zap,
  Info,
} from 'lucide-react';
import * as d3 from 'd3';
import type {
  NetworkTopology,
  TopologyNode,
  TopologyEdge,
  TopologyImprovement,
  ConnectionQuality,
} from '@/lib/remote/topologyBuilder';
import {
  qualityToColor,
  statusToColor,
  suggestImprovements,
} from '@/lib/remote/topologyBuilder';
import { useEmulatorStore } from '@/stores/emulatorStore';

interface TopologyMapProps {
  /** Topology data to render */
  topology: NetworkTopology | null;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback to refresh topology */
  onRefresh?: () => void;
  /** Selected node for details */
  selectedNodeId?: string | null;
  /** Callback when node is selected */
  onNodeSelect?: (nodeId: string | null) => void;
  /** Show improvements panel */
  showImprovements?: boolean;
}

// D3 simulation types
type SimulationNode = TopologyNode & d3.SimulationNodeDatum;
type SimulationLink = d3.SimulationLinkDatum<SimulationNode> & TopologyEdge;

export default function TopologyMap({
  topology,
  isLoading = false,
  onRefresh,
  selectedNodeId,
  onNodeSelect,
  showImprovements = true,
}: TopologyMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [improvements, setImprovements] = useState<TopologyImprovement[]>([]);

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: Math.max(300, width), height: Math.max(200, height) });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate improvements when topology changes
  useEffect(() => {
    if (topology && showImprovements) {
      setImprovements(suggestImprovements(topology));
    } else {
      setImprovements([]);
    }
  }, [topology, showImprovements]);

  // D3 visualization
  useEffect(() => {
    if (!svgRef.current || !topology || topology.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    // Create nodes and links for simulation
    const nodes: SimulationNode[] = topology.nodes.map((node) => ({
      ...node,
      // Position hub (local) node at center, others around it
      x: node.isLocal ? centerX : undefined,
      y: node.isLocal ? centerY : undefined,
      fx: node.isLocal ? centerX : null,
      fy: node.isLocal ? centerY : null,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: SimulationLink[] = topology.edges.map((edge) => ({
      ...edge,
      source: nodeMap.get(edge.source) as SimulationNode,
      target: nodeMap.get(edge.target) as SimulationNode,
    }));

    // Create container groups
    const g = svg.append('g').attr('class', 'topology-container');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Draw edges
    const edgeGroup = g.append('g').attr('class', 'edges');

    const edgeLines = edgeGroup
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => qualityToColor(d.quality))
      .attr('stroke-width', (d) => (d.isActive ? 3 : 1.5))
      .attr('stroke-opacity', (d) => (d.isActive ? 0.8 : 0.4))
      .attr('stroke-dasharray', (d) => (d.isActive ? 'none' : '4,4'));

    // Add data flow animation for active connections
    const animatedEdges = edgeGroup
      .selectAll('circle.data-flow')
      .data(links.filter((l) => l.dataFlowDirection !== 'none'))
      .join('circle')
      .attr('class', 'data-flow')
      .attr('r', 3)
      .attr('fill', '#22d3ee')
      .attr('opacity', 0.8);

    // Animate data flow
    function animateDataFlow() {
      animatedEdges
        .transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attrTween('cx', function (d) {
          const source = d.source as SimulationNode;
          const target = d.target as SimulationNode;
          return d3.interpolate(source.x ?? 0, target.x ?? 0);
        })
        .attrTween('cy', function (d) {
          const source = d.source as SimulationNode;
          const target = d.target as SimulationNode;
          return d3.interpolate(source.y ?? 0, target.y ?? 0);
        })
        .on('end', function () {
          d3.select(this)
            .attr('cx', (d) => (d.source as SimulationNode).x ?? 0)
            .attr('cy', (d) => (d.source as SimulationNode).y ?? 0);
          animateDataFlow();
        });
    }

    if (links.some((l) => l.dataFlowDirection !== 'none')) {
      animateDataFlow();
    }

    // Draw nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const nodeElements = nodeGroup
      .selectAll('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeSelect?.(d.id === selectedNodeId ? null : d.id);
      })
      .on('mouseenter', (event, d) => setHoveredNode(d.id))
      .on('mouseleave', () => setHoveredNode(null));

    // Node background circle
    nodeElements
      .append('circle')
      .attr('r', (d) => (d.isLocal ? 30 : 24))
      .attr('fill', '#1f2937')
      .attr('stroke', (d) => statusToColor(d.status))
      .attr('stroke-width', (d) =>
        d.id === selectedNodeId ? 4 : d.id === hoveredNode ? 3 : 2
      )
      .attr('stroke-opacity', (d) => (d.status === 'offline' ? 0.4 : 1));

    // Status indicator
    nodeElements
      .append('circle')
      .attr('cx', (d) => (d.isLocal ? 20 : 16))
      .attr('cy', (d) => (d.isLocal ? -20 : -16))
      .attr('r', 5)
      .attr('fill', (d) => statusToColor(d.status));

    // Node icon (using text for simplicity)
    nodeElements
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', (d) => (d.status === 'offline' ? '#6b7280' : '#e5e7eb'))
      .attr('font-size', (d) => (d.isLocal ? '16px' : '14px'))
      .text((d) => (d.type === 'desktop' ? '💻' : '📱'));

    // Node label
    nodeElements
      .append('text')
      .attr('y', (d) => (d.isLocal ? 45 : 38))
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.id === selectedNodeId ? '#22d3ee' : '#9ca3af'))
      .attr('font-size', '11px')
      .attr('font-weight', (d) => (d.isLocal ? '600' : '400'))
      .text((d) => d.name.slice(0, 12) + (d.name.length > 12 ? '...' : ''));

    // Session indicator
    nodeElements
      .filter((d) => d.status !== 'offline')
      .append('text')
      .attr('y', (d) => (d.isLocal ? 58 : 50))
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .attr('font-size', '9px')
      .text((d) => `${d.activeSessions}/${d.maxSessions}`);

    // Create force simulation
    const simulation = d3
      .forceSimulation<SimulationNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, SimulationLink>(links)
          .id((d) => d.id)
          .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(centerX, centerY))
      .force('collision', d3.forceCollide().radius(50));

    // Update positions on simulation tick
    simulation.on('tick', () => {
      edgeLines
        .attr('x1', (d) => (d.source as SimulationNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimulationNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimulationNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimulationNode).y ?? 0);

      nodeElements.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);

      animatedEdges
        .attr('cx', (d) => (d.source as SimulationNode).x ?? 0)
        .attr('cy', (d) => (d.source as SimulationNode).y ?? 0);
    });

    // Add drag behavior
    const drag = d3
      .drag<SVGGElement, SimulationNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        // Keep hub fixed, release others
        if (!d.isLocal) {
          d.fx = null;
          d.fy = null;
        }
      });

    nodeElements.call(drag);

    // Click on background to deselect
    svg.on('click', () => {
      onNodeSelect?.(null);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [topology, dimensions, selectedNodeId, hoveredNode, onNodeSelect]);

  // Get selected node details
  const selectedNode = topology?.nodes.find((n) => n.id === selectedNodeId);
  const selectedEdges = topology?.edges.filter(
    (e) => e.source === selectedNodeId || e.target === selectedNodeId
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-200">Network Topology</span>
          {topology && (
            <span className="text-xs text-gray-500">
              {topology.stats.onlineNodes}/{topology.stats.totalNodes} online
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Health indicator */}
          {topology && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                topology.stats.healthScore >= 80
                  ? 'bg-green-500/20 text-green-400'
                  : topology.stats.healthScore >= 50
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              <Activity className="w-3 h-3" />
              {topology.stats.healthScore}%
            </div>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Refresh topology"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Topology visualization */}
        <div ref={containerRef} className="flex-1 relative bg-gray-900/50">
          {isLoading && !topology && (
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-gray-500 animate-spin" />
            </div>
          )}

          {!topology && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <WifiOff className="w-12 h-12 mb-2" />
              <p className="text-sm">No topology data</p>
              <button
                onClick={onRefresh}
                className="mt-2 text-xs text-cyan-400 hover:underline"
              >
                Load topology
              </button>
            </div>
          )}

          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-full"
          />

          {/* Legend */}
          <div className="absolute bottom-2 left-2 flex flex-col gap-1 p-2 bg-gray-900/80 rounded-lg text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-400">Online</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-gray-400">Busy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-gray-400">Offline</span>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <AnimatePresence>
          {(selectedNode || improvements.length > 0) && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-gray-700 bg-gray-800/50 overflow-hidden"
            >
              <div className="w-60 p-3 space-y-4 overflow-y-auto max-h-full">
                {/* Selected node details */}
                {selectedNode && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Selected Node
                    </h4>
                    <div className="p-2 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {selectedNode.type === 'desktop' ? (
                          <Monitor className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Smartphone className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm font-medium text-gray-200">
                          {selectedNode.name}
                        </span>
                        {selectedNode.isLocal && (
                          <span className="px-1 py-0.5 bg-cyan-500/20 text-cyan-400 text-[9px] rounded">
                            LOCAL
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status</span>
                          <span
                            className="font-medium"
                            style={{ color: statusToColor(selectedNode.status) }}
                          >
                            {selectedNode.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Sessions</span>
                          <span className="text-gray-300">
                            {selectedNode.activeSessions}/{selectedNode.maxSessions}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Connections */}
                    {selectedEdges && selectedEdges.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-[10px] text-gray-500 uppercase">Connections</h5>
                        {selectedEdges.map((edge) => {
                          const otherNodeId =
                            edge.source === selectedNodeId ? edge.target : edge.source;
                          const otherNode = topology?.nodes.find((n) => n.id === otherNodeId);

                          return (
                            <div
                              key={edge.id}
                              className="flex items-center justify-between p-1.5 bg-gray-900/50 rounded text-xs"
                            >
                              <span className="text-gray-400">{otherNode?.name ?? 'Unknown'}</span>
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: qualityToColor(edge.quality) }}
                                />
                                {edge.latencyMs !== null && (
                                  <span className="text-gray-500">{edge.latencyMs}ms</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Improvements */}
                {improvements.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wider flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Suggestions
                    </h4>
                    <div className="space-y-1.5">
                      {improvements.map((imp, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg text-xs ${
                            imp.severity === 'critical'
                              ? 'bg-red-500/10 border border-red-500/30'
                              : imp.severity === 'warning'
                              ? 'bg-amber-500/10 border border-amber-500/30'
                              : 'bg-gray-700/50 border border-gray-700'
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            {imp.severity === 'critical' ? (
                              <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5" />
                            ) : imp.severity === 'warning' ? (
                              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5" />
                            ) : (
                              <Zap className="w-3 h-3 text-gray-400 mt-0.5" />
                            )}
                            <p
                              className={
                                imp.severity === 'critical'
                                  ? 'text-red-300'
                                  : imp.severity === 'warning'
                                  ? 'text-amber-300'
                                  : 'text-gray-400'
                              }
                            >
                              {imp.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats bar */}
      {topology && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700 text-[10px] text-gray-500">
          <div className="flex items-center gap-4">
            <span>
              Connections: {topology.stats.activeConnections}/{topology.stats.totalConnections}
            </span>
            {topology.stats.avgLatencyMs !== null && (
              <span>Avg latency: {Math.round(topology.stats.avgLatencyMs)}ms</span>
            )}
          </div>
          <span>Updated: {new Date(topology.lastUpdated).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
