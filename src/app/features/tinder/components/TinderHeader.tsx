'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { UniversalSelect } from '@/components/ui/UniversalSelect';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { TinderStats } from '../lib/tinderHooks';
import { TINDER_ANIMATIONS } from '../lib/tinderUtils';

interface TinderHeaderProps {
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  remainingCount: number;
  stats: TinderStats;
  loading?: boolean;
  processing?: boolean;
}

export default function TinderHeader({
  selectedProjectId,
  onProjectChange,
  remainingCount,
  stats,
  loading = false,
  processing = false,
}: TinderHeaderProps) {
  const { projects } = useProjectConfigStore();

  const projectOptions = [
    { value: 'all', label: 'All Projects' },
    ...projects.map(project => ({
      value: project.id,
      label: project.name,
    })),
  ];

  return (
    <div className="border-b border-gray-700/40 bg-gray-900/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Title */}
          <div className="flex items-center space-x-4">
            <motion.div
              className="p-3 bg-gradient-to-br from-pink-500/20 to-purple-500/30 rounded-xl border border-pink-500/40"
              animate={{ rotate: TINDER_ANIMATIONS.HEART_ROTATION.rotate }}
              transition={TINDER_ANIMATIONS.HEART_ROTATION.transition}
            >
              <Heart className="w-6 h-6 text-pink-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Idea Tinder
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Swipe right to accept, left to reject
              </p>
            </div>
          </div>

          {/* Center: Project Filter */}
          <div className="flex items-center">
            <UniversalSelect
              value={selectedProjectId}
              onChange={onProjectChange}
              options={projectOptions}
              disabled={loading || processing}
              className="min-w-[200px]"
            />
          </div>

          {/* Right: Stats */}
          <div className="flex items-center space-x-6">
            <div className="text-sm">
              <span className="text-gray-500">Remaining:</span>{' '}
              <span className="text-white font-mono font-semibold">{remainingCount}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Accepted:</span>{' '}
              <span className="text-green-400 font-mono font-semibold">{stats.accepted}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Rejected:</span>{' '}
              <span className="text-red-400 font-mono font-semibold">{stats.rejected}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Deleted:</span>{' '}
              <span className="text-gray-400 font-mono font-semibold">{stats.deleted}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}