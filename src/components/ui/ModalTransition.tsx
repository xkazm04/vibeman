import React from 'react';
import { motion, AnimatePresence, Variants, Transition } from 'framer-motion';

/**
 * Predefined animation variants for modal transitions
 */
export const modalVariants = {
  // Default: Scale and fade from center
  default: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    modal: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
    },
  },

  // Spring: Bouncy spring animation
  spring: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    modal: {
      initial: { opacity: 0, scale: 0.9, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.9, y: 20 },
    },
  },

  // Slide from bottom
  slideUp: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    modal: {
      initial: { opacity: 0, y: 100 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 100 },
    },
  },

  // Slide from top
  slideDown: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    modal: {
      initial: { opacity: 0, y: -100 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -100 },
    },
  },

  // Fade only (no scale or movement)
  fade: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    modal: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },

  // Scale from center (no vertical movement)
  scale: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    modal: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 },
    },
  },
} as const;

export type ModalVariant = keyof typeof modalVariants;

/**
 * Predefined transition configurations
 */
export const modalTransitions = {
  default: { duration: 0.2 },
  spring: {
    type: "spring" as const,
    damping: 25,
    stiffness: 300,
    mass: 0.8,
  },
  smooth: {
    type: "tween" as const,
    ease: "easeInOut",
    duration: 0.3,
  },
  fast: { duration: 0.15 },
  slow: { duration: 0.4 },
} as const;

export type ModalTransitionType = keyof typeof modalTransitions;

interface ModalTransitionProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when backdrop is clicked */
  onClose?: () => void;
  /** Children to render inside the modal container */
  children: React.ReactNode;
  /** Animation variant to use */
  variant?: ModalVariant;
  /** Transition timing configuration */
  transition?: ModalTransitionType;
  /** Custom backdrop className */
  backdropClassName?: string;
  /** Custom modal container className */
  modalClassName?: string;
  /** Whether to show backdrop */
  showBackdrop?: boolean;
  /** Whether backdrop should blur */
  backdropBlur?: boolean;
  /** Z-index for the modal */
  zIndex?: number;
  /** Whether clicking backdrop closes modal */
  closeOnBackdropClick?: boolean;
  /** Custom variants (overrides predefined variants) */
  customVariants?: {
    backdrop?: Variants;
    modal?: Variants;
  };
  /** Custom transition config (overrides predefined transitions) */
  customTransition?: Transition;
}

/**
 * ModalTransition - A reusable wrapper for modal animations
 *
 * Provides consistent entrance/exit transitions for all modals using Framer Motion.
 * Supports multiple animation variants and transition types.
 *
 * @example
 * ```tsx
 * <ModalTransition
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   variant="spring"
 *   transition="spring"
 * >
 *   <div className="bg-gray-800 rounded-lg p-6">
 *     Modal content here
 *   </div>
 * </ModalTransition>
 * ```
 */
export const ModalTransition: React.FC<ModalTransitionProps> = ({
  isOpen,
  onClose,
  children,
  variant = 'default',
  transition = 'default',
  backdropClassName,
  modalClassName,
  showBackdrop = true,
  backdropBlur = true,
  zIndex = 50,
  closeOnBackdropClick = true,
  customVariants,
  customTransition,
}) => {
  const variants = customVariants || modalVariants[variant];
  const transitionConfig = customTransition || modalTransitions[transition];

  const handleBackdropClick = () => {
    if (closeOnBackdropClick && onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          {showBackdrop && (
            <motion.div
              key="modal-backdrop"
              variants={variants.backdrop}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transitionConfig}
              className={
                backdropClassName ||
                `fixed inset-0 bg-black/50 ${backdropBlur ? 'backdrop-blur-sm' : ''}`
              }
              style={{ zIndex }}
              onClick={handleBackdropClick}
            />
          )}

          {/* Modal Container */}
          <motion.div
            key="modal-container"
            variants={variants.modal}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitionConfig}
            className={modalClassName || 'fixed inset-0 flex items-center justify-center p-4'}
            style={{ zIndex: zIndex + 1 }}
            onClick={(e) => {
              // Only trigger close if clicking directly on the container (not children)
              if (e.target === e.currentTarget && closeOnBackdropClick && onClose) {
                onClose();
              }
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * ModalContent - A helper component for modal content with stopPropagation
 *
 * Prevents click events from bubbling to the backdrop.
 * Use this to wrap your modal content.
 *
 * @example
 * ```tsx
 * <ModalTransition isOpen={isOpen} onClose={onClose}>
 *   <ModalContent className="bg-gray-800 rounded-lg p-6 max-w-2xl">
 *     Your content here
 *   </ModalContent>
 * </ModalTransition>
 * ```
 */
export const ModalContent: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ children, className, onClick }) => {
  return (
    <div
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      {children}
    </div>
  );
};

export default ModalTransition;
