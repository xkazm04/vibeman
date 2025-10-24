'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { DbIdea } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useContextStore } from '@/stores/contextStore';

// Components
import IdeasHeader from '@/app/features/Ideas/components/IdeasHeader';
import IdeasContent from '@/app/features/Ideas/components/IdeasContent';
import IdeaDetailModal from '@/app/features/Ideas/components/IdeaDetailModal';
import ScanTypeSelector, { ScanType } from '@/app/features/Ideas/sub_IdeasSetup/ScanTypeSelector';
import ScanInitiator from '@/app/features/Ideas/sub_IdeasSetup/ScanInitiator';
import ProjectFilter from '@/app/features/Ideas/sub_IdeasSetup/ProjectFilter';

// Handlers and utilities
import { fetchIdeas, deleteAllIdeas } from '@/app/features/Ideas/lib/ideasHandlers';
import {
  getProjectName,
  getContextName,
  groupIdeasByProjectAndContext,
  calculateIdeaStats
} from '@/app/features/Ideas/lib/ideasUtils';

export default function IdeasPage() {
  const [ideas, setIdeas] = React.useState<DbIdea[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedIdea, setSelectedIdea] = React.useState<DbIdea | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<string>('pending');
  const [filterProject, setFilterProject] = React.useState<string>('all');
  const [filterContext, setFilterContext] = React.useState<string | null>(null);
  const [selectedScanTypes, setSelectedScanTypes] = React.useState<ScanType[]>(['overall']);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = React.useState(false);
  const [deletingAll, setDeletingAll] = React.useState(false);

  const { projects, initializeProjects } = useProjectConfigStore();
  const { contexts } = useContextStore();

  // Initialize projects on mount
  React.useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Fetch ideas on mount
  React.useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    const fetchedIdeas = await fetchIdeas();
    setIdeas(fetchedIdeas);
    setLoading(false);
  };

  const handleIdeaUpdate = async (updatedIdea: DbIdea) => {
    setIdeas(ideas.map(idea => idea.id === updatedIdea.id ? updatedIdea : idea));
    setSelectedIdea(updatedIdea);
  };

  const handleIdeaDelete = async (deletedIdeaId: string) => {
    setIdeas(ideas.filter(idea => idea.id !== deletedIdeaId));
    setSelectedIdea(null);
  };

  const handleIdeaClose = () => {
    setSelectedIdea(null);
  };

  const handleScanComplete = () => {
    loadIdeas();
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    const result = await deleteAllIdeas();
    if (result.success) {
      console.log(`Deleted ${result.deletedCount} ideas`);
      setIdeas([]);
      setShowDeleteAllConfirm(false);
    } else {
      console.error('Failed to delete all ideas');
    }
    setDeletingAll(false);
  };

  // Compute grouped ideas and stats
  const groupedIdeas = React.useMemo(() =>
    groupIdeasByProjectAndContext(ideas, filterStatus, filterProject),
    [ideas, filterStatus, filterProject]
  );

  const stats = React.useMemo(() => calculateIdeaStats(ideas), [ideas]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <IdeasHeader
        stats={stats}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        showDeleteConfirm={showDeleteAllConfirm}
        deletingAll={deletingAll}
        onDeleteAllClick={() => setShowDeleteAllConfirm(true)}
        onDeleteAllConfirm={handleDeleteAll}
        onDeleteAllCancel={() => setShowDeleteAllConfirm(false)}
      />

      {/* Scan Initiator - Standalone Row */}
      <ScanInitiator
        onScanComplete={handleScanComplete}
        selectedScanTypes={selectedScanTypes}
        selectedContextId={filterContext}
      />

      {/* Project Filter - Standalone Row */}
      <ProjectFilter
        projects={projects}
        selectedProjectId={filterProject}
        onSelectProject={setFilterProject}
        selectedContextId={filterContext}
        onSelectContext={setFilterContext}
      />

      {/* Content */}
      <div className="w-full px-6 py-8">
        {/* Scan Type Selector */}
        <div className="mb-8">
          <ScanTypeSelector selectedTypes={selectedScanTypes} onChange={setSelectedScanTypes} />
        </div>

        {/* Ideas Display */}
        <IdeasContent
          loading={loading}
          ideas={ideas}
          groupedIdeas={groupedIdeas}
          getProjectName={(id) => getProjectName(id, projects)}
          getContextName={(id) => getContextName(id, contexts)}
          onIdeaClick={setSelectedIdea}
        />
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedIdea && (
          <IdeaDetailModal
            idea={selectedIdea}
            onClose={handleIdeaClose}
            onUpdate={handleIdeaUpdate}
            onDelete={handleIdeaDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
