'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import styles from './DependencyGraph.module.css';

export interface GraphNode {
  id: string;
  name: string;
  type: 'project' | 'dependency' | 'shared' | 'duplicate';
  group?: number;
  metadata?: any;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
  type: 'dependency' | 'import' | 'duplicate';
}

interface DependencyGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  width?: number;
  height?: number;
}

export default function DependencyGraph({
  nodes,
  links,
  onNodeClick,
  onNodeHover,
  width = 1200,
  height = 800
}: DependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Add zoom behavior
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Create force simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(d => {
          const link = d as GraphLink;
          return link.type === 'duplicate' ? 150 : 100;
        })
        .strength(d => {
          const link = d as GraphLink;
          return link.type === 'duplicate' ? 0.3 : 0.5;
        })
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Create arrow markers for directed edges
    svg.append('defs').selectAll('marker')
      .data(['dependency', 'import', 'duplicate'])
      .join('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => {
        if (d === 'duplicate') return '#ef4444';
        if (d === 'import') return '#3b82f6';
        return '#10b981';
      });

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', styles.link)
      .attr('stroke', d => {
        if (d.type === 'duplicate') return '#ef4444';
        if (d.type === 'import') return '#3b82f6';
        return '#10b981';
      })
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value) * 2)
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', styles.node)
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any
      );

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => {
        if (d.type === 'project') return 25;
        if (d.type === 'shared') return 20;
        if (d.type === 'duplicate') return 18;
        return 15;
      })
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        onNodeClick?.(d);
      })
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);
        onNodeHover?.(d);

        // Highlight connected nodes and links
        link.attr('stroke-opacity', l =>
          l.source === d.id || l.target === d.id ? 1 : 0.1
        );

        node.select('circle').attr('opacity', n =>
          n.id === d.id || isConnected(d.id, n.id) ? 1 : 0.3
        );
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        onNodeHover?.(null);

        // Reset highlighting
        link.attr('stroke-opacity', 0.6);
        node.select('circle').attr('opacity', 1);
      });

    // Add labels to nodes
    node.append('text')
      .text(d => d.name)
      .attr('x', 0)
      .attr('y', d => {
        if (d.type === 'project') return 35;
        if (d.type === 'shared') return 30;
        return 28;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', d => d.type === 'project' ? '14px' : '12px')
      .attr('font-weight', d => d.type === 'project' ? 'bold' : 'normal')
      .attr('fill', '#e5e7eb')
      .style('pointer-events', 'none');

    // Add type badges
    node.filter(d => d.type !== 'project')
      .append('text')
      .text(d => {
        if (d.type === 'shared') return 'S';
        if (d.type === 'duplicate') return 'D';
        return '';
      })
      .attr('x', 15)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .style('pointer-events', 'none');

    // Helper function to check if nodes are connected
    function isConnected(a: string, b: string): boolean {
      return links.some(l =>
        (l.source === a && l.target === b) ||
        (l.source === b && l.target === a)
      );
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, onNodeClick, onNodeHover]);

  const getNodeColor = (node: GraphNode): string => {
    switch (node.type) {
      case 'project':
        return '#8b5cf6'; // Purple
      case 'shared':
        return '#f59e0b'; // Amber
      case 'duplicate':
        return '#ef4444'; // Red
      case 'dependency':
        return '#10b981'; // Green
      default:
        return '#6b7280'; // Gray
    }
  };

  return (
    <div className={styles.graphContainer}>
      <svg ref={svgRef} className={styles.svg} />

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Legend</div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#8b5cf6' }} />
          <span>Project</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#10b981' }} />
          <span>Dependency</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#f59e0b' }} />
          <span>Shared (S)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#ef4444' }} />
          <span>Duplicate (D)</span>
        </div>
      </div>

      {/* Node Info Panel */}
      {(selectedNode || hoveredNode) && (
        <div className={styles.infoPanel}>
          <h3>{(selectedNode || hoveredNode)?.name}</h3>
          <p>Type: {(selectedNode || hoveredNode)?.type}</p>
          {(selectedNode || hoveredNode)?.metadata && (
            <div className={styles.metadata}>
              {Object.entries((selectedNode || hoveredNode)!.metadata).map(([key, value]) => (
                <div key={key}>
                  <strong>{key}:</strong> {String(value)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
