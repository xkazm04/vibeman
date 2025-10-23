import React from 'react';
import { motion } from 'framer-motion';
import { DbIdea } from '@/lib/database';
import {
  Zap,
  Gauge,
  Wrench,
  Palette,
  Code2,
  Heart
} from 'lucide-react';

interface IdeaStickyNoteProps {
  idea: DbIdea;
  index: number;
  onClick: () => void;
}

const categoryConfig = {
  functionality: { emoji: '⚡', icon: Zap, color: 'blue' },
  performance: { emoji: '📊', icon: Gauge, color: 'green' },
  maintenance: { emoji: '🔧', icon: Wrench, color: 'amber' },
  ui: { emoji: '🎨', icon: Palette, color: 'pink' },
  code_quality: { emoji: '💻', icon: Code2, color: 'purple' },
  user_benefit: { emoji: '❤️', icon: Heart, color: 'red' },
};

const statusConfig = {
  pending: { bg: 'bg-gray-700/20', border: 'border-gray-600/40', shadow: 'shadow-gray-500/5' },
  accepted: { bg: 'bg-green-500/10', border: 'border-green-500/30', shadow: 'shadow-green-500/10' },
  rejected: { bg: 'bg-red-500/10', border: 'border-red-500/30', shadow: 'shadow-red-500/10' },
  implemented: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', shadow: 'shadow-amber-500/10' },
};

export default function IdeaStickyNote({ idea, index, onClick }: IdeaStickyNoteProps) {
  const config = categoryConfig[idea.category];
  const statusStyle = statusConfig[idea.status];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <motion.div
      className={`relative group cursor-pointer ${statusStyle.bg} ${statusStyle.border} border rounded-xl p-4 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl ${statusStyle.shadow} overflow-hidden`}
      initial={{ opacity: 0, y: 20, rotateZ: -2 }}
      animate={{ opacity: 1, y: 0, rotateZ: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        type: "spring",
        stiffness: 200
      }}
      whileHover={{ rotateZ: 1, y: -4 }}
      onClick={onClick}
    >
      {/* Decorative corner fold */}
      <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-gray-800/40 to-transparent transform translate-x-4 -translate-y-4 rotate-45" />

      {/* Category emoji in top right */}
      <motion.div
        className="absolute top-2 right-2 text-2xl"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
      >
        {config.emoji}
      </motion.div>

      {/* Date */}
      <div className="text-xs text-gray-500 font-mono mb-3">
        {formatDate(idea.created_at)}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-white mb-3 pr-8 leading-snug line-clamp-3 group-hover:text-blue-300 transition-colors">
        {idea.title}
      </h3>

      {/* Scan Type label */}
      <div className="flex items-center justify-between mt-auto">
        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
          {idea.scan_type?.replace('_', ' ')}
        </span>

        {/* Status indicator */}
        {idea.user_pattern === 1 && (
          <motion.div
            className="ml-2 px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 rounded text-xs text-blue-300 font-semibold"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ⭐
          </motion.div>
        )}
      </div>

      {/* Hover gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-transparent transition-all duration-300 pointer-events-none rounded-xl"
      />
    </motion.div>
  );
}
