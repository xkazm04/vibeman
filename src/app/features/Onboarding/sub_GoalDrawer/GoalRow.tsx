'use client';

import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { Goal } from '@/types';
import { useState, useEffect } from 'react';

interface Idea {
  status: 'pending' | 'rejected' | 'accepted' | 'implemented';
  [key: string]: any;
}

interface IdeaStats {
  total: number;
  pending: number;
  rejected: number;
  accepted: number;
  implemented: number;
}

interface GoalRowProps {
  goal: Goal;
  onClick: () => void;
  delay?: number;
}

interface ProgressSegmentProps {
  count: number;
  total: number;
  delay: number;
  bgColor: string;
  borderColor: string;
  textColor: string;
  label: string;
}

const ProgressSegment = ({ count, total, delay, bgColor, borderColor, textColor, label }: ProgressSegmentProps) => {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${(count / total) * 100}%` }}
      transition={{ duration: 0.5, delay }}
      className={`${bgColor} ${borderColor} flex items-center justify-center relative group/segment`}
      title={`${count} ${label}`}
    >
      {count > 0 && (
        <span className={`text-[10px] font-mono font-bold ${textColor}`}>
          {count}
        </span>
      )}
      <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 border ${borderColor} rounded text-[10px] ${textColor} whitespace-nowrap opacity-0 group-hover/segment:opacity-100 transition-opacity pointer-events-none`}>
        {count} {label}
      </div>
    </motion.div>
  );
};

export default function GoalRow({ goal, onClick, delay = 0 }: GoalRowProps) {
  const [ideaStats, setIdeaStats] = useState<IdeaStats>({
    total: 0,
    pending: 0,
    rejected: 0,
    accepted: 0,
    implemented: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch ideas for this goal
    const fetchIdeas = async () => {
      try {
        const response = await fetch(`/api/ideas?projectId=${goal.projectId}&goalId=${goal.id}`);
        if (response.ok) {
          const data = await response.json();
          const ideas: Idea[] = data.ideas || [];

          // Calculate stats
          const stats: IdeaStats = {
            total: ideas.length,
            pending: ideas.filter((i) => i.status === 'pending').length,
            rejected: ideas.filter((i) => i.status === 'rejected').length,
            accepted: ideas.filter((i) => i.status === 'accepted').length,
            implemented: ideas.filter((i) => i.status === 'implemented').length,
          };

          setIdeaStats(stats);
        }
      } catch (error) {
        // Silent error - no console.log in production
      } finally {
        setLoading(false);
      }
    };

    fetchIdeas();
  }, [goal.projectId, goal.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-400';
      case 'in_progress': return 'text-cyan-400';
      case 'done': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'undecided': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      className="group relative bg-gray-800/40 border border-gray-700/40 hover:border-cyan-500/40 rounded-lg p-3 cursor-pointer transition-all hover:bg-gray-800/60"
    >
      {/* Goal Header */}
      <div className="flex items-start gap-2 mb-2">
        <div className="p-1.5 bg-cyan-500/10 rounded border border-cyan-500/30 flex-shrink-0">
          <Target className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
            {goal.title}
          </h3>
          <span className={`text-xs font-mono ${getStatusColor(goal.status)}`}>
            {goal.status}
          </span>
        </div>
      </div>

      {/* Ideas Progress Bar */}
      {!loading && ideaStats.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Ideas Progress</span>
            <span className="text-gray-400 font-mono">{ideaStats.total} total</span>
          </div>

          {/* Progress bar segments */}
          <div className="h-6 flex rounded overflow-hidden border border-gray-600/40">
            <ProgressSegment
              count={ideaStats.pending}
              total={ideaStats.total}
              delay={delay + 0.2}
              bgColor="bg-gray-700"
              borderColor="border-gray-600"
              textColor="text-gray-400"
              label="pending"
            />
            <ProgressSegment
              count={ideaStats.rejected}
              total={ideaStats.total}
              delay={delay + 0.3}
              bgColor="bg-red-900/60 border-l border-gray-600/40"
              borderColor="border-red-600"
              textColor="text-red-300"
              label="rejected"
            />
            <ProgressSegment
              count={ideaStats.accepted}
              total={ideaStats.total}
              delay={delay + 0.4}
              bgColor="bg-green-900/60 border-l border-gray-600/40"
              borderColor="border-green-600"
              textColor="text-green-300"
              label="accepted"
            />
            <ProgressSegment
              count={ideaStats.implemented}
              total={ideaStats.total}
              delay={delay + 0.5}
              bgColor="bg-amber-900/60 border-l border-gray-600/40"
              borderColor="border-amber-600"
              textColor="text-amber-300"
              label="implemented"
            />
          </div>
        </div>
      )}

      {/* No ideas state */}
      {!loading && ideaStats.total === 0 && (
        <div className="text-xs text-gray-500 italic">No ideas yet</div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="h-6 flex items-center">
          <div className="w-full h-1.5 bg-gray-700/40 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500/40 to-blue-500/40"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
