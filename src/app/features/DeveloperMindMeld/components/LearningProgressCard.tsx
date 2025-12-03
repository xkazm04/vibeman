'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, Target, Zap, Shield, AlertTriangle } from 'lucide-react';
import { useDeveloperMindMeldStore } from '@/stores/developerMindMeldStore';

interface LearningProgressCardProps {
  projectId: string;
}

export default function LearningProgressCard({ projectId }: LearningProgressCardProps) {
  const { progress, isEnabled, skills } = useDeveloperMindMeldStore();

  if (!isEnabled || !progress) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Brain className="w-4 h-4" />
          <span className="text-sm">Mind-Meld is disabled</span>
        </div>
      </div>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-400';
    if (confidence >= 40) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 70) return 'High Confidence';
    if (confidence >= 40) return 'Learning';
    if (confidence >= 10) return 'Getting Started';
    return 'New Profile';
  };

  return (
    <motion.div
      className="bg-gray-900/70 backdrop-blur-xl border border-gray-700/50 rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-purple-300">Learning Progress</span>
          </div>
          <span className={`text-xs font-mono ${getConfidenceColor(progress.overallConfidence)}`}>
            {getConfidenceLabel(progress.overallConfidence)}
          </span>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="p-4 space-y-4">
        {/* Confidence Bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">AI Confidence</span>
            <span className={`text-sm font-mono font-semibold ${getConfidenceColor(progress.overallConfidence)}`}>
              {progress.overallConfidence}%
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                progress.overallConfidence >= 70
                  ? 'bg-gradient-to-r from-green-500 to-green-400'
                  : progress.overallConfidence >= 40
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                    : 'bg-gradient-to-r from-gray-500 to-gray-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress.overallConfidence}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <Target className="w-3 h-3" />
              <span className="text-[10px] uppercase">Decisions</span>
            </div>
            <span className="text-lg font-semibold text-gray-200">{progress.decisionsRecorded}</span>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <Zap className="w-3 h-3" />
              <span className="text-[10px] uppercase">Acceptance</span>
            </div>
            <span className="text-lg font-semibold text-gray-200">{progress.acceptanceRate}%</span>
          </div>
        </div>

        {/* Preferred Agents */}
        {progress.preferredAgents.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 mb-2">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-[10px] uppercase">Preferred Agents</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {progress.preferredAgents.slice(0, 4).map((agent) => (
                <span
                  key={agent}
                  className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[10px] text-green-400"
                >
                  {agent.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Avoided Agents */}
        {progress.avoidedAgents.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 mb-2">
              <TrendingDown className="w-3 h-3 text-red-400" />
              <span className="text-[10px] uppercase">Deprioritized</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {progress.avoidedAgents.slice(0, 4).map((agent) => (
                <span
                  key={agent}
                  className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400"
                >
                  {agent.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Skills */}
        {progress.topSkills.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 mb-2">
              <Shield className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] uppercase">Top Skills</span>
            </div>
            <div className="space-y-1.5">
              {progress.topSkills.slice(0, 3).map((skill) => (
                <div key={skill.area} className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 flex-1 capitalize">
                    {skill.area.replace(/_/g, ' ')}
                  </span>
                  <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${skill.proficiency}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 w-8 text-right">{skill.proficiency}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Areas to Improve */}
        {progress.areasToImprove.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 mb-2">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] uppercase">Areas to Improve</span>
            </div>
            <div className="space-y-1.5">
              {progress.areasToImprove.slice(0, 3).map((skill) => (
                <div key={skill.area} className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 flex-1 capitalize">
                    {skill.area.replace(/_/g, ' ')}
                  </span>
                  <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${skill.proficiency}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 w-8 text-right">{skill.proficiency}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Insights Badge */}
        {progress.activeInsightsCount > 0 && (
          <div className="flex items-center justify-center pt-2">
            <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <span className="text-xs text-purple-400">
                {progress.activeInsightsCount} active insight{progress.activeInsightsCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
