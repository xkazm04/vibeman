'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Map } from 'lucide-react';
import {
  RoadmapHeader,
  RoadmapTimeline,
  InitiativeDetailPanel,
} from './components';
import { useStrategicRoadmapStore } from '@/stores/strategicRoadmapStore';

interface StrategicRoadmapProps {
  projectId: string;
}

export default function StrategicRoadmap({ projectId }: StrategicRoadmapProps) {
  const {
    isLoading,
    error,
    selectedInitiativeId,
    fetchRoadmap,
    fetchInitiatives,
    fetchMilestones,
    fetchPredictions,
    fetchInteractions,
    fetchSimulations,
    generateRoadmap,
  } = useStrategicRoadmapStore();

  // Load data on mount
  useEffect(() => {
    if (projectId) {
      Promise.all([
        fetchRoadmap(projectId),
        fetchInitiatives(projectId),
        fetchMilestones(projectId),
        fetchPredictions(projectId),
        fetchInteractions(projectId),
        fetchSimulations(projectId),
      ]);
    }
  }, [projectId, fetchRoadmap, fetchInitiatives, fetchMilestones, fetchPredictions, fetchInteractions, fetchSimulations]);

  const handleGenerate = () => {
    generateRoadmap(projectId, {
      includeDebt: true,
      includeIdeas: true,
      includeGoals: true,
      horizonMonths: 6,
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <RoadmapHeader projectId={projectId} onGenerate={handleGenerate} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Error State */}
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-red-400 mb-2">Error loading roadmap</div>
              <div className="text-sm text-gray-400">{error}</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Map className="w-8 h-8 text-cyan-400" />
            </motion.div>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && (
          <>
            <RoadmapTimeline />
            {selectedInitiativeId && <InitiativeDetailPanel />}
          </>
        )}
      </div>
    </div>
  );
}
