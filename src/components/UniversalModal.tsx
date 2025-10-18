import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface UniversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  children: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  showBackdrop?: boolean;
  backdropBlur?: boolean;
}

export const UniversalModal: React.FC<UniversalModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconBgColor = "from-slate-800/60 to-slate-900/60",
  iconColor = "text-slate-300",
  children,
  maxWidth = "max-w-4xl",
  maxHeight = "max-h-[85vh]",
  showBackdrop = true,
  backdropBlur = true
}) => {
  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Handle escape key to close modal and focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    // Focus trap - keep focus within modal
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const modal = document.querySelector('[data-modal="true"]');
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          event.preventDefault();
        }
      }
    };

    // Add escape listener with high priority
    document.addEventListener('keydown', handleEscape, { capture: true });
    document.addEventListener('keydown', handleTabKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscape, { capture: true });
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Enhanced Backdrop with Gradient */}
      {showBackdrop && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[9999] ${backdropBlur
            ? 'bg-gradient-to-br from-black/70 via-black/60 to-slate-900/50 backdrop-blur-md'
            : 'bg-black/60'
            }`}
          onClick={onClose}
        />
      )}

      {/* Enhanced Modal Container */}
      <motion.div
        key="modal-container"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 300,
          mass: 0.8
        }}
        className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-12"
      >
        <div 
          className={`relative w-full ${maxWidth} ${maxHeight} overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
          data-modal="true"
        >
          {/* Enhanced Modal Background with Gradient and Border Effects */}
          <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/95 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl border border-slate-700/40">
            {/* Animated Border Gradient */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-slate-600/20 via-slate-500/10 to-slate-600/20 opacity-50" />

            {/* Inner Content Container */}
            <div className="relative z-10">
              {/* Enhanced Header with Gradient Background */}
              <div className="relative p-6 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/40 via-slate-800/30 to-slate-700/40">
                {/* Header Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/5 to-transparent" />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {Icon && (
                      <div className={`p-2.5 bg-gradient-to-br ${iconBgColor} rounded-xl border border-slate-600/30 shadow-lg backdrop-blur-sm`}>
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-semibold text-white tracking-wide bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                        {title}
                      </h2>
                      {subtitle && (
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Close Button */}
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 rounded-xl transition-all duration-200 group border border-transparent hover:border-slate-600/30"
                  >
                    <X className="w-5 h-5 text-slate-400 group-hover:text-slate-300 transition-colors" />
                  </button>
                </div>
              </div>

              {/* Content Area with Enhanced Styling */}
              <div className="p-6 max-h-[70vh] overflow-y-auto bg-gradient-to-b from-slate-900/20 to-slate-800/10 custom-scrollbar">
                {children}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 