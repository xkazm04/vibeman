'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DbIdea } from '@/app/db';
import { FilteredIdeaGroup, groupIdeasByDate } from '../lib/filterIdeas';
import { Calendar, Sparkles, TrendingUp, Package } from 'lucide-react';

interface TotalViewDashboardProps {
  ideas: DbIdea[];
  isFiltered: boolean;
}

export default function TotalViewDashboard({ ideas, isFiltered }: TotalViewDashboardProps) {
  const groupedIdeas = groupIdeasByDate(ideas);

  const stats = React.useMemo(() => {
    const categories: Record<string, number> = {};
    ideas.forEach((idea) => {
      categories[idea.category] = (categories[idea.category] || 0) + 1;
    });

    return {
      total: ideas.length,
      categories: Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }, [ideas]);

  if (ideas.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Package className="w-16 h-16 text-gray-600 mb-4" />
        <p className="text-gray-400 text-lg">
          {isFiltered ? 'No ideas match your filters' : 'No implemented ideas yet'}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {isFiltered ? 'Try adjusting your filters' : 'Start implementing ideas to see them here'}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Stats Overview */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Total Ideas */}
        <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Total Ideas
            </h3>
          </div>
          <p className="text-3xl font-bold text-yellow-400">{stats.total}</p>
        </div>

        {/* Date Range */}
        <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Date Range
            </h3>
          </div>
          <p className="text-sm text-gray-300">
            {groupedIdeas.length > 0 && (
              <>
                {new Date(groupedIdeas[groupedIdeas.length - 1].date).toLocaleDateString()} -{' '}
                {new Date(groupedIdeas[0].date).toLocaleDateString()}
              </>
            )}
          </p>
        </div>

        {/* Top Category */}
        <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Top Category
            </h3>
          </div>
          {stats.categories.length > 0 && (
            <div>
              <p className="text-lg font-semibold text-green-400">{stats.categories[0][0]}</p>
              <p className="text-xs text-gray-500">{stats.categories[0][1]} ideas</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Ideas Timeline */}
      <AnimatePresence mode="popLayout">
        {groupedIdeas.map((group, groupIndex) => (
          <IdeaGroup key={group.date} group={group} index={groupIndex} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

interface IdeaGroupProps {
  group: FilteredIdeaGroup;
  index: number;
}

function IdeaGroup({ group, index }: IdeaGroupProps) {
  const dateObj = new Date(group.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-gray-800/20 border border-gray-700/40 rounded-xl overflow-hidden"
    >
      {/* Date Header */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-b border-gray-700/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-yellow-300">{formattedDate}</h3>
          </div>
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-semibold">
            {group.count} {group.count === 1 ? 'idea' : 'ideas'}
          </span>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {group.ideas.map((idea, ideaIndex) => (
          <IdeaCard key={idea.id} idea={idea} index={ideaIndex} />
        ))}
      </div>
    </motion.div>
  );
}

interface IdeaCardProps {
  idea: DbIdea;
  index: number;
}

function IdeaCard({ idea, index }: IdeaCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.02 }}
      className="bg-gray-800/60 border border-gray-700/40 rounded-lg p-4 hover:border-yellow-500/40 hover:bg-gray-800/80 transition-all cursor-pointer group"
      whileHover={{ y: -4 }}
    >
      {/* Category Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-semibold">
          {idea.category}
        </span>
        <Sparkles className="w-4 h-4 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-gray-200 mb-2 line-clamp-2">
        {idea.title}
      </h4>

      {/* Description */}
      {idea.description && (
        <p className="text-xs text-gray-400 line-clamp-3 mb-3">
          {idea.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {idea.effort && idea.impact && (
            <>
              Effort: {idea.effort} • Impact: {idea.impact}
            </>
          )}
        </span>
        <span className="text-yellow-400 font-mono">
          {new Date(idea.implemented_at!).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  );
}
