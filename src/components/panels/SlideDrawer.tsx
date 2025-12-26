'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Caveat } from 'next/font/google';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export interface SlideDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Title text with handwritten style */
  title: string;
  /** Content to render inside the drawer */
  children: React.ReactNode;
  /** Width of the drawer */
  maxWidth?: string;
  /** Direction to slide from */
  slideFrom?: 'top' | 'right' | 'bottom' | 'left';
  /** Optional vertical offset when open */
  openOffset?: number;
}

/**
 * SlideDrawer - A paper-styled sliding drawer panel
 *
 * Features:
 * - Spring-based sliding animation
 * - Backdrop blur with click-to-close
 * - Handwritten-style title font
 * - Decorative corner elements
 * - Paper texture overlay
 */
export default function SlideDrawer({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  slideFrom = 'top',
  openOffset = 80,
}: SlideDrawerProps) {
  const getInitialPosition = () => {
    switch (slideFrom) {
      case 'top': return { y: '-100%', x: '-50%', opacity: 0 };
      case 'right': return { x: '100%', y: 0, opacity: 0 };
      case 'bottom': return { y: '100%', x: '-50%', opacity: 0 };
      case 'left': return { x: '-100%', y: 0, opacity: 0 };
    }
  };

  const getAnimatePosition = () => {
    switch (slideFrom) {
      case 'top': return { y: openOffset, x: '-50%', opacity: 1 };
      case 'right': return { x: 0, y: 0, opacity: 1 };
      case 'bottom': return { y: -openOffset, x: '-50%', opacity: 1 };
      case 'left': return { x: 0, y: 0, opacity: 1 };
    }
  };

  const getPositionClasses = () => {
    switch (slideFrom) {
      case 'top': return 'left-1/2 top-0';
      case 'right': return 'right-0 top-1/2 -translate-y-1/2';
      case 'bottom': return 'left-1/2 bottom-0';
      case 'left': return 'left-0 top-1/2 -translate-y-1/2';
    }
  };

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
            initial={getInitialPosition()}
            animate={getAnimatePosition()}
            exit={getInitialPosition()}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 200,
              mass: 0.8,
            }}
            className={`fixed ${getPositionClasses()} z-50 w-full ${maxWidth}`}
          >
            {/* Paper-like card */}
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-amber-200/20 rounded-lg shadow-2xl shadow-amber-500/10 p-8">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>

              {/* Paper texture overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-50/5 to-transparent rounded-lg pointer-events-none" />

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`${caveat.className} text-4xl text-amber-200/90 mb-6 font-semibold`}
                style={{ textShadow: '0 2px 10px rgba(251, 191, 36, 0.3)' }}
              >
                {title}
              </motion.h2>

              {/* Content */}
              <div className="relative z-10">
                {children}
              </div>

              {/* Decorative corner elements */}
              <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-amber-200/20 rounded-tl-lg" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-amber-200/20 rounded-br-lg" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
