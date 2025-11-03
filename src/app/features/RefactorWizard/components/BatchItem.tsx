'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface BatchItemProps {
  batchNum: number;
  batchSize: number;
  startIdx: number;
  endIdx: number;
  isCreated: boolean;
  index: number;
}

export function BatchItem({
  batchNum,
  batchSize,
  startIdx,
  endIdx,
  isCreated,
  index,
}: BatchItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`p-3 rounded-lg border transition-all ${
        isCreated
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-gray-800/40 border-gray-700/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono ${
            isCreated
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
          }`}>
            {batchNum}
          </div>
          <div>
            <p className="text-white text-sm font-medium">
              Batch {batchNum}
            </p>
            <p className="text-gray-400 text-xs">
              {batchSize} issue{batchSize !== 1 ? 's' : ''} • Issues {startIdx + 1}-{endIdx}
            </p>
          </div>
        </div>
        {isCreated && (
          <CheckCircle className="w-5 h-5 text-green-400" />
        )}
      </div>
    </motion.div>
  );
}
