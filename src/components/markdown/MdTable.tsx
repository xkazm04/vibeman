import React from 'react';
import { motion } from 'framer-motion';

interface MdTableProps {
  content: string;
  renderInlineContent: (text: string) => React.ReactElement;
}

interface TableData {
  headers: string[];
  rows: string[][];
  alignments: ('left' | 'center' | 'right')[];
}

export default function MdTable({ content, renderInlineContent }: MdTableProps) {
  const parseTable = (tableContent: string): TableData => {
    const lines = tableContent.trim().split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return { headers: [], rows: [], alignments: [] };
    }

    // Parse headers
    const headerLine = lines[0];
    const headers = headerLine.split('|').map(cell => cell.trim()).filter(cell => cell);

    // Parse alignment line
    const alignmentLine = lines[1];
    const alignments = alignmentLine.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell)
      .map(cell => {
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
        if (cell.endsWith(':')) return 'right';
        return 'left';
      });

    // Parse data rows
    const rows = lines.slice(2).map(line => 
      line.split('|').map(cell => cell.trim()).filter(cell => cell)
    );

    return { headers, rows, alignments };
  };

  const { headers, rows, alignments } = parseTable(content);

  if (headers.length === 0) {
    return null;
  }

  const getAlignmentClass = (alignment: 'left' | 'center' | 'right') => {
    switch (alignment) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="my-6 overflow-x-auto"
    >
      <div className="inline-block min-w-full">
        <table className="min-w-full border border-gray-700 rounded-lg overflow-hidden bg-gray-900/50 backdrop-blur-sm">
          <thead>
            <tr className="bg-gray-800/80 border-b border-gray-700">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className={`
                    px-4 py-3 font-semibold text-gray-200 text-sm
                    ${getAlignmentClass(alignments[index] || 'left')}
                    ${index === 0 ? 'rounded-tl-lg' : ''}
                    ${index === headers.length - 1 ? 'rounded-tr-lg' : ''}
                    border-r border-gray-700 last:border-r-0
                  `}
                >
                  {renderInlineContent(header)}
                </th>
              ))}
            </tr>
          </thead>
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
                className={`
                  border-b border-gray-700/50 last:border-b-0
                  hover:bg-gray-800/30 transition-colors duration-200
                  ${rowIndex % 2 === 0 ? 'bg-gray-900/20' : 'bg-gray-800/10'}
                `}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`
                      px-4 py-3 text-gray-300 text-sm leading-relaxed
                      ${getAlignmentClass(alignments[cellIndex] || 'left')}
                      border-r border-gray-700/30 last:border-r-0
                      ${rowIndex === rows.length - 1 && cellIndex === 0 ? 'rounded-bl-lg' : ''}
                      ${rowIndex === rows.length - 1 && cellIndex === row.length - 1 ? 'rounded-br-lg' : ''}
                    `}
                  >
                    {renderInlineContent(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Table info */}
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <span>{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
        <span>{headers.length} column{headers.length !== 1 ? 's' : ''}</span>
      </div>
    </motion.div>
  );
}