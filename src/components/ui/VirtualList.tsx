'use client';

import { ReactElement, ComponentType, CSSProperties } from 'react';
import { List as ReactWindowList } from 'react-window';

export interface VirtualListProps<T = any> {
  defaultHeight: number;
  rowCount: number;
  rowHeight: number;
  rowComponent: ComponentType<{
    index: number;
    style: CSSProperties;
    [key: string]: any;
  }>;
  rowProps?: T;
  className?: string;
  'data-testid'?: string;
}

/**
 * Custom wrapper around react-window's List component
 * Provides a simplified API for virtualizing large lists
 */
export function List<T = any>({
  defaultHeight,
  rowCount,
  rowHeight,
  rowComponent,
  rowProps = {} as T,
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
