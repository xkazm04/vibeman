'use client';

import { ArrowRight, ArrowLeft, Package, Zap } from 'lucide-react';

/**
 * Props for ReviewActionBar component
 */
export interface ReviewActionBarProps {
  selectedCount: number;
  onBack: () => void;
  onContinue: () => void;
  onSkipPackaging: () => void;
}

/**
 * ReviewActionBar - Bottom action bar for ReviewStep
 * 
 * Includes:
 * - Selection count display
 * - Quick Export button (skip AI packaging)
 * - AI Packaging button (continue to package step)
 * - Top navigation with Back and Continue buttons
 */
export function ReviewActionBar({
  selectedCount,
  onBack,
  onContinue,
  onSkipPackaging,
}: ReviewActionBarProps) {
  const filesCount = Math.ceil(selectedCount / 20);

  return (
    <>
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          data-testid="review-back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onSkipPackaging}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="skip-packaging-button"
            title="Create requirement files directly without AI packaging (max 20 issues per file)"
          >
            <Zap className="w-4 h-4" />
            Quick Export
          </button>
          <button
            onClick={onContinue}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="continue-to-package-top"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * ReviewBottomBar - Bottom action bar with selection info and action buttons
 */
export interface ReviewBottomBarProps {
  selectedCount: number;
  onContinue: () => void;
  onSkipPackaging: () => void;
}

export function ReviewBottomBar({
  selectedCount,
  onContinue,
  onSkipPackaging,
}: ReviewBottomBarProps) {
  const filesCount = Math.ceil(selectedCount / 20);

  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
      <p className="text-gray-500 text-sm">
        {selectedCount > 0
          ? `${selectedCount} opportunities selected`
          : 'Select opportunities to continue'}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onSkipPackaging}
          disabled={selectedCount === 0}
          className="px-4 py-2 text-sm text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title="Skip AI packaging and batch opportunities into requirement files (max 20 per file)"
        >
          <Zap className="w-4 h-4" />
          Quick Export ({filesCount} files)
        </button>
        <button
          onClick={onContinue}
          disabled={selectedCount === 0}
          className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none flex items-center gap-2"
          data-testid="continue-to-package"
        >
          <Package className="w-4 h-4" />
          AI Packaging
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
