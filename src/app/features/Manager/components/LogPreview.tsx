/**
 * LogPreview Component
 * Shared component for rendering implementation log previews
 * Used by both ImplementationLogCard and ImplementationLogDetail
 */

'use client';

import { motion } from 'framer-motion';
import { FileCode2, ArrowRight } from 'lucide-react';

export interface LogPreviewData {
  id: string;
  title: string;
  screenshot: string | null;
  project_name: string | null;
  context_name: string | null;
  overview_bullets: string | null;
}

interface LogPreviewProps {
  log: LogPreviewData;
  variant: 'card' | 'detail';
  className?: string;
}

/**
 * ProjectContextTags - Renders project and context tags
 */
export function ProjectContextTags({
  projectName,
  contextName,
  variant,
}: {
  projectName: string | null;
  contextName: string | null;
  variant: 'card' | 'detail';
}) {
  const isDetail = variant === 'detail';

  return (
    <div className="flex flex-wrap gap-2" data-testid="log-preview-tags">
      {projectName && (
        <span
          data-testid="log-preview-project-tag"
          className={
            isDetail
              ? 'px-3 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full backdrop-blur-sm'
              : 'text-xs px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded'
          }
        >
          {projectName}
        </span>
      )}
      {contextName && (
        <span
          data-testid="log-preview-context-tag"
          className={
            isDetail
              ? 'px-3 py-1 text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full backdrop-blur-sm'
              : 'text-xs px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded'
          }
        >
          {contextName}
        </span>
      )}
    </div>
  );
}

/**
 * ScreenshotPreview - Renders screenshot or placeholder
 */
export function ScreenshotPreview({
  screenshot,
  title,
  variant,
  logId,
}: {
  screenshot: string | null;
  title: string;
  variant: 'card' | 'detail';
  logId: string;
}) {
  const isDetail = variant === 'detail';

  if (isDetail) {
    return screenshot ? (
      <motion.img
        layoutId={`card-image-${logId}`}
        src={screenshot}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
        data-testid="log-preview-screenshot"
      />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center" data-testid="log-preview-placeholder">
        <div className="text-center">
          <FileCode2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <span className="text-gray-500">No screenshot available</span>
        </div>
      </div>
    );
  }

  // Card variant
  return (
    <>
      {screenshot && (
        <motion.img
          src={screenshot}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-20 transition-opacity duration-500 grayscale mix-blend-screen"
          data-testid="log-preview-screenshot"
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity" data-testid="log-preview-placeholder">
        <div className="text-center">
          <FileCode2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <span className="text-xs text-gray-500">Screenshot</span>
        </div>
      </div>
    </>
  );
}

/**
 * BulletsList - Renders overview bullets
 */
export function BulletsList({
  bullets,
  variant,
  maxItems,
}: {
  bullets: string | null;
  variant: 'card' | 'detail';
  maxItems?: number;
}) {
  const parsedBullets = bullets?.split('\n').filter((b) => b.trim()) || [];
  const displayBullets = maxItems ? parsedBullets.slice(0, maxItems) : parsedBullets;
  const isDetail = variant === 'detail';

  if (displayBullets.length === 0) return null;

  if (isDetail) {
    return (
      <div data-testid="log-preview-bullets">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Key Changes</h3>
        <ul className="space-y-2">
          {displayBullets.map((bullet, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 text-sm text-gray-300"
              data-testid={`log-preview-bullet-${i}`}
            >
              <span className="w-5 h-5 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-mono flex-shrink-0">
                {i + 1}
              </span>
              {bullet}
            </motion.li>
          ))}
        </ul>
      </div>
    );
  }

  // Card variant
  return (
    <ul className="space-y-1.5 mb-4" data-testid="log-preview-bullets">
      {displayBullets.map((bullet, i) => (
        <li
          key={i}
          className="flex items-start gap-2 text-xs text-gray-400"
          data-testid={`log-preview-bullet-${i}`}
        >
          <ArrowRight className="w-3 h-3 text-cyan-500 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">{bullet}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * LogPreview - Combined component (optional convenience wrapper)
 */
export default function LogPreview({ log, variant, className }: LogPreviewProps) {
  return (
    <div className={className} data-testid="log-preview">
      <ScreenshotPreview
        screenshot={log.screenshot}
        title={log.title}
        variant={variant}
        logId={log.id}
      />
      <ProjectContextTags
        projectName={log.project_name}
        contextName={log.context_name}
        variant={variant}
      />
      <BulletsList bullets={log.overview_bullets} variant={variant} maxItems={variant === 'card' ? 3 : undefined} />
    </div>
  );
}
