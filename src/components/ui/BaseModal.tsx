import React, { useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  /** ID of the element that labels the modal (for aria-labelledby) */
  labelledById?: string;
  /** ID of the element that describes the modal content (for aria-describedby) */
  describedById?: string;
  /** Test ID for automated testing */
  'data-testid'?: string;
}

export default function BaseModal({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-4xl',
  maxHeight = 'max-h-[85vh]',
  labelledById,
  describedById,
  'data-testid': testId = 'base-modal',
}: BaseModalProps) {
  const fallbackId = useId();
  const modalId = `modal-${fallbackId}`;

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          escapeDeactivates: true,
          fallbackFocus: `[data-testid="${testId}"]`,
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
          data-testid={`${testId}-backdrop`}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledById || `${modalId}-title`}
            aria-describedby={describedById}
            id={modalId}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`bg-gray-800 border border-gray-700 rounded-lg shadow-xl ${maxWidth} w-full ${maxHeight} overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
            data-testid={testId}
          >
            {children}
          </motion.div>
        </motion.div>
      </FocusTrap>
    </AnimatePresence>
  );
}