/**
 * FooterNavigation Component
 * Bottom navigation bar with previous/next controls
 */

'use client';

import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface FooterNavigationProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  isLastStep: boolean;
  onPrevious: () => void;
  onConfirm: () => void;
  onStepClick: (index: number) => void;
}

export function FooterNavigation({
  currentStep,
  totalSteps,
  completedSteps,
  isLastStep,
  onPrevious,
  onConfirm,
  onStepClick,
}: FooterNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, index) => (
              <button
                key={index}
                onClick={() => onStepClick(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-purple-500 w-6'
                    : completedSteps.has(index)
                    ? 'bg-emerald-500'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>

          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-medium transition-all"
          >
            {isLastStep ? (
              <>
                Complete
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                Confirm & Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
