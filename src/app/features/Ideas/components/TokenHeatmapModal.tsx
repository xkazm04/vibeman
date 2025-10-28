'use client';

import React from 'react';
import { X, Calendar } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import TokenHeatmap from './TokenHeatmap';

interface TokenHeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export default function TokenHeatmapModal({ isOpen, onClose, projectId }: TokenHeatmapModalProps) {
  const [daysBack, setDaysBack] = React.useState(7);

  const timeRangeOptions = [
    { label: '7 Days', value: 7 },
    { label: '14 Days', value: 14 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 }
  ];

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Token Usage Analytics</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Visualize LLM token consumption across scans and time periods
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Time Range Selector */}
      <div className="px-6 pt-4 pb-2 bg-gray-800/30">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Time Range:</span>
          <div className="flex gap-2">
            {timeRangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setDaysBack(option.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  daysBack === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[70vh]">
        <TokenHeatmap projectId={projectId} daysBack={daysBack} />
      </div>
    </BaseModal>
  );
}
