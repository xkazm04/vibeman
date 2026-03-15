/**
 * Custom hooks for Tinder functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useMotionValue, useTransform, PanInfo, MotionValue } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { DbIdea } from '@/app/db';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { fetchIdeasBatch, acceptIdeaById, rejectIdeaById, deleteIdeaById } from './tinderItemsApi';
import { TINDER_CONSTANTS } from './tinderUtils';
import { ideaQueryKeys } from '@/lib/queries/ideaQueries';

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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [stats, setStats] = useState<TinderStats>({ accepted: 0, rejected: 0, deleted: 0 });

  const { getProject } = useServerProjectStore();
  const queryClient = useQueryClient();

  const loadIdeas = useCallback(async (cursor: string | null = null) => {
    setLoading(true);
    try {
      const result = await fetchIdeasBatch(
        selectedProjectId === 'all' ? undefined : selectedProjectId,
        cursor,
        TINDER_CONSTANTS.BATCH_SIZE
      );

      if (cursor === null) {
        setIdeas(result.ideas);
        setCurrentIndex(0);
      } else {
        setIdeas(prev => [...prev, ...result.ideas]);
      }

      setHasMore(result.hasMore);
      setTotal(result.total);
      setNextCursor(result.nextCursor);
    } catch (error) {
      // Silently fail - error will be visible through loading state
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  const loadMoreIfNeeded = useCallback(() => {
    // Load more when we're N cards away from the end
    if (currentIndex >= ideas.length - TINDER_CONSTANTS.LOAD_MORE_THRESHOLD && hasMore && !loading) {
      loadIdeas(nextCursor);
    }
  }, [currentIndex, ideas.length, hasMore, loading, loadIdeas, nextCursor]);

  const moveToNext = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
    loadMoreIfNeeded();
  }, [loadMoreIfNeeded]);

  const handleAccept = useCallback(async () => {
    if (processing || currentIndex >= ideas.length) return;

    const currentIdea = ideas[currentIndex];
    const ideaId = currentIdea.id;
    const selectedProject = getProject(currentIdea.project_id);

    if (!selectedProject || !selectedProject.path) {
      console.error('Project path not found. Cannot create requirement file.');
      return;
    }

    setProcessing(true);

    // Optimistically remove the idea by ID (index-independent)
    setIdeas(prev => prev.filter(idea => idea.id !== ideaId));

    try {
      await acceptIdeaById(ideaId, selectedProject.path);
      setStats(prev => ({ ...prev, accepted: prev.accepted + 1 }));
      queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all });
      loadMoreIfNeeded();
    } catch (error) {
      console.error('Failed to accept idea:', error);
      // Revert: re-insert at current index, clamped to array bounds
      setIdeas(prev => {
        const insertAt = Math.min(currentIndex, prev.length);
        const newIdeas = [...prev];
        newIdeas.splice(insertAt, 0, currentIdea);
        return newIdeas;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, ideas, getProject, loadMoreIfNeeded]);

  const handleReject = useCallback(async () => {
    if (processing || currentIndex >= ideas.length) return;

    const currentIdea = ideas[currentIndex];
    const ideaId = currentIdea.id;
    const selectedProject = getProject(currentIdea.project_id);

    setProcessing(true);

    // Optimistically remove the idea by ID (index-independent)
    setIdeas(prev => prev.filter(idea => idea.id !== ideaId));

    try {
      await rejectIdeaById(ideaId, selectedProject?.path);
      setStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
      queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all });
      loadMoreIfNeeded();
    } catch (error) {
      console.error('Failed to reject idea:', error);
      // Revert: re-insert at current index, clamped to array bounds
      setIdeas(prev => {
        const insertAt = Math.min(currentIndex, prev.length);
        const newIdeas = [...prev];
        newIdeas.splice(insertAt, 0, currentIdea);
        return newIdeas;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, ideas, getProject, loadMoreIfNeeded]);

  const handleDelete = useCallback(async () => {
    if (processing || currentIndex >= ideas.length) return;

    const currentIdea = ideas[currentIndex];
    const ideaId = currentIdea.id;

    setProcessing(true);

    // Optimistically remove the idea by ID (index-independent)
    setIdeas(prev => prev.filter(idea => idea.id !== ideaId));

    try {
      await deleteIdeaById(ideaId);
      setStats(prev => ({ ...prev, deleted: prev.deleted + 1 }));
      queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all });
      loadMoreIfNeeded();
    } catch (error) {
      console.error('Failed to delete idea:', error);
      // Revert: re-insert at current index, clamped to array bounds
      setIdeas(prev => {
        const insertAt = Math.min(currentIndex, prev.length);
        const newIdeas = [...prev];
        newIdeas.splice(insertAt, 0, currentIdea);
        return newIdeas;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, currentIndex, ideas, loadMoreIfNeeded]);

  const resetStats = useCallback(() => {
    setStats({ accepted: 0, rejected: 0, deleted: 0 });
  }, []);

  // Load initial batch when selectedProjectId changes
  useEffect(() => {
    loadIdeas(null);
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
    loadIdeas: () => loadIdeas(null),
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

export interface UseDragSwipeResult {
  x: MotionValue<number>;
  rotateZ: MotionValue<number>;
  exitX: number;
  exitOpacity: number;
  handleDragEnd: (_: unknown, info: PanInfo) => void;
}

/**
 * Shared drag/swipe handling for Tinder-style cards
 * Encapsulates motion values, exit animation state, and drag end logic
 */
export function useDragSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void
): UseDragSwipeResult {
  const x = useMotionValue(0);
  const rotateZ = useTransform(x, [-200, 200], [-15, 15]);

  const [exitX, setExitX] = useState(0);
  const [exitOpacity, setExitOpacity] = useState(1);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const threshold = 150;

    if (Math.abs(info.offset.x) > threshold) {
      // Swiped past threshold
      setExitX(info.offset.x > 0 ? 1000 : -1000);
      setExitOpacity(0);

      setTimeout(() => {
        if (info.offset.x > 0) {
          onSwipeRight();
        } else {
          onSwipeLeft();
        }
      }, 200);
    }
  }, [onSwipeLeft, onSwipeRight]);

  return {
    x,
    rotateZ,
    exitX,
    exitOpacity,
    handleDragEnd,
  };
}