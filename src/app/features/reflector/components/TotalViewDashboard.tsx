'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DbIdea, DbDirection } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useContextStore } from '@/stores/contextStore';
import { groupIdeasByProjectAndContext } from '../lib/groupIdeasByProjectAndContext';
import { Sparkles, Package, Compass } from 'lucide-react';
import {
  ProjectSection,
  FocusedProjectView
} from '../sub_TotalViewDashboard';
import { SuggestionFilter } from '../lib/unifiedTypes';

interface TotalViewDashboardProps {
  ideas: DbIdea[];
  directions?: DbDirection[];
  suggestionType?: SuggestionFilter;
  isFiltered: boolean;
}

export default function TotalViewDashboard({ ideas, directions = [], suggestionType = 'ideas', isFiltered }: TotalViewDashboardProps) {
  const { projects } = useProjectConfigStore();
  const { contexts } = useContextStore();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [focusedProject, setFocusedProject] = useState<string | null>(null);

  // Filter based on suggestion type
  const displayedIdeas = useMemo(() => {
    if (suggestionType === 'directions') return [];
    return ideas;
  }, [ideas, suggestionType]);

  const displayedDirections = useMemo(() => {
    if (suggestionType === 'ideas') return [];
    return directions;
  }, [directions, suggestionType]);

  // Group ideas by project and context
  const groupedData = useMemo(() => {
    return groupIdeasByProjectAndContext(displayedIdeas, projects, contexts);
  }, [displayedIdeas, projects, contexts]);

  // Group directions by project
  const groupedDirections = useMemo(() => {
    const byProject = new Map<string, DbDirection[]>();
    displayedDirections.forEach(dir => {
      const projectId = dir.project_id;
      if (!byProject.has(projectId)) {
        byProject.set(projectId, []);
      }
      byProject.get(projectId)!.push(dir);
    });
    return Array.from(byProject.entries()).map(([projectId, dirs]) => ({
      projectId,
      projectName: projects.find(p => p.id === projectId)?.name || projectId,
      directions: dirs,
      totalDirections: dirs.length,
    }));
  }, [displayedDirections, projects]);

  const totalItems = useMemo(() => {
    return displayedIdeas.length + displayedDirections.length;
  }, [displayedIdeas, displayedDirections]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const enterFocusMode = (projectId: string) => {
    setFocusedProject(projectId);
  };

  const exitFocusMode = () => {
    setFocusedProject(null);
  };

  if (totalItems === 0) {
    const emptyMessage = suggestionType === 'directions'
      ? { main: 'No accepted directions yet', sub: 'Accept directions to see them here' }
      : suggestionType === 'both'
      ? { main: 'No implemented ideas or accepted directions', sub: 'Start implementing or accepting to see them here' }
      : { main: 'No implemented ideas yet', sub: 'Start implementing ideas to see them here' };

    return (
      <motion.div
        className="flex flex-col items-center justify-center py-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {suggestionType === 'directions' ? (
          <Compass className="w-16 h-16 text-gray-600 mb-4" />
        ) : (
          <Package className="w-16 h-16 text-gray-600 mb-4" />
        )}
        <p className="text-gray-400 text-lg">
          {isFiltered ? 'No items match your filters' : emptyMessage.main}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {isFiltered ? 'Try adjusting your filters' : emptyMessage.sub}
        </p>
      </motion.div>
    );
  }

  // Focus mode - show single project in detail
  if (focusedProject) {
    const project = groupedData.projects.find(p => p.projectId === focusedProject);
    if (project) {
      return (
        <FocusedProjectView
          project={project}
          onExit={exitFocusMode}
        />
      );
    }
  }

  // Standard dashboard view
  const headerText = suggestionType === 'directions'
    ? { count: displayedDirections.length, label: 'Directions Accepted', icon: 'cyan' }
    : suggestionType === 'both'
    ? { count: totalItems, label: `Items (${displayedIdeas.length} Ideas + ${displayedDirections.length} Directions)`, icon: 'yellow' }
    : { count: displayedIdeas.length, label: 'Ideas Implemented', icon: 'yellow' };

  const projectCount = suggestionType === 'directions'
    ? groupedDirections.length
    : suggestionType === 'both'
    ? new Set([...groupedData.projects.map(p => p.projectId), ...groupedDirections.map(p => p.projectId)]).size
    : groupedData.projects.length;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        <div className={`p-2 bg-gradient-to-br ${
          suggestionType === 'directions'
            ? 'from-cyan-500/20 to-teal-500/30 border-cyan-500/40'
            : 'from-yellow-500/20 to-amber-500/30 border-yellow-500/40'
        } rounded-lg border`}>
          {suggestionType === 'directions' ? (
            <Compass className="w-5 h-5 text-cyan-400" />
          ) : (
            <Sparkles className="w-5 h-5 text-yellow-400" />
          )}
        </div>
        <div>
          <h2 className={`text-xl font-bold ${
            suggestionType === 'directions' ? 'text-cyan-400' : 'text-yellow-400'
          }`}>
            {headerText.count} {headerText.label}
          </h2>
          <p className="text-sm text-gray-400">
            Across {projectCount} {projectCount === 1 ? 'project' : 'projects'}
          </p>
        </div>
      </motion.div>

      {/* Ideas Project sections */}
      {suggestionType !== 'directions' && groupedData.projects.length > 0 && (
        <AnimatePresence mode="popLayout">
          {groupedData.projects.map((project, index) => (
            <ProjectSection
              key={project.projectId}
              project={project}
              index={index}
              isExpanded={expandedProjects.has(project.projectId)}
              onToggle={() => toggleProject(project.projectId)}
              onFocus={() => enterFocusMode(project.projectId)}
            />
          ))}
        </AnimatePresence>
      )}

      {/* Directions sections */}
      {suggestionType !== 'ideas' && groupedDirections.length > 0 && (
        <div className="space-y-4">
          {suggestionType === 'both' && displayedIdeas.length > 0 && (
            <h3 className="text-lg font-semibold text-cyan-400 mt-8">Accepted Directions</h3>
          )}
          <AnimatePresence mode="popLayout">
            {groupedDirections.map((projectGroup, index) => (
              <motion.div
                key={`dir-${projectGroup.projectId}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-cyan-500/5 to-teal-600/5 border border-cyan-500/30 rounded-lg p-4"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Compass className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-gray-200">{projectGroup.projectName}</h3>
                  <span className="text-sm text-gray-500">({projectGroup.totalDirections} directions)</span>
                </div>
                <div className="grid gap-3">
                  {projectGroup.directions.map(dir => (
                    <div
                      key={dir.id}
                      className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3"
                    >
                      <p className="text-sm text-gray-300 font-medium">{dir.summary || 'No summary'}</p>
                      {dir.context_map_title && (
                        <p className="text-xs text-gray-500 mt-1">From: {dir.context_map_title}</p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
