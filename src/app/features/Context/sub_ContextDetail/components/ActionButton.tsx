/**
 * Reusable Action Button Component
 * Used for header action buttons with consistent styling
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  variant?: 'primary' | 'danger' | 'secondary';
  className?: string;
}

const variantStyles = {
  primary: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30',
  danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30',
  secondary: 'hover:bg-gray-700/50 border-gray-600/30 hover:border-gray-500/50 text-gray-300'
};

export default function ActionButton({
  onClick,
  icon: Icon,
  variant = 'secondary',
  className = ''
}: ActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`p-3 rounded-xl transition-all border ${variantStyles[variant]} ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Icon className="w-5 h-5" />
    </motion.button>
  );
}
