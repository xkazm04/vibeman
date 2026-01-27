'use client';

import React from 'react';
import type { WorkspaceProjectNode, CrossProjectRelationship } from '../sub_WorkspaceArchitecture/lib/types';
import { INTEGRATION_COLORS, INTEGRATION_STYLES } from '../sub_WorkspaceArchitecture/lib/types';

interface MatrixCellInfoProps {
  selectedCell: { sourceId: string; targetId: string };
  sortedNodes: WorkspaceProjectNode[];
  matrix: Map<string, CrossProjectRelationship[]>;
}

export default function MatrixCellInfo({
  selectedCell,
  sortedNodes,
  matrix,
}: MatrixCellInfoProps) {
  const sourceName = sortedNodes.find((n) => n.id === selectedCell.sourceId)?.name;
  const targetName = sortedNodes.find((n) => n.id === selectedCell.targetId)?.name;
  const connections = matrix.get(`${selectedCell.sourceId}-${selectedCell.targetId}`) || [];

  return (
    <div className="mt-3 p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
      <div className="text-xs text-cyan-300 mb-3 font-medium">
        {sourceName}
        <span className="text-cyan-500 mx-2">→</span>
        {targetName}
      </div>
      <div className="space-y-3">
        {connections.map((conn) => (
          <div key={conn.id} className="bg-zinc-900/50 rounded-lg p-2.5">
            {/* Header with label and type */}
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: INTEGRATION_COLORS[conn.integrationType] }}
              />
              <span className="text-zinc-200 text-xs font-medium flex-1">{conn.label}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${INTEGRATION_COLORS[conn.integrationType]}20`,
                  color: INTEGRATION_COLORS[conn.integrationType],
                }}
              >
                {INTEGRATION_STYLES[conn.integrationType].shortLabel}
              </span>
            </div>

            {/* Details as bullet points */}
            {(conn.protocol || conn.dataFlow) && (
              <ul className="ml-4 space-y-1 text-[11px]">
                {conn.protocol && (
                  <li className="flex items-start gap-1.5">
                    <span className="text-zinc-600 mt-0.5">•</span>
                    <span className="text-zinc-500">Protocol:</span>
                    <code className="text-zinc-400 font-mono text-[10px] bg-zinc-800/50 px-1 rounded">
                      {conn.protocol}
                    </code>
                  </li>
                )}
                {conn.dataFlow && (
                  <li className="flex items-start gap-1.5">
                    <span className="text-zinc-600 mt-0.5">•</span>
                    <span className="text-zinc-500">Data:</span>
                    <span className="text-zinc-400">{conn.dataFlow}</span>
                  </li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
