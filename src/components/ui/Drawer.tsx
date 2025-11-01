'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  side?: 'left' | 'right';
  maxWidth?: string;
  backgroundImage?: string | null;
}

export default function Drawer({
  isOpen,
  onClose,
  children,
  side = 'left',
  maxWidth = 'max-w-md',
  backgroundImage = null,
}: DrawerProps) {
  const slideDirection = side === 'left' ? '-100%' : '100%';
  const borderClass = side === 'left' ? 'border-r-2' : 'border-l-2';
  const positionClass = side === 'left' ? 'left-0' : 'right-0';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: slideDirection, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slideDirection, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 250,
              mass: 0.8,
            }}
            className={`fixed ${positionClass} top-0 bottom-0 z-50 w-full ${maxWidth}`}
          >
            {/* Drawer content */}
            <div className={`relative h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ${borderClass} border-cyan-500/30 shadow-2xl shadow-cyan-500/20 overflow-y-auto`}>
              {/* Optional background image */}
              {backgroundImage && (
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              )}

              <div className="relative p-8">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors z-10"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>

                {/* Children content */}
                {children}
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-200/20 rounded-tl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-200/20 rounded-br-lg" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
