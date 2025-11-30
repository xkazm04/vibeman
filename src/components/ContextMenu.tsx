'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/stores/themeStore';

interface ContextMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
  variant?: 'simple' | 'neural'; // simple for basic menus, neural for fancy effects
}

// Helper function to get menu container class names
const getMenuContainerClasses = (variant: 'simple' | 'neural'): string => {
  const baseClasses = 'fixed min-w-[220px] backdrop-blur-xl rounded-lg shadow-2xl';

  if (variant === 'neural') {
    return `${baseClasses} bg-gradient-to-br from-gray-900/95 via-slate-900/95 to-blue-900/30 border border-gray-700/50 py-4`;
  }

  return `${baseClasses} bg-gray-900/95 border border-gray-700/50 py-2`;
};

// Helper function to get button class names
const getButtonClasses = (
  variant: 'simple' | 'neural',
  disabled?: boolean,
  destructive?: boolean
): string => {
  const { getThemeColors } = useThemeStore.getState();
  const colors = getThemeColors();
  
  const baseClasses = 'w-full text-left text-sm flex items-center transition-all';
  const variantSpacing = variant === 'neural'
    ? 'px-4 py-3 space-x-3 rounded-xl mx-1 border border-transparent duration-300'
    : 'px-4 py-2 gap-3 duration-200';

  if (disabled) {
    return `${baseClasses} ${variantSpacing} text-gray-500 cursor-not-allowed`;
  }

  if (destructive) {
    const destructiveStyles = variant === 'neural'
      ? 'text-red-400 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 hover:text-red-300 hover:border-red-500/50'
      : 'text-red-400 hover:bg-red-500/10 hover:text-red-300';
    return `${baseClasses} ${variantSpacing} ${destructiveStyles}`;
  }

  const normalStyles = variant === 'neural'
    ? `text-gray-200 hover:bg-gradient-to-r hover:${colors.bg} hover:to-blue-500/10 hover:${colors.textLight} hover:${colors.border}`
    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white';

  return `${baseClasses} ${variantSpacing} ${normalStyles}`;
};

export default function ContextMenu({
  isOpen,
  position,
  items,
  onClose,
  variant = 'simple'
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position to keep menu within viewport
  const adjustedPosition = React.useMemo(() => {
    if (!isOpen || typeof window === 'undefined') return position;

    const menuWidth = 220;
    const menuHeight = items.length * 40 + 16; // Approximate height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 20;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + menuWidth > viewportWidth - padding) {
      x = viewportWidth - menuWidth - padding;
    }

    // Adjust vertical position
    if (y + menuHeight > viewportHeight - padding) {
      y = viewportHeight - menuHeight - padding;
    }

    // Ensure minimum distance from edges
    x = Math.max(padding, x);
    y = Math.max(padding, y);

    return { x, y };
  }, [isOpen, position, items.length]);

  // Don't render on server side
  if (!mounted) return null;

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/5"
            style={{ zIndex: 999998 }}
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{
              duration: variant === 'neural' ? 0.3 : 0.15,
              type: variant === 'neural' ? 'spring' : 'tween',
              stiffness: 300,
              damping: 30
            }}
            className={getMenuContainerClasses(variant)}
            style={{
              left: `${adjustedPosition.x}px`,
              top: `${adjustedPosition.y}px`,
              zIndex: 999999,
              boxShadow: variant === 'neural'
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(99, 102, 241, 0.2)'
                : undefined
            }}
          >
            {variant === 'neural' && (
              <>
                {/* Neural Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5 rounded-lg" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent rounded-lg" />
              </>
            )}

            <div className={`relative ${variant === 'neural' ? 'space-y-1' : ''}`}>
              {items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={index}
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick();
                        onClose();
                      }
                    }}
                    disabled={item.disabled}
                    className={getButtonClasses(variant, item.disabled, item.destructive)}
                    whileHover={variant === 'neural' ? { x: 6, scale: 1.02 } : {}}
                    whileTap={variant === 'neural' ? { scale: 0.98 } : {}}
                  >
                    {Icon && (
                      <motion.div
                        whileHover={variant === 'neural' ? { rotate: 15 } : {}}
                        transition={{ duration: 0.2 }}
                      >
                        <Icon className={`flex-shrink-0 ${variant === 'neural' ? 'w-4 h-4' : 'w-4 h-4'}`} />
                      </motion.div>
                    )}
                    <span className={variant === 'neural' ? 'font-mono font-medium' : ''}>{item.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Use portal to render at document root level
  return typeof document !== 'undefined'
    ? createPortal(menuContent, document.body)
    : null;
}