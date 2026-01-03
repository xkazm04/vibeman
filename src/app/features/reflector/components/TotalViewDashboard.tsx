'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DbIdea } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useContextStore } from '@/stores/contextStore';
import { groupIdeasByProjectAndContext } from '../lib/groupIdeasByProjectAndContext';
import { Sparkles, Package } from 'lucide-react';
import {
  ProjectSection,
  FocusedProjectView
} from '../sub_TotalViewDashboard';

interface TotalViewDashboardProps {
  ideas: DbIdea[];
  isFiltered: boolean;
}

export default function TotalViewDashboard({ ideas, isFiltered }: TotalViewDashboardProps) {
  const { projects } = useProjectConfigStore();
  const { contexts } = useContextStore();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [focusedProject, setFocusedProject] = useState<string | null>(null);

  // Group ideas by project and context
  const groupedData = useMemo(() => {
    return groupIdeasByProjectAndContext(ideas, projects, contexts);
  }, [ideas, projects, contexts]);

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
        <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-amber-500/30 rounded-lg border border-yellow-500/40">
          <Sparkles className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-yellow-400">
            {groupedData.totalIdeas} Ideas Implemented
          </h2>
          <p className="text-sm text-gray-400">
            Across {groupedData.projects.length} {groupedData.projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
      </motion.div>

      {/* Project sections */}
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
    </motion.div>
  );
}
