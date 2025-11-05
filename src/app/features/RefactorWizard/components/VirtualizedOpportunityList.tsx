'use client';

import { useMemo, CSSProperties, ReactElement } from 'react';
import { List } from 'react-window';
import { OpportunityCard } from './OpportunityCard';
import type { RefactorOpportunity } from '@/stores/refactorStore';

interface VirtualizedOpportunityListProps {
  opportunities: RefactorOpportunity[];
  selectedOpportunities: Set<string>;
  onToggle: (id: string) => void;
  height?: number;
  itemHeight?: number;
}

interface RowPropsData {
  opportunities: RefactorOpportunity[];
  selectedOpportunities: Set<string>;
  onToggle: (id: string) => void;
}

// Row component function - keyed by opportunity ID for optimal rendering
function OpportunityRow(props: {
  index: number;
  style: CSSProperties;
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
  opportunities: RefactorOpportunity[];
  selectedOpportunities: Set<string>;
  onToggle: (id: string) => void;
}): ReactElement {
  const { index, style, opportunities, selectedOpportunities, onToggle } = props;
  const opp = opportunities[index];

  return (
    <div style={{ ...style, paddingBottom: '12px' }}>
      <OpportunityCard
        key={opp.id}
        opportunity={opp}
        isSelected={selectedOpportunities.has(opp.id)}
        index={index}
        onToggle={() => onToggle(opp.id)}
      />
    </div>
  );
}

export function VirtualizedOpportunityList({
  opportunities,
  selectedOpportunities,
  onToggle,
  height = 400,
  itemHeight = 140,
}: VirtualizedOpportunityListProps) {
  // Memoize the row props to prevent unnecessary re-renders
  const rowProps = useMemo<RowPropsData>(
    () => ({
      opportunities,
      selectedOpportunities,
      onToggle,
    }),
    [opportunities, selectedOpportunities, onToggle]
  );

  return (
    <List
      defaultHeight={height}
      rowCount={opportunities.length}
      rowHeight={itemHeight}
      rowComponent={OpportunityRow}
      rowProps={rowProps}
      className="virtualized-opportunity-list pr-2"
      data-testid="virtualized-opportunities-list"
    />
  );
}
