import React from 'react';
import { motion } from 'framer-motion';
import { Plus, FolderOpen } from 'lucide-react';
import { useProjectConfigStore } from '../../../stores/projectConfigStore';
import { useActiveProjectStore } from '../../../stores/activeProjectStore';
import { useProjectsToolbarStore } from '../../../stores/projectsToolbarStore';
import { PreviewTab } from './ProjectTab';

export default function ProjectManagement() {
  const { projects } = useProjectConfigStore();
  const { activeProject, setActiveProject } = useActiveProjectStore();
  const { setShowAddProject } = useProjectsToolbarStore();

  const handleAddProject = () => {
    setShowAddProject(true);
  };

  const handleTabClick = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setActiveProject(project);
    }
  };

  return (
    <div className="relative flex items-center space-x-3 px-4 py-3 bg-gray-800/30 rounded-lg border border-gray-700/40 min-w-0 flex-1">
      {/* Section Label */}
      <div className="absolute -top-2 left-2 px-2 py-0.5 bg-gray-900 rounded text-xs font-bold text-blue-400 tracking-wider">
        PROJECT
      </div>
      
      <div className="flex items-center space-x-3 w-full">
        <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
        
        {/* Project Tabs */}
        <div className="flex items-center space-x-1 flex-1 overflow-x-auto">
          {projects.map((project) => (
            <div key={project.id} className="flex-shrink-0">
              <PreviewTab
                project={project}
                isActive={activeProject?.id === project.id}
                onTabClick={handleTabClick}
                compact={true}
              />
            </div>
          ))}
        </div>
        
        {/* Add Project Button */}
        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddProject}
          className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded-md text-cyan-400 transition-all duration-300 group text-sm flex-shrink-0"
          title="Add new project"
        >
          <Plus className="w-3 h-3 group-hover:rotate-90 transition-transform duration-300" />
          <span className="font-medium">Add</span>
        </motion.button>
      </div>
    </div>
  );
}