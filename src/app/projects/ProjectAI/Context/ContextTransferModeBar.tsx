import React from 'react';
import { Zap } from 'lucide-react';

interface TransferModeBarProps {
  selectedFilesCount: number;
}

export default function TransferModeBar({ selectedFilesCount }: TransferModeBarProps) {
  return (
    <div className="px-6 py-3 bg-orange-500/10 border-b border-orange-500/30">
      <div className="flex items-center space-x-2 text-orange-400">
        <Zap className="w-4 h-4" />
        <span className="font-medium">Transfer Mode Active</span>
        <span className="text-orange-300">
          - Click on any context to move {selectedFilesCount} selected file{selectedFilesCount > 1 ? 's' : ''} there
        </span>
      </div>
    </div>
  );
}