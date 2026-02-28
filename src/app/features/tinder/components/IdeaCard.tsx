'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, useTransform, useMotionTemplate } from 'framer-motion';
import { DbIdea } from '@/app/db';
import {
  getCategoryConfig,
  effortScale,
  impactScale,
  riskScale,
  EffortIcon,
  ImpactIcon,
  RiskIcon,
} from '@/app/features/Ideas/lib/ideaConfig';
import { Calendar, Tag, Target } from 'lucide-react';
import { formatCardDate } from '../lib/tinderUtils';
import { useDragSwipe } from '../lib/tinderHooks';

interface IdeaCardProps {
  idea: DbIdea;
  projectName: string;
  contextName?: string;
  /** Pre-fetched goal title (avoids N+1 queries) */
  goalTitle?: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  style?: React.CSSProperties;
  /** Additional class for height constraints (e.g. max-h-[...]) */
  className?: string;
}

export default function IdeaCard({
  idea,
  projectName,
  contextName = 'General',
  goalTitle,
  onSwipeLeft,
  onSwipeRight,
  style,
  className,
}: IdeaCardProps) {
  const { x, rotateZ, exitX, exitOpacity, handleDragEnd } = useDragSwipe(onSwipeLeft, onSwipeRight);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  // Detect if content overflows and needs scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollHeight > el.clientHeight + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [idea.id]);

  // Continuous directional feedback: border color shifts during drag
  // Left (reject) = red-500 rgb(239,68,68), neutral = gray-700/50, right (accept) = green-500 rgb(34,197,94)
  const borderR = useTransform(x, [-200, 0, 200], [239, 55, 34]);
  const borderG = useTransform(x, [-200, 0, 200], [68, 65, 197]);
  const borderB = useTransform(x, [-200, 0, 200], [68, 81, 94]);
  const borderA = useTransform(x, [-200, -50, 0, 50, 200], [0.4, 0.2, 0.25, 0.2, 0.4]);
  const borderColor = useMotionTemplate`rgba(${borderR}, ${borderG}, ${borderB}, ${borderA})`;

  // Background tint: subtle green/red wash over the card
  const bgGreenOpacity = useTransform(x, [0, 50, 200], [0, 0, 0.05]);
  const bgRedOpacity = useTransform(x, [-200, -50, 0], [0.05, 0, 0]);

  const config = getCategoryConfig(idea.category);

  return (
    <motion.div
      className="absolute w-full"
      style={{
        x,
        rotateZ,
        ...style,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={{
        x: exitX,
        opacity: exitOpacity,
      }}
      transition={{
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      }}
    >
      <motion.div
        className={`relative bg-gradient-to-br from-gray-800 to-gray-900 border-2 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden cursor-grab active:cursor-grabbing flex flex-col ${className || ''}`}
        style={{ borderColor }}
      >
        {/* Directional background tint */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent to-green-500 pointer-events-none z-0"
          style={{ opacity: bgGreenOpacity }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-l from-transparent to-red-500 pointer-events-none z-0"
          style={{ opacity: bgRedOpacity }}
        />
        {/* Swipe indicators */}
        <motion.div
          className="absolute top-8 right-8 z-10"
          style={{
            opacity: useTransform(x, [0, 150], [0, 1]),
          }}
        >
          <div className="px-6 py-3 bg-green-500/20 border-4 border-green-500 rounded-xl rotate-12">
            <span className="text-2xl font-black text-green-500">ACCEPT</span>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-8 left-8 z-10"
          style={{
            opacity: useTransform(x, [-150, 0], [1, 0]),
          }}
        >
          <div className="px-6 py-3 bg-red-500/20 border-4 border-red-500 rounded-xl -rotate-12">
            <span className="text-2xl font-black text-red-500">REJECT</span>
          </div>
        </motion.div>

        {/* Metric badges — pinned to top border inside card */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[5] flex items-center gap-1.5 -translate-y-1/2">
          {idea.impact != null && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold tabular-nums bg-gray-900 ${impactScale.entries[idea.impact]?.color || 'text-gray-400'} border-gray-700/60`}
              title={`Impact: ${impactScale.entries[idea.impact]?.description || idea.impact}`}
            >
              <ImpactIcon className="w-3 h-3" />
              <span>{idea.impact}</span>
            </div>
          )}
          {idea.effort != null && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold tabular-nums bg-gray-900 ${effortScale.entries[idea.effort]?.color || 'text-gray-400'} border-gray-700/60`}
              title={`Effort: ${effortScale.entries[idea.effort]?.description || idea.effort}`}
            >
              <EffortIcon className="w-3 h-3" />
              <span>{idea.effort}</span>
            </div>
          )}
          {idea.risk != null && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold tabular-nums bg-gray-900 ${riskScale.entries[idea.risk]?.color || 'text-gray-400'} border-gray-700/60`}
              title={`Risk: ${riskScale.entries[idea.risk]?.description || idea.risk}`}
            >
              <RiskIcon className="w-3 h-3" />
              <span>{idea.risk}</span>
            </div>
          )}
        </div>

        {/* Card content — scrollable when overflowing */}
        <div ref={scrollRef} className="px-7 pb-6 pt-5 overflow-y-auto flex-1 min-h-0 relative z-[1]">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{config.emoji}</div>
              <div>
                <h3 className="text-xl font-bold text-white leading-tight">
                  {idea.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Tag className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">
                    {idea.category.replace('_', ' ')}{idea.scan_type ? ` · ${idea.scan_type.replace('_', ' ')}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Related Goal */}
          {goalTitle && (
            <div className="mb-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg transition-all duration-200 hover:bg-purple-900/30 hover:border-purple-500/50 hover:shadow-md hover:shadow-purple-500/10">
                <Target className="w-4 h-4 text-purple-400 transition-transform duration-200" />
                <div>
                  <div className="text-[10px] text-purple-400 uppercase tracking-wide">Related Goal</div>
                  <div className="text-sm font-semibold text-purple-300">{goalTitle}</div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <ExpandableSection
            label="Description"
            text={idea.description || 'No description provided'}
            clampClass="line-clamp-6"
            textClass="text-base text-gray-200 leading-relaxed"
          />

          {/* Reasoning */}
          {idea.reasoning && (
            <ExpandableSection
              label="Reasoning"
              text={idea.reasoning}
              clampClass="line-clamp-4"
              textClass="text-sm text-gray-300 leading-relaxed"
            />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 animate-pulse"></div>
              <span className="text-sm text-gray-400 transition-colors duration-200">{projectName}</span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-400 transition-colors duration-200">{contextName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 tabular-nums">
              <Calendar className="w-3 h-3" />
              <span>{formatCardDate(idea.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Scroll fade indicator — only visible when content overflows */}
        {canScroll && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none z-[2]" />
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Expandable Section ───────────────────────────────────────────────────────

function ExpandableSection({
  label,
  text,
  clampClass,
  textClass,
}: {
  label: string;
  text: string;
  clampClass: string;
  textClass: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {label}
      </h4>
      <div className="relative">
        <motion.div layout="position" transition={{ duration: 0.25, ease: 'easeInOut' }}>
          <p className={`${textClass} ${expanded ? '' : clampClass}`}>
            {text}
          </p>
        </motion.div>
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        className="mt-1 text-xs text-cyan-400/80 hover:text-cyan-300 transition-colors"
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </div>
  );
}
