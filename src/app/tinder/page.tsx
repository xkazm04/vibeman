'use client';

import React, { useState, useEffect } from 'react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import TinderHeader from '@/app/features/tinder/components/TinderHeader';
import TinderContent from '@/app/features/tinder/components/TinderContent';
import { useTinderIdeas, useTinderKeyboardShortcuts } from '@/app/features/tinder/lib/tinderHooks';

export default function TinderPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const { initializeProjects } = useProjectConfigStore();

  // Initialize projects on mount
  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Use the custom hook for tinder functionality
  const {
    ideas,
    currentIndex,
    currentIdea,
    loading,
    processing,
    stats,
    remainingCount,
    handleAccept,
    handleReject,
    handleDelete,
    resetStats,
    loadIdeas,
  } = useTinderIdeas(selectedProjectId);

  // Setup keyboard shortcuts
  useTinderKeyboardShortcuts(handleAccept, handleReject, !processing);

  const handleStartOver = () => {
    resetStats();
    loadIdeas();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <TinderHeader
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        remainingCount={remainingCount}
        stats={stats}
        loading={loading}
        processing={processing}
      />
      
      <TinderContent
        ideas={ideas}
        currentIndex={currentIndex}
        currentIdea={currentIdea}
        loading={loading}
        processing={processing}
        onAccept={handleAccept}
        onReject={handleReject}
        onDelete={handleDelete}
        onStartOver={handleStartOver}
      />
    </div>
  );
}
