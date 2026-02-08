'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DbIdea } from '@/app/db';

// Lib imports
import { calculateImplementedStats } from '@/app/features/reflector/lib/filterIdeas';

// Component imports
import ReflectorHeader from '@/app/features/reflector/components/ReflectorHeader';
import ReflectorViewTabs, { ViewMode } from '@/app/features/reflector/components/ReflectorViewTabs';
import DependenciesTab from '@/app/features/Depndencies/DependenciesTab';
import ReflectionDashboard from '@/app/features/reflector/sub_Reflection/components/ReflectionDashboard';
import { WeeklyDashboard } from '@/app/features/reflector/sub_Weekly/components';
import ObservatoryDashboard from '@/app/features/reflector/sub_Observability/ObservatoryDashboard';

const ReflectorLayout = () => {
  const [ideas, setIdeas] = useState<DbIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');

  // Initialize and load ideas for header stats
  useEffect(() => {
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

  // Calculate stats for header
  const stats = useMemo(() => calculateImplementedStats(ideas), [ideas]);

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-900 via-yellow-900/10 to-gray-900">
      {/* Header with Stats */}
      <ReflectorHeader stats={stats} />

      {/* View Mode Tabs - inside header section */}
      <div className="border-b border-yellow-700/40 bg-gray-900/60 backdrop-blur-xl shadow-sm shadow-black/20">
        <div className="max-w-7xl mx-auto px-6 pb-4">
          <ReflectorViewTabs viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && viewMode === 'weekly' ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-gray-400 animate-pulse">Loading...</div>
          </div>
        ) : viewMode === 'weekly' ? (
          <WeeklyDashboard />
        ) : viewMode === 'dependencies' ? (
          <DependenciesTab />
        ) : viewMode === 'ideas_stats' ? (
          <ReflectionDashboard />
        ) : viewMode === 'observability' ? (
          <ObservatoryDashboard />
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(ReflectorLayout);
