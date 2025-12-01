'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactElement, ComponentType, CSSProperties } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import react-window to avoid SSR issues
// Note: react-window v2 uses named export 'List' instead of 'FixedSizeList'
const ReactWindowList = dynamic(
  () => import('react-window').then((mod) => mod.List),
  { ssr: false }
) as any;

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
  getItemKey?: (index: number) => string | number;
}

/**
 * Custom wrapper around react-window's FixedSizeList component
 * Provides a simplified API for virtualizing large lists
 */
export function List<T = Record<string, unknown>>({
  defaultHeight,
  rowCount,
  rowHeight,
  rowComponent: RowComponent,
  rowProps,
  className = '',
  'data-testid': dataTestId,
  getItemKey,
}: VirtualListProps<T>): ReactElement {
  return (
    <ReactWindowList
      height={defaultHeight}
      width="100%"
      itemCount={rowCount}
      itemSize={rowHeight}
      className={className}
      data-testid={dataTestId}
      itemKey={getItemKey}
    >
      {({ index, style }: { index: number; style: CSSProperties }) => (
        <RowComponent index={index} style={style} data={rowProps} />
      )}
    </ReactWindowList>
  );
}
