/**
 * Type definitions for ModalTransition component
 * Can be imported separately for type-only usage
 */

import type { Variants } from 'framer-motion';

/**
 * Available animation variants for modals
 */
export type ModalVariant = 'default' | 'spring' | 'slideUp' | 'slideDown' | 'fade' | 'scale';

/**
 * Available transition timing configurations
 */
export type ModalTransitionType = 'default' | 'spring' | 'smooth' | 'fast' | 'slow';

/**
 * Props for the ModalTransition component
 */
export interface ModalTransitionProps {
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
  customTransition?: ModalTransitionConfig;
}

/**
 * Props for the ModalContent helper component
 */
export interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Variant definition structure
 */
export interface ModalVariantDefinition {
  backdrop: Variants;
  modal: Variants;
}

/**
 * Transition configuration structure
 */
export interface ModalTransitionConfig {
  duration?: number;
  type?: 'spring' | 'tween';
  ease?: string;
  damping?: number;
  stiffness?: number;
  mass?: number;
}
