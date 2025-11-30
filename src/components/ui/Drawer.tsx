'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ReactNode } from 'react';
import { useThemeStore } from '@/stores/themeStore';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  side?: 'left' | 'right';
  maxWidth?: string;
  backgroundImage?: string | null;
  transparentOverlay?: boolean; // Allow seeing the app behind
}

// Backdrop component for drawer overlay
function DrawerBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      onClick={onClose}
      data-testid="drawer-backdrop"
    />
  );
}

// Background image overlay component
function BackgroundImage({ imageUrl }: { imageUrl: string }) {
  return (
    <div
      className="absolute inset-0 opacity-10 pointer-events-none"
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  );
}

// Decorative corner elements
function DecorativeCorners() {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  
  return (
    <>
      <div className={`absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 ${colors.borderLight} rounded-tl-lg`} />
      <div className={`absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 ${colors.borderLight} rounded-br-lg`} />
    </>
  );
}

export default function Drawer({
  isOpen,
  onClose,
  children,
  side = 'left',
  maxWidth = 'max-w-md',
  backgroundImage = null,
  transparentOverlay = false,
}: DrawerProps) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  
  const slideDirection = side === 'left' ? '-100%' : '100%';
  const borderClass = side === 'left' ? 'border-r-2' : 'border-l-2';
  const positionClass = side === 'left' ? 'left-0' : 'right-0';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Optional transparent mode */}
          {!transparentOverlay && <DrawerBackdrop onClose={onClose} />}

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
            <div className={`relative h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ${borderClass} ${colors.border} shadow-2xl ${colors.shadow} overflow-y-auto`}>
              {/* Optional background image */}
              {backgroundImage && <BackgroundImage imageUrl={backgroundImage} />}

              <div className="relative p-8">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors z-10"
                  data-testid="drawer-close-btn"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>

                {/* Children content */}
                {children}
              </div>

              {/* Decorative elements */}
              <DecorativeCorners />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
