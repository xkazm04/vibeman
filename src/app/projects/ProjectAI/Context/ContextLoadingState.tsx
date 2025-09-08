import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface LoadingStateProps {
  onBack: () => void;
}

export default function LoadingState({ onBack }: LoadingStateProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">Context Scanner</h2>
            <p className="text-sm text-gray-400">Analyzing codebase and generating feature contexts...</p>
          </div>
        </div>
      </div>

      {/* Loading Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-white mb-2">Scanning Codebase</h3>
          <p className="text-gray-400 max-w-md">
            Analyzing your project structure and grouping files into logical feature contexts...
          </p>
        </div>
      </div>
    </div>
  );
}