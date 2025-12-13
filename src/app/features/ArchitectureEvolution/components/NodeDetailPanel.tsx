'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Box,
  GitBranch,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Code,
  Layers,
  Activity,
} from 'lucide-react';
import { DbArchitectureNode, DbArchitectureEdge } from '@/app/db/models/architecture-graph.types';

interface NodeDetailPanelProps {
  node: DbArchitectureNode | null;
  allNodes: DbArchitectureNode[];
  edges: DbArchitectureEdge[];
  onClose: () => void;
}

export default function NodeDetailPanel({
  node,
  allNodes,
  edges,
  onClose,
}: NodeDetailPanelProps) {
  if (!node) return null;

  // Get connections
  const outgoingEdges = edges.filter((e) => e.source_node_id === node.id);
  const incomingEdges = edges.filter((e) => e.target_node_id === node.id);

  const outgoingNodes = outgoingEdges
    .map((e) => allNodes.find((n) => n.id === e.target_node_id))
    .filter(Boolean) as DbArchitectureNode[];

  const incomingNodes = incomingEdges
    .map((e) => allNodes.find((n) => n.id === e.source_node_id))
    .filter(Boolean) as DbArchitectureNode[];

  const isInCircular = edges.some(
    (e) =>
      e.is_circular === 1 &&
      (e.source_node_id === node.id || e.target_node_id === node.id)
  );

  // Metric bar component
  const MetricBar = ({
    label,
    value,
    color,
  }: {
    label: string;
    value: number;
    color: string;
  }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-medium text-white">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        className="absolute right-4 top-4 bottom-4 w-80 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden z-30"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        data-testid="node-detail-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <Box className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{node.name}</h3>
              <p className="text-xs text-gray-400">{node.node_type}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
            data-testid="close-node-detail-btn"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Path */}
          <div className="space-y-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Path</span>
            <p className="text-xs text-gray-300 font-mono bg-gray-800/50 px-2 py-1.5 rounded break-all">
              {node.path}
            </p>
          </div>

          {/* Layer & Type */}
          <div className="flex items-center gap-2">
            {node.layer && (
              <span className="px-2 py-1 text-xs rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Layers className="w-3 h-3 inline mr-1" />
                {node.layer}
              </span>
            )}
            <span className="px-2 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Code className="w-3 h-3 inline mr-1" />
              {node.node_type}
            </span>
          </div>

          {/* Warnings */}
          {(isInCircular || node.coupling_score > 70) && (
            <div className="space-y-2">
              {isInCircular && (
                <div className="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/30">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-red-400">Circular Dependency</p>
                    <p className="text-xs text-gray-400">Part of a dependency cycle</p>
                  </div>
                </div>
              )}
              {node.coupling_score > 70 && (
                <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <Activity className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-400">High Coupling</p>
                    <p className="text-xs text-gray-400">Consider refactoring</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metrics */}
          <div className="space-y-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Metrics</span>
            <MetricBar label="Complexity" value={node.complexity_score} color="#ef4444" />
            <MetricBar label="Coupling" value={node.coupling_score} color="#f59e0b" />
            <MetricBar label="Stability" value={node.stability_score} color="#22c55e" />
            <MetricBar label="Cohesion" value={node.cohesion_score} color="#06b6d4" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-white">{node.loc}</p>
              <p className="text-xs text-gray-500">Lines</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-cyan-400">{node.incoming_count}</p>
              <p className="text-xs text-gray-500">Dependents</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-purple-400">{node.outgoing_count}</p>
              <p className="text-xs text-gray-500">Dependencies</p>
            </div>
          </div>

          {/* Dependencies */}
          {outgoingNodes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  Dependencies ({outgoingNodes.length})
                </span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {outgoingNodes.slice(0, 10).map((dep) => {
                  const edge = outgoingEdges.find((e) => e.target_node_id === dep.id);
                  return (
                    <div
                      key={dep.id}
                      className={`text-xs px-2 py-1.5 rounded flex items-center justify-between ${
                        edge?.is_circular === 1
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-gray-800/50 text-gray-300'
                      }`}
                    >
                      <span className="truncate">{dep.name}</span>
                      {edge?.is_circular === 1 && (
                        <GitBranch className="w-3 h-3 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
                {outgoingNodes.length > 10 && (
                  <p className="text-xs text-gray-500 text-center py-1">
                    +{outgoingNodes.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Dependents */}
          {incomingNodes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  Dependents ({incomingNodes.length})
                </span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {incomingNodes.slice(0, 10).map((dep) => {
                  const edge = incomingEdges.find((e) => e.source_node_id === dep.id);
                  return (
                    <div
                      key={dep.id}
                      className={`text-xs px-2 py-1.5 rounded flex items-center justify-between ${
                        edge?.is_circular === 1
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-gray-800/50 text-gray-300'
                      }`}
                    >
                      <span className="truncate">{dep.name}</span>
                      {edge?.is_circular === 1 && (
                        <GitBranch className="w-3 h-3 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
                {incomingNodes.length > 10 && (
                  <p className="text-xs text-gray-500 text-center py-1">
                    +{incomingNodes.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
