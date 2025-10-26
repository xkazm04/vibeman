'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, TrendingUp } from 'lucide-react';
import { DbIdea } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useContextStore } from '@/stores/contextStore';

export default function ReflectorPage() {
  const [ideas, setIdeas] = useState<DbIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'weekly' | 'total'>('weekly');

  const { projects, initializeProjects } = useProjectConfigStore();
  const { contexts } = useContextStore();

  useEffect(() => {
    initializeProjects();
    loadImplementedIdeas();
  }, []);

  const loadImplementedIdeas = async () => {
    try {
      const response = await fetch('/api/ideas?status=implemented');
      if (response.ok) {
        const data = await response.json();
        setIdeas(data.ideas || []);
      }
    } catch (error) {
      console.error('Error loading implemented ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter ideas for weekly view (last 7 days)
  const filteredIdeas = React.useMemo(() => {
    if (viewMode === 'total') return ideas;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return ideas.filter(idea => {
      if (!idea.implemented_at) return false;
      const implementedDate = new Date(idea.implemented_at);
      return implementedDate >= oneWeekAgo;
    });
  }, [ideas, viewMode]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return {
      today: ideas.filter(i => {
        if (!i.implemented_at) return false;
        const date = new Date(i.implemented_at);
        return date >= today;
      }).length,
      week: ideas.filter(i => {
        if (!i.implemented_at) return false;
        const date = new Date(i.implemented_at);
        return date >= weekAgo;
      }).length,
      month: ideas.filter(i => {
        if (!i.implemented_at) return false;
        const date = new Date(i.implemented_at);
        return date >= monthAgo;
      }).length,
    };
  }, [ideas]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/10 to-gray-900">
      {/* Header */}
      <motion.div
        className="border-b border-yellow-700/40 bg-gray-900/60 backdrop-blur-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            {/* Left: Title */}
            <div className="flex items-center space-x-4">
              <motion.div
                className="p-3 bg-gradient-to-br from-yellow-500/20 to-amber-500/30 rounded-xl border border-yellow-500/40"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Trophy className="w-6 h-6 text-yellow-400" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                  Reflector
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Implemented ideas and achievements
                </p>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                <div className="text-xs">
                  <span className="text-gray-500">Today:</span>{' '}
                  <span className="text-yellow-400 font-mono font-semibold">{stats.today}</span>
                </div>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Week:</span>{' '}
                <span className="text-yellow-400 font-mono font-semibold">{stats.week}</span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Month:</span>{' '}
                <span className="text-amber-400 font-mono font-semibold">{stats.month}</span>
              </div>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'weekly'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('total')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'total'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60'
              }`}
            >
              Reflection
            </button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : viewMode === 'weekly' ? (
          <div className="text-center py-24 text-gray-400">
            Weekly view content will be implemented here
            <br />
            {filteredIdeas.length} ideas implemented in the last 7 days
          </div>
        ) : (
          <div className="text-center py-24 text-gray-400">
            Total view coming soon...
          </div>
        )}
      </div>
    </div>
  );
}
