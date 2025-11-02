'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Target, CheckSquare, Lightbulb, BookOpen, ExternalLink } from 'lucide-react';
import { KnowledgeSource } from '../lib/voicebotTypes';

interface KnowledgeSourcesPanelProps {
  sources: KnowledgeSource[];
  onSourceClick?: (source: KnowledgeSource) => void;
}

const SOURCE_ICONS = {
  context: FileText,
  goal: Target,
  backlog: CheckSquare,
  documentation: BookOpen,
  idea: Lightbulb
};

const SOURCE_COLORS = {
  context: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    glow: 'shadow-blue-500/20'
  },
  goal: {
    border: 'border-green-500/30',
    bg: 'bg-green-500/10',
    text: 'text-green-300',
    glow: 'shadow-green-500/20'
  },
  backlog: {
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    text: 'text-purple-300',
    glow: 'shadow-purple-500/20'
  },
  documentation: {
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-300',
    glow: 'shadow-cyan-500/20'
  },
  idea: {
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-300',
    glow: 'shadow-yellow-500/20'
  }
};

export default function KnowledgeSourcesPanel({ sources, onSourceClick }: KnowledgeSourcesPanelProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="mt-3 p-3 bg-gray-900/60 backdrop-blur-sm border border-gray-700/40 rounded-lg"
    >
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wide">
          Knowledge Sources ({sources.length})
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {sources.map((source, index) => {
            const Icon = SOURCE_ICONS[source.type];
            const colors = SOURCE_COLORS[source.type];

            return (
              <motion.button
                key={`${source.type}-${source.id}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSourceClick?.(source)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative px-3 py-2 rounded-lg border ${colors.border} ${colors.bg} transition-all duration-200 group`}
                title={source.description || source.name}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                  <span className={`text-xs font-mono ${colors.text}`}>
                    {source.name}
                  </span>
                  <ExternalLink className={`w-3 h-3 ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`} />
                </div>

                {/* Hover glow effect */}
                <motion.div
                  className={`absolute inset-0 rounded-lg blur-sm ${colors.glow} opacity-0 group-hover:opacity-100 -z-10`}
                  transition={{ duration: 0.2 }}
                />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Description preview (show first source with description) */}
      {sources.find(s => s.description) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 pt-2 border-t border-gray-700/30"
        >
          <p className="text-xs text-gray-500 line-clamp-2">
            {sources.find(s => s.description)?.description}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
