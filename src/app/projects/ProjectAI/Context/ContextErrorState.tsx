import React from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onBack: () => void;
}

export default function ErrorState({ error, onBack }: ErrorStateProps) {
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
            <p className="text-sm text-gray-400">Failed to generate context files</p>
          </div>
        </div>
      </div>

      {/* Error Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Generation Failed</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}