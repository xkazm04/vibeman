'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, X } from 'lucide-react';
import type { WorkspaceProjectNode, CrossProjectRelationship, IntegrationType } from '../sub_WorkspaceArchitecture/lib/types';
import MatrixFilterChips from './MatrixFilterChips';
import MatrixGrid from './MatrixGrid';
import MatrixCellInfo from './MatrixCellInfo';

interface MatrixPanelProps {
  sortedNodes: WorkspaceProjectNode[];
  matrix: Map<string, CrossProjectRelationship[]>;
  availableIntegrationTypes: IntegrationType[];
  filterTypes: Set<IntegrationType>;
  selectedCell: { sourceId: string; targetId: string } | null;
  hoveredCell: { sourceId: string; targetId: string } | null;
  panelWidth: number;
  contentWidth: number;
  contentHeight: number;
  onClose: () => void;
  onToggleFilter: (type: IntegrationType) => void;
  onCellHover: (cell: { sourceId: string; targetId: string } | null) => void;
  onCellSelect: (cell: { sourceId: string; targetId: string } | null) => void;
}

export default function MatrixPanel({
  sortedNodes,
  matrix,
  availableIntegrationTypes,
  filterTypes,
  selectedCell,
  hoveredCell,
  panelWidth,
  contentWidth,
  contentHeight,
  onClose,
  onToggleFilter,
  onCellHover,
  onCellSelect,
}: MatrixPanelProps) {
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: panelWidth, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full border-r border-cyan-500/20 bg-[#0a0a0c]/80 backdrop-blur-sm overflow-auto flex-shrink-0 relative z-10"
      style={{ maxWidth: '60%' }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-cyan-400" />
            <span className="tracking-wide">Connection Matrix</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800/80 rounded-lg transition-all duration-200 hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 group"
          >
            <X className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors duration-200" />
          </button>
        </div>

        <MatrixFilterChips
          availableTypes={availableIntegrationTypes}
          activeFilters={filterTypes}
          onToggle={onToggleFilter}
        />

        <MatrixGrid
          sortedNodes={sortedNodes}
          matrix={matrix}
          filterTypes={filterTypes}
          selectedCell={selectedCell}
          hoveredCell={hoveredCell}
          onCellHover={onCellHover}
          onCellSelect={onCellSelect}
          contentWidth={contentWidth}
          contentHeight={contentHeight}
        />

        {selectedCell && (
          <MatrixCellInfo
            selectedCell={selectedCell}
            sortedNodes={sortedNodes}
            matrix={matrix}
          />
        )}
      </div>
    </motion.div>
  );
}
