/**
 * Implementation Log Card Component
 * Displays a single implementation log in card format
 */

'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { EnrichedImplementationLog } from '../lib/types';
import { ScreenshotPreview, ProjectContextTags, BulletsList } from './LogPreview';

interface ImplementationLogCardProps {
  log: EnrichedImplementationLog;
  index: number;
  onClick: () => void;
  compact?: boolean;
}

export default function ImplementationLogCard({
  log,
  index,
  onClick,
  compact = false,
}: ImplementationLogCardProps) {
  // Compact mode for sidebar/filtered view
  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
        whileHover={{ x: 4 }}
        onClick={onClick}
        data-testid={`feature-card-compact-${log.id}`}
        className="
          relative cursor-pointer group
          rounded-lg overflow-hidden p-3
          bg-gray-900/80 border border-gray-700
          hover:border-cyan-500/50 hover:bg-gray-800/80
          transition-all duration-200
        "
      >
        <div className="flex gap-3">
          {/* Mini Screenshot */}
          {log.screenshot && (
            <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-800">
              <ScreenshotPreview
                screenshot={log.screenshot}
                title={log.title}
                variant="card"
                logId={log.id}
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white truncate group-hover:text-cyan-300 transition-colors">
              {log.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <ProjectContextTags
                projectName={log.project_name}
                contextName={log.context_name}
                variant="card"
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-cyan-400/60" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Full card mode
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{
        layout: { type: 'spring', damping: 25, stiffness: 300 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 }
      }}
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
        <ScreenshotPreview
          screenshot={log.screenshot}
          title={log.title}
          variant="card"
          logId={log.id}
        />

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
        <div className="mb-2">
          <ProjectContextTags
            projectName={log.project_name}
            contextName={log.context_name}
            variant="card"
          />
        </div>

        <motion.h3
          layoutId={`card-title-${log.id}`}
          className="font-semibold text-white mb-3 group-hover:text-cyan-300 transition-colors"
        >
          {log.title}
        </motion.h3>

        {/* Key Changes from Bullets */}
        <BulletsList
          bullets={log.overview_bullets}
          variant="card"
          maxItems={3}
        />

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
