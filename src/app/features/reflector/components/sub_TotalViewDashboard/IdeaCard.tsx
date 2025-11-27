'use client';

import { motion } from 'framer-motion';
import { Sparkles, Calendar } from 'lucide-react';
import { DbIdea } from '@/app/db';

interface IdeaCardProps {
  idea: DbIdea;
  index: number;
  accentColor: string;
}

export function IdeaCard({ idea, index, accentColor }: IdeaCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      className="bg-gray-800/60 border border-gray-700/40 rounded-lg p-4
                 hover:border-opacity-80 hover:bg-gray-800/80 transition-all
                 cursor-pointer group"
      style={{
        borderColor: `${accentColor}40`,
      }}
      whileHover={{
        y: -4,
        boxShadow: `0 8px 16px ${accentColor}20`
      }}
      data-testid={`idea-card-${idea.id}`}
    >
      {/* Category Badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="px-2 py-1 rounded text-sm font-semibold"
          style={{
            backgroundColor: `${accentColor}20`,
            color: accentColor,
          }}
        >
          {idea.category}
        </span>
        <Sparkles
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: accentColor }}
        />
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-gray-200 mb-2 line-clamp-2">
        {idea.title}
      </h4>

      {/* Description */}
      {idea.description && (
        <p className="text-sm text-gray-400 line-clamp-3 mb-3">
          {idea.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {idea.effort && idea.impact && (
            <>
              E:{idea.effort} • I:{idea.impact}
            </>
          )}
        </span>
        {idea.implemented_at && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className="font-mono">
              {new Date(idea.implemented_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
