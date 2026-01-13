'use client';

import { motion } from 'framer-motion';
import { Plus, Settings2, Star } from 'lucide-react';
import { PreviewProps } from './types';

export function AnimatedButtonPreview({ props }: PreviewProps) {
  const variant = (props.variant as string) || 'primary';
  const size = (props.size as string) || 'md';

  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-r from-cyan-600/60 to-blue-600/60 text-white border-cyan-500/30',
    secondary: 'bg-gray-700/50 text-gray-300 border-gray-600/50',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ghost: 'bg-transparent text-gray-400 border-transparent hover:bg-gray-700/30',
    outline: 'bg-transparent text-gray-300 border-gray-600',
  };

  const sizeClasses: Record<string, string> = {
    xs: 'px-2 py-1 text-xs', sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-5 py-2.5 text-lg',
  };

  return (
    <motion.button
      className={`rounded-lg border font-medium transition-colors ${variants[variant]} ${sizeClasses[size]}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add Item
      </span>
    </motion.button>
  );
}

export function IconButtonPreview({ props }: PreviewProps) {
  const colorScheme = (props.colorScheme as string) || 'cyan';
  const variant = (props.variant as string) || 'solid';
  const size = (props.size as string) || 'md';

  const colorStyles: Record<string, Record<string, string>> = {
    cyan: { solid: 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 text-cyan-300 border-cyan-500/30', ghost: 'text-cyan-400 hover:bg-cyan-500/20', outline: 'border-cyan-500/50 text-cyan-400' },
    blue: { solid: 'bg-gradient-to-r from-blue-600/40 to-indigo-600/40 text-blue-300 border-blue-500/30', ghost: 'text-blue-400 hover:bg-blue-500/20', outline: 'border-blue-500/50 text-blue-400' },
    purple: { solid: 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-purple-300 border-purple-500/30', ghost: 'text-purple-400 hover:bg-purple-500/20', outline: 'border-purple-500/50 text-purple-400' },
    green: { solid: 'bg-gradient-to-r from-green-600/40 to-emerald-600/40 text-green-300 border-green-500/30', ghost: 'text-green-400 hover:bg-green-500/20', outline: 'border-green-500/50 text-green-400' },
    red: { solid: 'bg-gradient-to-r from-red-600/40 to-rose-600/40 text-red-300 border-red-500/30', ghost: 'text-red-400 hover:bg-red-500/20', outline: 'border-red-500/50 text-red-400' },
  };

  const sizeClasses: Record<string, string> = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
  const iconSizes: Record<string, string> = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

  const colors = colorStyles[colorScheme] || colorStyles.cyan;
  const buttonClass = variant === 'ghost' ? colors.ghost : variant === 'outline' ? `border ${colors.outline}` : `border ${colors.solid}`;

  return (
    <motion.button
      className={`rounded-lg flex items-center justify-center transition-colors ${sizeClasses[size]} ${buttonClass}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Settings2 className={iconSizes[size]} />
    </motion.button>
  );
}

export function IlluminatedButtonPreview({ props }: PreviewProps) {
  const color = (props.color as string) || 'cyan';
  const size = (props.size as string) || 'md';
  const selected = props.selected === true;
  const scanning = props.scanning === true;

  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    cyan: { bg: 'from-cyan-600/20 to-cyan-900/40', border: 'border-cyan-400/50', text: 'text-cyan-200' },
    blue: { bg: 'from-blue-600/20 to-blue-900/40', border: 'border-blue-400/50', text: 'text-blue-200' },
    purple: { bg: 'from-purple-600/20 to-purple-900/40', border: 'border-purple-400/50', text: 'text-purple-200' },
    amber: { bg: 'from-amber-600/20 to-amber-900/40', border: 'border-amber-400/50', text: 'text-amber-200' },
    green: { bg: 'from-green-600/20 to-green-900/40', border: 'border-green-400/50', text: 'text-green-200' },
    red: { bg: 'from-red-600/20 to-red-900/40', border: 'border-red-400/50', text: 'text-red-200' },
  };

  const sizeMap: Record<string, { button: string; icon: string }> = {
    xs: { button: 'w-12 h-12', icon: 'w-5 h-5' },
    sm: { button: 'w-14 h-14', icon: 'w-6 h-6' },
    md: { button: 'w-16 h-16', icon: 'w-7 h-7' },
    lg: { button: 'w-20 h-20', icon: 'w-8 h-8' },
  };

  const colors = colorMap[color] || colorMap.cyan;
  const sizes = sizeMap[size] || sizeMap.md;
  const effectiveColor = scanning ? colorMap.green : selected ? colors : { bg: 'from-gray-700/30 to-gray-900/50', border: 'border-gray-600/30', text: 'text-gray-400' };

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        className={`relative ${sizes.button} rounded-full flex items-center justify-center cursor-pointer`}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
      >
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${effectiveColor.bg} border ${effectiveColor.border} ${selected ? 'ring-2 ring-' + color + '-500/30' : ''}`} />
        {scanning && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className={`absolute inset-[-4px] rounded-full border-t-2 border-r-2 border-transparent ${effectiveColor.border} opacity-80`}
          />
        )}
        <Star className={`relative z-10 ${sizes.icon} ${effectiveColor.text}`} />
      </motion.div>
      <span className={`text-sm font-medium ${effectiveColor.text}`}>Scan</span>
    </div>
  );
}
