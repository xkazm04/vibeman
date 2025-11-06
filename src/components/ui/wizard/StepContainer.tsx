'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorOverlay } from './ErrorOverlay';

interface StepContainerProps {
  /** Content to display inside the step */
  children: ReactNode;
  /** Loading state - shows skeleton when true */
  isLoading?: boolean;
  /** Error state - shows overlay when provided */
  error?: string | null;
  /** Callback when error overlay is dismissed */
  onErrorDismiss?: () => void;
  /** Enable focus trap (default: true) */
  enableFocusTrap?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for automated testing */
  'data-testid'?: string;
}

/**
 * StepContainer - Accessible step wrapper with focus trap & animations
 *
 * A reusable container that wraps wizard step content with:
 * - Automatic focus trap for accessibility
 * - Loading skeleton during async operations
 * - Error overlay with dismiss functionality
 * - Smooth Framer Motion entrance/exit transitions
 * - Optional header with title, icon, and progress badge
 *
 * @example
 * ```tsx
 * <StepContainer
 *   title="Review Opportunities"
 *   icon={CheckCircle}
 *   currentStep={2}
 *   totalSteps={4}
 *   isLoading={isScanning}
 *   error={scanError}
 *   onErrorDismiss={() => setError(null)}
 * >
 *   <div>Your step content here</div>
 * </StepContainer>
 * ```
 */
export default function StepContainer({
  children,
  isLoading = false,
  error = null,
  onErrorDismiss,
  enableFocusTrap = true,
  className = '',
  'data-testid': testId = 'step-container',
}: StepContainerProps) {
  const containerContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`relative space-y-6 ${className}`}
      data-testid={testId}
    >
      {/* Loading Skeleton */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingSkeleton key="skeleton" data-testid={`${testId}-loading`} />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Overlay */}
      <AnimatePresence>
        {error && (
          <ErrorOverlay
            error={error}
            onDismiss={onErrorDismiss}
            data-testid={`${testId}-error`}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );

  // Wrap with focus trap if enabled
  if (enableFocusTrap) {
    return (
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          escapeDeactivates: true,
          fallbackFocus: `[data-testid="${testId}"]`,
        }}
      >
        {containerContent}
      </FocusTrap>
    );
  }

  return containerContent;
}
