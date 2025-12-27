'use client';

import { motion } from 'framer-motion';
import { Check, Zap, Settings, Star, Code } from 'lucide-react';
import { PreviewProps } from './types';

export function StatusChipPreview({ props }: PreviewProps) {
  const status = (props.status as string) || 'idle';
  const size = (props.size as string) || 'md';
  const animated = props.animated !== false;

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    idle: { bg: 'bg-green-500/10', text: 'text-green-300', border: 'border-green-500/30' },
    active: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' },
    processing: { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/30' },
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' },
    error: { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/30' },
  };

  const sizeClasses: Record<string, string> = { sm: 'px-2 py-1 text-xs', md: 'px-3 py-1.5 text-sm', lg: 'px-4 py-2' };
  const c = statusColors[status] || statusColors.idle;

  return (
    <motion.div
      className={`inline-flex items-center gap-2 rounded-full border ${c.bg} ${c.border} ${sizeClasses[size]}`}
      animate={animated && status === 'processing' ? { opacity: [1, 0.7, 1] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <Zap className={`w-3.5 h-3.5 ${c.text}`} />
      <span className={`font-medium ${c.text}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </motion.div>
  );
}

export function BadgePreview({ props }: PreviewProps) {
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'sm';

  const variants: Record<string, string> = {
    default: 'bg-white/10 text-gray-300 border-white/20',
    success: 'bg-green-500/20 text-green-300 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-300 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  };

  const sizeClasses: Record<string, string> = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-medium ${variants[variant]} ${sizeClasses[size]}`}>
      <Check className="w-3 h-3" />
      Completed
    </span>
  );
}

export function ProgressBarPreview({ props }: PreviewProps) {
  const variant = (props.variant as string) || 'cyan';
  const height = (props.height as string) || 'md';
  const progress = parseInt(props.progress as string) || 50;

  const variants: Record<string, string> = {
    cyan: 'from-cyan-500 to-blue-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-indigo-500',
    purple: 'from-purple-500 to-pink-500',
  };

  const heights: Record<string, string> = { sm: 'h-1', md: 'h-2', lg: 'h-3' };

  return (
    <div className="w-full max-w-xs space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">Progress</span>
        <span className="text-cyan-400 font-medium">{progress}%</span>
      </div>
      <div className={`${heights[height]} bg-black/50 rounded-full overflow-hidden`}>
        <motion.div
          className={`h-full bg-gradient-to-r ${variants[variant]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

export function LoadingSpinnerPreview({ props }: PreviewProps) {
  const size = (props.size as string) || 'md';
  const sizes: Record<string, string> = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`${sizes[size]} border-2 border-cyan-500/30 border-t-cyan-500 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <span className="text-sm text-gray-400">Loading...</span>
    </div>
  );
}

export function EmptyStatePreview({ props }: PreviewProps) {
  const type = (props.type as string) || 'ideas';

  const colors: Record<string, { icon: string; text: string; bg: string }> = {
    ideas: { icon: 'text-cyan-400', text: 'text-cyan-400', bg: 'from-cyan-500/20 to-blue-500/20' },
    contexts: { icon: 'text-blue-400', text: 'text-blue-400', bg: 'from-blue-500/20 to-indigo-500/20' },
    goals: { icon: 'text-blue-400', text: 'text-blue-400', bg: 'from-blue-500/20 to-blue-500/20' },
    scanQueue: { icon: 'text-purple-400', text: 'text-purple-400', bg: 'from-purple-500/20 to-pink-500/20' },
  };

  const c = colors[type] || colors.ideas;
  const headlines: Record<string, string> = {
    ideas: 'Your idea buffer is empty',
    contexts: 'No contexts defined',
    goals: 'No goals set',
    scanQueue: 'Scan queue is empty',
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="relative mb-4">
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${c.bg} flex items-center justify-center`}>
          {type === 'ideas' && <Zap className={`w-8 h-8 ${c.icon}`} />}
          {type === 'contexts' && <Settings className={`w-8 h-8 ${c.icon}`} />}
          {type === 'goals' && <Star className={`w-8 h-8 ${c.icon}`} />}
          {type === 'scanQueue' && <Code className={`w-8 h-8 ${c.icon}`} />}
        </div>
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ background: `radial-gradient(circle, currentColor 0%, transparent 70%)` }}
        />
      </div>
      <h3 className={`text-sm font-semibold ${c.text} mb-1`}>{headlines[type]}</h3>
      <p className="text-xs text-gray-400 max-w-[200px]">Generate AI-powered insights by scanning your codebase.</p>
      <motion.button
        className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${c.bg} ${c.text} rounded-lg text-xs font-medium border border-${type === 'ideas' ? 'cyan' : type === 'contexts' ? 'blue' : type === 'scanQueue' ? 'purple' : 'blue'}-500/30`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Zap className="w-3 h-3" />
        Get Started
      </motion.button>
    </div>
  );
}
