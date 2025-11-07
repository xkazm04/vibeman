import React from 'react';
import { motion } from 'framer-motion';

interface MdTableProps {
  headers: string[];
  rows: string[][];
  renderInlineContent: (text: string) => React.ReactElement;
}

// Helper to get header cell classes
const getHeaderCellClasses = (index: number, headersLength: number): string => {
  const baseClasses = 'px-4 py-3 font-semibold text-gray-200 text-sm text-left border-r border-gray-700 last:border-r-0';
  const cornerClass = index === 0 ? 'rounded-tl-lg' : index === headersLength - 1 ? 'rounded-tr-lg' : '';
  return `${baseClasses} ${cornerClass}`;
};

// Helper to get row classes
const getRowClasses = (rowIndex: number): string => {
  const baseClasses = 'border-b border-gray-700/50 last:border-b-0 hover:bg-gray-800/30 transition-colors duration-200';
  const bgClass = rowIndex % 2 === 0 ? 'bg-gray-900/20' : 'bg-gray-800/10';
  return `${baseClasses} ${bgClass}`;
};

// Helper to get cell classes
const getCellClasses = (rowIndex: number, cellIndex: number, rowsLength: number, cellsLength: number): string => {
  const baseClasses = 'px-4 py-3 text-gray-300 text-sm leading-relaxed text-left border-r border-gray-700/30 last:border-r-0';
  const isLastRow = rowIndex === rowsLength - 1;
  const cornerClass = isLastRow && cellIndex === 0 ? 'rounded-bl-lg' : isLastRow && cellIndex === cellsLength - 1 ? 'rounded-br-lg' : '';
  return `${baseClasses} ${cornerClass}`;
};

// Header row component
interface TableHeaderProps {
  headers: string[];
  renderInlineContent: (text: string) => React.ReactElement;
}

function TableHeader({ headers, renderInlineContent }: TableHeaderProps) {
  return (
    <thead>
      <tr className="bg-gray-800/80 border-b border-gray-700">
        {headers.map((header, index) => (
          <th
            key={index}
            className={getHeaderCellClasses(index, headers.length)}
          >
            {renderInlineContent(header)}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// Table body component
interface TableBodyProps {
  rows: string[][];
  renderInlineContent: (text: string) => React.ReactElement;
}

function TableBody({ rows, renderInlineContent }: TableBodyProps) {
  return (
    <tbody>
      {rows.map((row, rowIndex) => (
        <motion.tr
          key={rowIndex}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.3,
            delay: rowIndex * 0.05
          }}
          className={getRowClasses(rowIndex)}
        >
          {row.map((cell, cellIndex) => (
            <td
              key={cellIndex}
              className={getCellClasses(rowIndex, cellIndex, rows.length, row.length)}
            >
              {renderInlineContent(cell)}
            </td>
          ))}
        </motion.tr>
      ))}
    </tbody>
  );
}

// Table info component
interface TableInfoProps {
  rowCount: number;
  columnCount: number;
}

function TableInfo({ rowCount, columnCount }: TableInfoProps) {
  return (
    <div className="mt-2 text-sm text-gray-500 flex items-center justify-between">
      <span>{rowCount} row{rowCount !== 1 ? 's' : ''}</span>
      <span>{columnCount} column{columnCount !== 1 ? 's' : ''}</span>
    </div>
  );
}

export default function MdTable({ headers, rows, renderInlineContent }: MdTableProps) {
  if (headers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="my-6 overflow-x-auto"
    >
      <div className="inline-block min-w-full">
        <table className="min-w-full border border-gray-700 rounded-lg overflow-hidden bg-gray-900/50 backdrop-blur-sm shadow-lg">
          <TableHeader headers={headers} renderInlineContent={renderInlineContent} />
          <TableBody rows={rows} renderInlineContent={renderInlineContent} />
        </table>
      </div>

      <TableInfo rowCount={rows.length} columnCount={headers.length} />
    </motion.div>
  );
}