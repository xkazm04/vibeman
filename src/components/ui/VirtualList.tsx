'use client';

import { ReactElement, ComponentType, CSSProperties } from 'react';
import { List as ReactWindowList } from 'react-window';

// Row component props type
export interface RowComponentProps<T = Record<string, unknown>> {
  index: number;
  style: CSSProperties;
  data?: T;
}

export interface VirtualListProps<T = Record<string, unknown>> {
  defaultHeight: number;
  rowCount: number;
  rowHeight: number;
  rowComponent: ComponentType<RowComponentProps<T>>;
  rowProps?: T;
  className?: string;
  'data-testid'?: string;
}

/**
 * Custom wrapper around react-window's List component
 * Provides a simplified API for virtualizing large lists
 */
export function List<T = Record<string, unknown>>({
  defaultHeight,
  rowCount,
  rowHeight,
  rowComponent,
  rowProps,
  className = '',
  'data-testid': dataTestId,
}: VirtualListProps<T>): ReactElement {
  return (
    <ReactWindowList
      defaultHeight={defaultHeight}
      rowCount={rowCount}
      rowHeight={rowHeight}
      rowComponent={rowComponent}
      rowProps={rowProps}
      className={className}
      data-testid={dataTestId}
    />
  );
}
