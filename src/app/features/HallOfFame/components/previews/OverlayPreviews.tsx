'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { PreviewProps } from './types';

export function ModalTransitionPreview({ props }: PreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const variant = (props.variant as string) || 'spring';

  const variants: Record<string, { initial: Record<string, number>; animate: Record<string, number> }> = {
    default: { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } },
    spring: { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 } },
    slideUp: { initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 } },
    slideDown: { initial: { opacity: 0, y: -50 }, animate: { opacity: 1, y: 0 } },
    fade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
    scale: { initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 } },
  };

  const v = variants[variant] || variants.spring;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        Open Modal ({variant})
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={v.initial}
              animate={v.animate}
              exit={v.initial}
              transition={{ type: variant === 'spring' ? 'spring' : 'tween', duration: 0.3 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl z-50 min-w-[200px]"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Modal Content</h3>
              <p className="text-gray-400 text-sm mb-4">Using {variant} animation</p>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SlideDrawerPreview({ props }: PreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const slideFrom = (props.slideFrom as string) || 'top';

  const getInitialPosition = () => {
    switch (slideFrom) {
      case 'top': return { opacity: 0, y: '-100%', x: '-50%' };
      case 'bottom': return { opacity: 0, y: '100%', x: '-50%' };
      case 'left': return { opacity: 0, x: '-100%', y: 0 };
      case 'right': return { opacity: 0, x: '100%', y: 0 };
      default: return { opacity: 0, y: '-100%', x: '-50%' };
    }
  };

  const getAnimatePosition = () => {
    switch (slideFrom) {
      case 'top': return { opacity: 1, y: 20, x: '-50%' };
      case 'bottom': return { opacity: 1, y: -20, x: '-50%' };
      case 'left': return { opacity: 1, x: 0, y: 0 };
      case 'right': return { opacity: 1, x: 0, y: 0 };
      default: return { opacity: 1, y: 20, x: '-50%' };
    }
  };

  const getPositionClass = () => {
    switch (slideFrom) {
      case 'top': return 'top-0 left-1/2';
      case 'bottom': return 'bottom-0 left-1/2';
      case 'left': return 'left-0 top-1/2 -translate-y-1/2';
      case 'right': return 'right-0 top-1/2 -translate-y-1/2';
      default: return 'top-0 left-1/2';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-gradient-to-r from-amber-600/40 to-yellow-600/40 border border-amber-500/30 text-amber-200 rounded-lg hover:opacity-90 transition-opacity"
      >
        Open Drawer ({slideFrom})
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={getInitialPosition()}
              animate={getAnimatePosition()}
              exit={getInitialPosition()}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed ${getPositionClass()} z-50 w-64`}
            >
              <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-amber-200/20 rounded-lg shadow-xl p-4">
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-gray-700/50 hover:bg-gray-600/50"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
                <h3
                  className="text-lg text-amber-200/90 font-semibold mb-2"
                  style={{ fontFamily: 'cursive' }}
                >
                  Getting Started
                </h3>
                <p className="text-sm text-gray-400">Content here...</p>
                <div className="absolute top-1 left-1 w-4 h-4 border-l-2 border-t-2 border-amber-200/20 rounded-tl" />
                <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 border-amber-200/20 rounded-br" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
