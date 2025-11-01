/**
 * Custom hooks for Tinder functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { DbIdea } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { fetchIdeasBatch, acceptIdea, rejectIdea, deleteIdea } from './tinderApi';
import { TINDER_CONSTANTS } from './tinderUtils';

export interface TinderStats {
  accepted: number;
  rejected: number;
  deleted: number;
}

export interface UseTinderIdeasResult {
  ideas: DbIdea[];
  currentIndex: number;
  loading: boolean;
  processing: boolean;
  hasMore: boolean;
  total: number;
  stats: TinderStats;
  remainingCount: number;
  currentIdea: DbIdea | undefined;
  handleAccept: () => Promise<void>;
  handleReject: () => Promise<void>;
  handleDelete: () => Promise<void>;
  resetStats: () => void;
  loadIdeas: () => Promise<void>;
}

export function useTinderIdeas(selectedProjectId: string): UseTinderIdeasResult {
  const [ideas, setIdeas] = useState<DbIdea[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TinderStats>({ accepted: 0, rejected: 0, deleted: 0 });

  const { getProject } = useProjectConfigStore();

  const loadIdeas = useCallback(async (offset: number = 0) => {
    setLoading(true);
    try {
      const result = await fetchIdeasBatch(
        selectedProjectId === 'all' ? undefined : selectedProjectId,
        offset,
        TINDER_CONSTANTS.BATCH_SIZE
      );

      if (offset === 0) {
        setIdeas(result.ideas);
        setCurrentIndex(0);
      } else {
        setIdeas(prev => [...prev, ...result.ideas]);
      }

      setHasMore(result.hasMore);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load ideas:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  const loadMoreIfNeeded = useCallback(() => {
    // Load more when we're N cards away from the end
    if (currentIndex >= ideas.length - TINDER_CONSTANTS.LOAD_MORE_THRESHOLD && hasMore && !loading) {
      console.log('[Tinder] Loading more ideas...');
      loadIdeas(ideas.length);
    }
  }, [currentIndex, ideas.length, hasMore, loading, loadIdeas]);

  const moveToNext = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
    loadMoreIfNeeded();
  }, [loadMoreIfNeeded]);

  const handleAccept = useCallback(async () => {
    if (processing || currentIndex >= ideas.length) return;

    const currentIdea = ideas[currentIndex];
    const selectedProject = getProject(currentIdea.project_id);

    if (!selectedProject || !selectedProject.path) {
      alert('Project path not found. Cannot create requirement file.');
      return;
    }

    setProcessing(true);
    try {
      await acceptIdea(currentIdea.id, selectedProject.path);
      setStats(prev => ({ ...prev, accepted: prev.accepted + 1 }));
      moveToNext();
    } catch (error) {
      console.error('Failed to accept idea:', error);
      alert('Failed to accept idea: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, ideas, getProject, moveToNext]);

  const handleReject = useCallback(async () => {
    if (processing || currentIndex >= ideas.length) return;

    const currentIdea = ideas[currentIndex];
    const selectedProject = getProject(currentIdea.project_id);

    setProcessing(true);
    try {
      await rejectIdea(currentIdea.id, selectedProject?.path);
      setStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
      moveToNext();
    } catch (error) {
      console.error('Failed to reject idea:', error);
      alert('Failed to reject idea');
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, ideas, getProject, moveToNext]);

  const handleDelete = useCallback(async () => {
    if (processing || currentIndex >= ideas.length) return;

    const currentIdea = ideas[currentIndex];

    if (!confirm('Are you sure you want to permanently delete this idea?')) {
      return;
    }

    setProcessing(true);
    try {
      await deleteIdea(currentIdea.id);
      setStats(prev => ({ ...prev, deleted: prev.deleted + 1 }));
      moveToNext();
    } catch (error) {
      console.error('Failed to delete idea:', error);
      alert('Failed to delete idea');
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, ideas, moveToNext]);

  const resetStats = useCallback(() => {
    setStats({ accepted: 0, rejected: 0, deleted: 0 });
  }, []);

  // Load initial batch when selectedProjectId changes
  useEffect(() => {
    loadIdeas(0);
  }, [loadIdeas]);

  const currentIdea = ideas[currentIndex];
  const remainingCount = total - currentIndex;

  return {
    ideas,
    currentIndex,
    loading,
    processing,
    hasMore,
    total,
    stats,
    remainingCount,
    currentIdea,
    handleAccept,
    handleReject,
    handleDelete,
    resetStats,
    loadIdeas: () => loadIdeas(0),
  };
}

export function useTinderKeyboardShortcuts(
  handleAccept: () => void,
  handleReject: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or select
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleReject();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleAccept();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAccept, handleReject, enabled]);
}