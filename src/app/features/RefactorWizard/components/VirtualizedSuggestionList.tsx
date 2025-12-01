'use client';

import { useMemo, ReactElement } from 'react';
import { List, RowComponentProps } from '@/components/ui/VirtualList';
import CompactSuggestionRow from './rows/CompactSuggestionRow';
import type { RefactorOpportunity } from '@/stores/refactorStore';

interface VirtualizedSuggestionListProps {
  opportunities: RefactorOpportunity[];
  height?: number;
  itemHeight?: number;
}

interface RowPropsData {
  opportunities: RefactorOpportunity[];
}

/**
 * Row component function - keyed by opportunity ID for optimal rendering
 * Memoized to prevent unnecessary re-renders
 */
function SuggestionRow(props: RowComponentProps<RowPropsData>): ReactElement {
  const { index, style, data } = props;
  const { opportunities } = data!;
  const opp = opportunities[index];

  return (
    <div style={style}>
      <CompactSuggestionRow opportunity={opp} />
    </div>
  );
}

/**
 * Virtualized list component for displaying refactor suggestions
 * Uses react-window for efficient rendering of large lists
 */
export function VirtualizedSuggestionList({
  opportunities,
  height = 500,
  itemHeight = 120,
}: VirtualizedSuggestionListProps) {
  // Memoize the row props to prevent unnecessary re-renders
  const rowProps = useMemo<RowPropsData>(
    () => ({
      opportunities,
    }),
    [opportunities]
  );

  return (
    <List
      defaultHeight={height}
      rowCount={opportunities.length}
      rowHeight={itemHeight}
      rowComponent={SuggestionRow}
      rowProps={rowProps}
      getItemKey={(index) => rowProps.opportunities[index].id}
      className="virtualized-suggestion-list pr-2"
      data-testid="virtualized-suggestions-list"
    />
  );
}
