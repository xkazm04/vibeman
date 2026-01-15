'use client';

import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { TableColumn, TableStat, statColors } from './types';
import { TableEmptyState } from './TableEmptyState';

interface DataTableProps<T> {
  /** Array of data items */
  items: T[];
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Unique key extractor for each item */
  keyExtractor: (item: T) => string;
  /** Custom row renderer */
  renderRow: (item: T, index: number) => ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Statistics to display above table */
  stats?: TableStat[];
  /** Empty state configuration */
  emptyState?: {
    icons?: React.ComponentType<{ className?: string }>[];
    title: string;
    description?: string;
  };
  /** Additional class for the container */
  className?: string;
}

/**
 * DataTable - Reusable animated table component
 *
 * Features:
 * - Glassmorphic design with backdrop blur
 * - Animated row entrance with stagger
 * - Stats bar with color-coded metrics
 * - Loading state with spinner
 * - Empty state with floating icons
 * - Responsive design
 */
export function DataTable<T>({
  items,
  columns,
  keyExtractor,
  renderRow,
  loading = false,
  stats,
  emptyState,
  className = '',
}: DataTableProps<T>) {
  // Loading state
  if (loading) {
    return (
      <motion.div
        className="flex items-center justify-center py-16 text-gray-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-6 h-6 mr-3" />
        </motion.div>
        <span>Loading...</span>
      </motion.div>
    );
  }

  // Empty state
  if (items.length === 0 && emptyState) {
    return (
      <TableEmptyState
        icons={emptyState.icons as any}
        title={emptyState.title}
        description={emptyState.description}
      />
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Stats bar */}
      {stats && stats.length > 0 && (
        <motion.div
          className="flex items-center gap-4 text-xs text-gray-400"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {stats.map((stat, idx) => (
            <motion.span
              key={stat.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <span className={`font-medium ${statColors[stat.colorScheme]}`}>
                {stat.value}
              </span>{' '}
              {stat.label}
            </motion.span>
          ))}
        </motion.div>
      )}

      {/* Table container */}
      <motion.div
        className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/40 overflow-hidden shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead>
              <tr className="border-b border-gray-700/50 bg-gray-900/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`
                      py-3 px-4 text-xs font-semibold text-gray-400
                      uppercase tracking-wider
                      ${col.width || ''}
                      ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                    `}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              <AnimatePresence mode="popLayout" initial={false}>
                {items.map((item, index) => (
                  <React.Fragment key={keyExtractor(item)}>
                    {renderRow(item, index)}
                  </React.Fragment>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

export default DataTable;
