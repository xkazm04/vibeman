'use client';

import React, { forwardRef } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface MatrixErrorStateProps {
  error: string;
  onRetry: () => void;
}

const MatrixErrorState = forwardRef<HTMLDivElement, MatrixErrorStateProps>(
  ({ error, onRetry }, ref) => {
    return (
      <div
        ref={ref}
        className="relative w-full h-full bg-[#0a0a0c] flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">
              Failed to Load Architecture
            </h3>
            <p className="text-sm text-zinc-500 mb-4">{error}</p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
);

MatrixErrorState.displayName = 'MatrixErrorState';

export default MatrixErrorState;
