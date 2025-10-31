'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  iconColor?: string;
  hoverColors?: {
    from: string;
    to: string;
    border: string;
    text: string;
  };
  action: () => void;
  disabled?: boolean;
  isDivider?: boolean;
  isDanger?: boolean;
}

interface ContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  items: ContextMenuItem[];
  className?: string;
}

const defaultHoverColors = {
  from: 'cyan-500/10',
  to: 'blue-500/10',
  border: 'cyan-500/30',
  text: 'cyan-300',
};

const dangerHoverColors = {
  from: 'red-500/20',
  to: 'red-600/20',
  border: 'red-500/50',
  text: 'red-300',
};

export default function ContextMenu({
  isVisible,
  position,
  onClose,
  items,
  className = '',
}: ContextMenuProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleAction = (item: ContextMenuItem) => {
    if (item.disabled) return;
    item.action();
    if (!item.isDivider) {
      onClose();
    }
  };

  // Don't render on server side
  if (!mounted) return null;

  const menuContent = (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop - Subtle overlay without blur */}
          <div
            className="fixed inset-0 bg-black/5"
            style={{ zIndex: 999998 }}
            onClick={onClose}
          />

          {/* Neural Context Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 border border-gray-700/50 rounded-2xl shadow-2xl py-4 min-w-[220px] backdrop-blur-xl ${className}`}
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              zIndex: 999999,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(99, 102, 241, 0.2)',
            }}
          >
            {/* Neural Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent rounded-2xl" />

            {/* Animated Grid Pattern */}
            <motion.div
              className="absolute inset-0 opacity-5 rounded-2xl"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '8px 8px',
              }}
              animate={{
                backgroundPosition: ['0px 0px', '8px 8px'],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'linear',
              }}
            />

            {/* Floating Particles */}
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${20 + i * 20}%`,
                }}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              />
            ))}

            <div className="relative space-y-1">
              {items.map((item) => {
                if (item.isDivider) {
                  return (
                    <div key={item.id} className="relative my-3 mx-2">
                      <div className="border-t border-gray-600/40" />
                      <motion.div
                        className="absolute inset-0 border-t border-red-500/30"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.5, duration: 0.3 }}
                      />
                    </div>
                  );
                }

                const colors = item.isDanger
                  ? dangerHoverColors
                  : item.hoverColors || defaultHoverColors;

                const Icon = item.icon;

                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleAction(item)}
                    disabled={item.disabled}
                    className={`
                      w-full px-4 py-3 text-left text-sm flex items-center space-x-3
                      transition-all duration-300 rounded-xl mx-1 border border-transparent
                      backdrop-blur-sm
                      ${
                        item.isDanger
                          ? 'text-red-400 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 hover:text-red-300 hover:border-red-500/50'
                          : `text-gray-200 hover:bg-gradient-to-r hover:from-${colors.from} hover:to-${colors.to} hover:text-${colors.text} hover:border-${colors.border}`
                      }
                      ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    whileHover={item.disabled ? {} : { x: 6, scale: 1.02 }}
                    whileTap={item.disabled ? {} : { scale: 0.98 }}
                  >
                    <motion.div
                      whileHover={item.disabled ? {} : { rotate: 15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Icon
                        className={`w-4 h-4 ${item.iconColor || (item.isDanger ? '' : 'text-cyan-400')}`}
                      />
                    </motion.div>
                    <span className="font-mono font-medium">{item.label}</span>
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
  return typeof document !== 'undefined' ? createPortal(menuContent, document.body) : null;
}
