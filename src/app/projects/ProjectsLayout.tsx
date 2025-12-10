'use client';

import { motion } from 'framer-motion';
import { useAnalysisStore } from '../../stores/analysisStore';
import { useActiveProjectStore } from '../../stores/activeProjectStore';
import { useProjectsToolbarStore } from '../../stores/projectsToolbarStore';
import HighLevelDocsModalWrapper from './HighLevelDocsModalWrapper';
import ProjectAdd from './sub_ProjectSetting/components/ProjectAdd';
import ProjectEdit from './sub_ProjectSetting/components/ProjectEdit';
import ProjectToolbar from './ProjectToolbar';
import { useProjectConfigStore } from '../../stores/projectConfigStore';
import { useProjectUpdatesStore } from '../../stores/projectUpdatesStore';
import StructureTemplateEditor from '../Claude/sub_ClaudeStructureScan/components/StructureTemplateEditor';

export default function ProjectsLayout() {
  const { isActive } = useAnalysisStore();
  const { activeProject } = useActiveProjectStore();
  const { syncWithServer } = useProjectConfigStore();
  const { notifyProjectAdded, notifyProjectUpdated } = useProjectUpdatesStore();

  const {
    showAddProject,
    showEditProject,
    showAIReview,
    showStructure,
    setShowAddProject,
    setShowEditProject,
    setShowAIReview,
    setShowStructure,
  } = useProjectsToolbarStore();

  // Handle project added - refresh the project list and notify subscribers
  const handleProjectAdded = async (projectId?: string) => {
    await syncWithServer();
    // Notify other components (like UnifiedProjectSelector) about the new project
    notifyProjectAdded(projectId || 'new-project');
  };

  // Handle project updated - notify subscribers
  const handleProjectUpdated = (projectId?: string) => {
    notifyProjectUpdated(projectId || activeProject?.id || 'updated-project');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full py-5 flex flex-row wrap-normal
          bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border-b border-gray-700/30 ${
            isActive ? 'shadow-lg shadow-blue-500/20' : ''
          }`}
      >
        {/* Unified Project Toolbar */}
        <ProjectToolbar />
      </motion.div>

      {/* High-Level Documentation Modal */}
      <HighLevelDocsModalWrapper
        isOpen={showAIReview}
        onClose={() => setShowAIReview(false)}
      />

      {/* Add Project Modal */}
      <ProjectAdd
        isOpen={showAddProject}
        onClose={() => setShowAddProject(false)}
        onProjectAdded={handleProjectAdded}
      />

      {/* Edit Project Modal */}
      <ProjectEdit
        isOpen={showEditProject}
        onClose={() => setShowEditProject(false)}
        onProjectUpdated={handleProjectUpdated}
        project={activeProject}
      />

      {/* Structure Template Editor Modal */}
      {activeProject && (
        <StructureTemplateEditor
          isOpen={showStructure}
          onClose={() => setShowStructure(false)}
          projectType={(activeProject.type as 'nextjs' | 'fastapi') || 'nextjs'}
        />
      )}
    </>
  );
}
