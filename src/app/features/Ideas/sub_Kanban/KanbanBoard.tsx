'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { DbIdea } from '@/app/db';
import { Sparkles } from 'lucide-react';
import KanbanColumn, { COLUMN_CONFIGS, type IdeaStatus } from './KanbanColumn';
import { useIdeas, useUpdateIdea, useInvalidateIdeas } from '@/lib/queries/ideaQueries';
import EmptyStateIllustration from '@/components/ui/EmptyStateIllustration';
import IdeasLoadingState from '@/app/features/Ideas/components/IdeasLoadingState';

interface KanbanBoardProps {
  filterProject: string;
  onIdeaClick: (idea: DbIdea) => void;
}

export default function KanbanBoard({ filterProject, onIdeaClick }: KanbanBoardProps) {
  const [draggedIdeaId, setDraggedIdeaId] = useState<string | null>(null);

  // Fetch all ideas (no status filter — we need all statuses for the board)
  const { ideas, isLoading } = useIdeas(
    filterProject !== 'all' ? { projectId: filterProject } : undefined
  );
  const updateIdea = useUpdateIdea();
  const invalidateIdeas = useInvalidateIdeas();

  // Group ideas by status
  const columns = useMemo(() => {
    const grouped: Record<IdeaStatus, DbIdea[]> = {
      pending: [],
      accepted: [],
      rejected: [],
      implemented: [],
    };
    for (const idea of ideas) {
      const status = (idea.status || 'pending') as IdeaStatus;
      if (grouped[status]) {
        grouped[status].push(idea);
      }
    }
    return grouped;
  }, [ideas]);

  const handleDragStart = useCallback((e: React.DragEvent, idea: DbIdea) => {
    e.dataTransfer.setData('text/plain', idea.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIdeaId(idea.id);
  }, []);

  const handleDrop = useCallback((ideaId: string, newStatus: IdeaStatus) => {
    setDraggedIdeaId(null);
    // Find the idea to check if status actually changed
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea || idea.status === newStatus) return;

    updateIdea.mutate(
      { ideaId, updates: { status: newStatus } },
      {
        onSuccess: () => {
          invalidateIdeas();
        },
      }
    );
  }, [ideas, updateIdea, invalidateIdeas]);

  if (isLoading) {
    return <IdeasLoadingState size="lg" label="Loading ideas..." />;
  }

  if (ideas.length === 0) {
    return (
      <EmptyStateIllustration
        type="ideas"
        headline="No ideas to display"
        description="Generate AI-powered insights by scanning your codebase. Ideas will appear here organized by their workflow status."
        action={{
          label: 'Generate Ideas',
          onClick: () => {
            const scanBtn = document.querySelector('[data-testid="ideas-scan-btn"]');
            if (scanBtn instanceof HTMLElement) {
              scanBtn.focus();
              scanBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          },
          icon: Sparkles,
        }}
        testId="kanban-empty"
      />
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-board">
      {COLUMN_CONFIGS.map((config) => (
        <KanbanColumn
          key={config.status}
          config={config}
          ideas={columns[config.status]}
          onIdeaClick={onIdeaClick}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
      ))}
    </div>
  );
}
