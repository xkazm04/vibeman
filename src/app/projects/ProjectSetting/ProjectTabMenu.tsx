import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Trash2 } from 'lucide-react';
import { Project } from '@/types';
import { useProjectsToolbarStore } from '../../../stores/projectsToolbarStore';

interface ProjectTabMenuProps {
  project: Project;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ProjectTabMenu({ 
  project, 
  isVisible, 
  position, 
  onClose 
}: ProjectTabMenuProps) {
  const { setShowEditProject, setShowDeleteProject, setSelectedProject } = useProjectsToolbarStore();

  // Close menu when clicking outside
  useEffect(() => {
    if (isVisible) {
      const handleClickOutside = () => onClose();
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };

      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isVisible, onClose]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setShowEditProject(true);
    onClose();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setShowDeleteProject(true);
    onClose();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.15 }}
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2 min-w-[160px] pointer-events-auto"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translateX(-50%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-600/30">
            <div className="text-xs font-semibold text-white font-mono truncate">
              {project.name}
            </div>
            <div className="text-xs text-gray-400 font-mono">
              Port {project.port}
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Edit Project */}
            <motion.button
              whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
              onClick={handleEdit}
              className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-300 hover:text-blue-400 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Project</span>
            </motion.button>

            {/* Delete Project */}
            <motion.button
              whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              onClick={handleDelete}
              className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Project</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}