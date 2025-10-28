'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Code } from 'lucide-react';
import { ProjectOverviewItem, AnnetteState } from '../types';
import ProjectItem from './ProjectItem';

interface ProjectListProps {
  projects: ProjectOverviewItem[];
  loading: boolean;
  selectedProject: ProjectOverviewItem | null;
  hoveredProject: string | null;
  annetteState: AnnetteState;
  processes: Record<string, any>;
  serverLoading: Record<string, boolean>;
  onProjectSelect: (project: ProjectOverviewItem) => void;
  onProjectHover: (projectId: string | null) => void;
  onServerToggle: (projectId: string) => void;
  onAnnetteSpeak: (project: ProjectOverviewItem) => void;
}

const ProjectList = React.memo(({
  projects,
  loading,
  selectedProject,
  hoveredProject,
  annetteState,
  processes,
  serverLoading,
  onProjectSelect,
  onProjectHover,
  onServerToggle,
  onAnnetteSpeak
}: ProjectListProps) => {
  return (
    <div className="p-4">
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
        <AnimatePresence>
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center p-4"
            >
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              <span className="ml-2 text-sm text-gray-400">Loading...</span>
            </motion.div>
          ) : projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-4 text-gray-400"
            >
              <Code className="w-6 h-6 mx-auto mb-1 opacity-50" />
              <p className="text-sm">No projects found</p>
            </motion.div>
          ) : (
            projects.map((project, index) => (
              <ProjectItem
                key={project.id}
                project={project}
                index={index}
                selectedProject={selectedProject}
                hoveredProject={hoveredProject}
                annetteState={annetteState}
                processes={processes}
                serverLoading={serverLoading}
                onProjectSelect={onProjectSelect}
                onProjectHover={onProjectHover}
                onServerToggle={onServerToggle}
                onAnnetteSpeak={onAnnetteSpeak}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

ProjectList.displayName = 'ProjectList';

export default ProjectList;