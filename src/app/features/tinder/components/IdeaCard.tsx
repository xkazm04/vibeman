'use client';
import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { DbIdea } from '@/app/db';
import {
  getCategoryConfig,
  statusConfig,
  effortConfig,
  impactConfig,
  EffortIcon,
  ImpactIcon,
} from '@/app/features/Ideas/lib/ideaConfig';
import { Calendar, Tag, Target } from 'lucide-react';

interface IdeaCardProps {
  idea: DbIdea;
  projectName: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  style?: React.CSSProperties;
}

export default function IdeaCard({
  idea,
  projectName,
  onSwipeLeft,
  onSwipeRight,
  style,
}: IdeaCardProps) {
  const x = useMotionValue(0);
  const rotateZ = useTransform(x, [-200, 200], [-15, 15]);

  const [exitX, setExitX] = useState(0);
  const [exitOpacity, setExitOpacity] = useState(1);
  const [goalTitle, setGoalTitle] = useState<string | null>(null);
  const [loadingGoal, setLoadingGoal] = useState(false);

  const config = getCategoryConfig(idea.category);

  // Fetch goal title if goal_id exists
  useEffect(() => {
    if (idea.goal_id) {
      setLoadingGoal(true);
      fetch(`/api/goals?id=${idea.goal_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.goal) {
            setGoalTitle(data.goal.title);
          }
        })
        .catch(err => console.error('Error fetching goal:', err))
        .finally(() => setLoadingGoal(false));
    }
  }, [idea.goal_id]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 150;

    if (Math.abs(info.offset.x) > threshold) {
      // Swiped
      setExitX(info.offset.x > 0 ? 1000 : -1000);
      setExitOpacity(0);

      setTimeout(() => {
        if (info.offset.x > 0) {
          onSwipeRight(); // Accept
        } else {
          onSwipeLeft(); // Reject
        }
      }, 200);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

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
      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing">
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

        {/* Card content */}
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{config.emoji}</div>
              <div>
                <h3 className="text-2xl font-bold text-white leading-tight">
                  {idea.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Tag className="w-3 h-3 text-gray-400" />
                  <span className="text-sm text-gray-400 uppercase tracking-wide">
                    {idea.category.replace('_', ' ')}{idea.scan_type ? ` - ${idea.scan_type.replace('_', ' ')}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-3 mb-6">
            {idea.effort && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg">
                <EffortIcon className={`w-4 h-4 ${effortConfig[idea.effort]?.color || 'text-gray-400'}`} />
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Effort</div>
                  <div className={`text-sm font-bold ${effortConfig[idea.effort]?.color || 'text-gray-400'}`}>
                    {effortConfig[idea.effort]?.label || 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {idea.impact && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg">
                <ImpactIcon className={`w-4 h-4 ${impactConfig[idea.impact]?.color || 'text-gray-400'}`} />
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Impact</div>
                  <div className={`text-sm font-bold ${impactConfig[idea.impact]?.color || 'text-gray-400'}`}>
                    {impactConfig[idea.impact]?.label || 'N/A'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Related Goal */}
          {goalTitle && (
            <div className="mb-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <Target className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-[10px] text-purple-400 uppercase">Related Goal</div>
                  <div className="text-sm font-semibold text-purple-300">{goalTitle}</div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Description
            </h4>
            <p className="text-base text-gray-200 leading-relaxed line-clamp-6">
              {idea.description || 'No description provided'}
            </p>
          </div>

          {/* Reasoning */}
          {idea.reasoning && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Reasoning
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">
                {idea.reasoning}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-400">{projectName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(idea.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 via-transparent to-transparent pointer-events-none"></div>
      </div>
    </motion.div>
  );
}
