'use client';

import { CheckCircle, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { CyberCard } from '@/components/ui/wizard';

export interface ExecuteBreakdownItem {
  id: string;
  name: string;
  issueCount: number;
  fileCount: number;
  category?: string;
  impact?: string;
  executionOrder?: number;
}

export interface ExecuteBreakdownProps {
  isDirectMode: boolean;
  items: ExecuteBreakdownItem[];
  createdFiles: string[];
}

/**
 * ExecuteBreakdown - Displays package/batch breakdown list with creation status.
 * 
 * Handles both direct mode (batches) and package mode display.
 * Shows checkmarks for items that have been successfully created.
 */
export function ExecuteBreakdown({ isDirectMode, items, createdFiles }: ExecuteBreakdownProps) {
  return (
    <CyberCard variant="dark" data-testid="package-breakdown-card">
      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
        <Package className="w-4 h-4 text-cyan-400" />
        {isDirectMode ? 'Batch Breakdown' : 'Package Breakdown'}
      </h4>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-2" data-testid="package-list">
        {items.map((item, index) => {
          const isCreated = createdFiles.length > index;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3 rounded-lg border transition-all ${
                isCreated
                  ? 'bg-green-500/5 border-green-500/30'
                  : 'bg-white/5 border-white/10'
              }`}
              data-testid={isDirectMode ? `batch-item-${index}` : `package-item-${index}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                      {isDirectMode ? `Batch ${index + 1}` : `#${item.executionOrder}`}
                    </span>
                    <span className="text-white font-medium text-sm">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{item.issueCount} issues</span>
                    <span>•</span>
                    {isDirectMode ? (
                      <span>{item.fileCount} files</span>
                    ) : (
                      <>
                        <span className="capitalize">{item.category}</span>
                        <span>•</span>
                        <span className="capitalize">{item.impact} impact</span>
                      </>
                    )}
                  </div>
                </div>
                {isCreated && (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </CyberCard>
  );
}
