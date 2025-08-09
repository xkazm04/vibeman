import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
}

export default function BaseModal({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-4xl',
  maxHeight = 'max-h-[85vh]'
}: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className={`bg-gray-800 border border-gray-700 rounded-lg shadow-xl ${maxWidth} w-full ${maxHeight} overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}