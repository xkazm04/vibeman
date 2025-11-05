'use client';

import { ArrowLeft, ArrowRight, LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface WizardActionsProps {
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  backIcon?: LucideIcon;
  nextIcon?: LucideIcon;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  nextLoading?: boolean;
  customActions?: ReactNode;
  className?: string;
  nextVariant?: 'primary' | 'success' | 'warning';
}

/**
 * WizardActions - Navigation buttons for wizard steps
 *
 * Features:
 * - Back and Next buttons with icons
 * - Disabled and loading states
 * - Custom action insertion
 * - Gradient primary button
 */
export default function WizardActions({
  onBack,
  onNext,
  backLabel = 'Back',
  nextLabel = 'Next',
  backIcon: BackIcon = ArrowLeft,
  nextIcon: NextIcon = ArrowRight,
  nextDisabled = false,
  backDisabled = false,
  nextLoading = false,
  customActions,
  className = '',
  nextVariant = 'primary',
}: WizardActionsProps) {
  const nextVariants = {
    primary: 'from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-cyan-500/30',
    success: 'from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 shadow-green-500/30',
    warning: 'from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 shadow-yellow-500/30',
  };

  return (
    <div className={`flex items-center justify-between gap-4 pt-4 border-t border-white/10 ${className}`}>
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          disabled={backDisabled}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          data-testid="wizard-back-button"
        >
          <BackIcon className="w-5 h-5" />
          <span>{backLabel}</span>
        </button>
      )}

      {/* Custom Actions (middle) */}
      {customActions && (
        <div className="flex-1 flex items-center justify-center">
          {customActions}
        </div>
      )}

      {/* Next Button */}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
          className={`px-6 py-3 bg-gradient-to-r ${nextVariants[nextVariant]} disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-lg disabled:shadow-none flex items-center space-x-2 ${!onBack ? 'ml-auto' : ''}`}
          data-testid="wizard-next-button"
        >
          {nextLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>{nextLabel}</span>
              <NextIcon className="w-5 h-5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
