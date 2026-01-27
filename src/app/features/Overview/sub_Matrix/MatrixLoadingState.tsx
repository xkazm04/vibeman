'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface MatrixLoadingStateProps {
  message?: string;
}

const MatrixLoadingState = forwardRef<HTMLDivElement, MatrixLoadingStateProps>(
  ({ message = 'Loading architecture data...' }, ref) => {
    return (
      <div
        ref={ref}
        className="relative w-full h-full bg-[#0a0a0c] flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm text-zinc-500">{message}</span>
        </div>
      </div>
    );
  }
);

MatrixLoadingState.displayName = 'MatrixLoadingState';

export default MatrixLoadingState;
