/**
 * Implementation Log Card Component
 * Displays a single implementation log in card format
 */

'use client';

import { motion } from 'framer-motion';
import { FileCode2, AlertCircle, ArrowRight } from 'lucide-react';
import { EnrichedImplementationLog } from '../lib/types';

interface ImplementationLogCardProps {
  log: EnrichedImplementationLog;
  index: number;
  onClick: () => void;
}

export default function ImplementationLogCard({
  log,
  index,
  onClick,
}: ImplementationLogCardProps) {
  const bullets = log.overview_bullets?.split('\n').filter(b => b.trim()) || [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{
        layout: { type: 'spring', damping: 25, stiffness: 300 }, // Smooth reordering
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 }
      }}
      // Apply delay only to the initial enter animation via variants if needed, 
      // or just keep it simple. The issue was likely the shared transition prop affecting layout.
      // To properly separate, we can use variants or just override the layout transition.

      whileHover={{ scale: 1.02, y: -4 }}
      onClick={onClick}
      data-testid={`feature-card-${log.id}`}
      className="
        relative cursor-pointer group
        rounded-xl overflow-hidden
        bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800
        border border-cyan-500/50
        shadow-lg shadow-cyan-500/20 hover:shadow-xl
        transition-all duration-300
        hover:shadow-2xl hover:shadow-cyan-500/20
      "
    >
      {/* Neon Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-xl" />
      </div>

      {/* Screenshot with Hover Effect */}
      <div className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
        {/* Screenshot Image - Visible on Hover */}
        {log.screenshot && (
          <motion.img
            src={log.screenshot}
            alt={log.title}
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-20 transition-opacity duration-500 grayscale mix-blend-screen"
          />
        )}

        {/* Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
          <div className="text-center">
            <FileCode2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <span className="text-xs text-gray-500">Screenshot</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3 bg-cyan-500/10 border-cyan-500/50 border rounded-full px-3 py-1 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-medium text-cyan-400">Needs Review</span>
        </div>

        {/* Scanline Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Content */}
      <div className="relative p-4">
        {/* Project & Context Info */}
        <div className="flex flex-wrap gap-2 mb-2">
          {log.project_name && (
            <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded">
              {log.project_name}
            </span>
          )}
          {log.context_name && (
            <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">
              {log.context_name}
            </span>
          )}
        </div>

        <motion.h3
          layoutId={`card-title-${log.id}`}
          className="font-semibold text-white mb-3 group-hover:text-cyan-300 transition-colors"
        >
          {log.title}
        </motion.h3>

        {/* Key Changes from Bullets */}
        <ul className="space-y-1.5 mb-4">
          {bullets.slice(0, 3).map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
              <ArrowRight className="w-3 h-3 text-cyan-500 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{bullet}</span>
            </li>
          ))}
        </ul>

        {/* Requirement Name */}
        <div className="pt-3 border-t border-gray-800">
          <div className="text-xs text-gray-500">Requirement</div>
          <div className="text-sm font-mono text-cyan-400 truncate">{log.requirement_name}</div>
        </div>
      </div>

      {/* Hover Indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
    </motion.div>
  );
}
