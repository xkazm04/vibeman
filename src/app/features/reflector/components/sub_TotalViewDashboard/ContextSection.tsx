'use client';

import React, { useState, useRef, useEffect, ReactElement, CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { List, RowComponentProps } from 'react-window';
import { DbIdea } from '@/app/db';
import { ContextGroup } from '../../lib/groupIdeasByProjectAndContext';
import { IdeaCard } from './IdeaCard';

interface ContextSectionProps {
  context: ContextGroup;
  index: number;
}

// Row props type for react-window (only custom props, not ariaAttributes/index/style)
interface VirtualRowProps {
  ideas: DbIdea[];
  itemsPerRow: number;
  contextColor: string;
}

// Row component that matches react-window v2 API
// ariaAttributes, index, and style are passed automatically by List
function VirtualRow(props: RowComponentProps<VirtualRowProps>): ReactElement {
  const { index: rowIndex, style, ideas, itemsPerRow, contextColor } = props;
  const startIdx = rowIndex * itemsPerRow;
  const rowIdeas = ideas.slice(startIdx, startIdx + itemsPerRow);

  return (
    <div style={style} className="px-4 pb-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rowIdeas.map((idea, colIndex) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            index={startIdx + colIndex}
            accentColor={contextColor}
          />
        ))}
      </div>
    </div>
  );
}

export function ContextSection({ context, index }: ContextSectionProps) {
  const contextColor = context.contextColor || '#6B7280';
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);
  const [itemsPerRow, setItemsPerRow] = useState(3);

  // Calculate grid layout
  useEffect(() => {
    const updateLayout = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth - 32; // minus padding
        // Responsive columns: 1 on mobile, 2 on tablet, 3 on desktop
        let columns = 3;
        if (width < 768) columns = 1;
        else if (width < 1024) columns = 2;

        setItemsPerRow(columns);

        // Calculate height: show ~3 rows at a time, with a minimum of 400px
        const rowCount = Math.ceil(context.ideas.length / columns);
        const maxVisibleRows = 3;
        const visibleRows = Math.min(rowCount, maxVisibleRows);
        const calculatedHeight = Math.max(400, visibleRows * 200); // 200px per row
        setListHeight(Math.min(calculatedHeight, 600)); // max 600px
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [context.ideas.length]);

  // Use threshold to decide virtualization
  const shouldVirtualize = context.ideas.length > 20;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-gray-800/40 border border-gray-700/40 rounded-lg overflow-hidden"
      style={{
        borderColor: `${contextColor}40`,
      }}
      data-testid={`context-section-${context.contextId || 'uncategorized'}`}
    >
      {/* Context Header */}
      <div
        className="px-4 py-3 border-b border-gray-700/40"
        style={{
          background: `linear-gradient(to right, ${contextColor}15, ${contextColor}05)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: contextColor }}
            />
            <h4 className="text-sm font-semibold text-gray-200">{context.contextName}</h4>
          </div>
          <span className="text-sm text-gray-400">
            {context.count} {context.count === 1 ? 'idea' : 'ideas'}
          </span>
        </div>
      </div>

      {/* Ideas Grid - Virtualized or Standard */}
      <div ref={containerRef}>
        {shouldVirtualize ? (
          <List<VirtualRowProps>
            defaultHeight={listHeight}
            rowCount={Math.ceil(context.ideas.length / itemsPerRow)}
            rowHeight={200}
            overscanCount={2}
            rowComponent={VirtualRow}
            rowProps={{
              ideas: context.ideas,
              itemsPerRow,
              contextColor,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {context.ideas.map((idea, ideaIndex) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                index={ideaIndex}
                accentColor={contextColor}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
