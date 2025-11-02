'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Box } from 'lucide-react';
import { DbIdea, DbGoal } from '@/app/db';
import ContextMenu from '@/components/ContextMenu';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface IdeaDetailMetaProps {
  idea: DbIdea;
  onUpdate: (updates: Partial<DbIdea>) => Promise<void>;
}

export default function IdeaDetailMeta({ idea, onUpdate }: IdeaDetailMetaProps) {
  const activeProject = useActiveProjectStore(state => state.activeProject);
  const [goalTitle, setGoalTitle] = useState<string | null>(null);
  const [contextName, setContextName] = useState<string | null>(null);
  const [loadingGoal, setLoadingGoal] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);

  // Context menu states
  const [showGoalMenu, setShowGoalMenu] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [availableGoals, setAvailableGoals] = useState<DbGoal[]>([]);
  const [availableContexts, setAvailableContexts] = useState<any[]>([]);

  // Fetch goal title if goal_id exists
  useEffect(() => {
    if (idea.goal_id) {
      setLoadingGoal(true);
      fetch(`/api/goals?id=${idea.goal_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.goal) {
            setGoalTitle(data.goal.title);
          }
        })
        .catch(err => console.error('Error fetching goal:', err))
        .finally(() => setLoadingGoal(false));
    } else {
      setGoalTitle(null);
    }
  }, [idea.goal_id]);

  // Fetch context name if context_id exists
  useEffect(() => {
    if (idea.context_id) {
      setLoadingContext(true);
      fetch(`/api/contexts?id=${idea.context_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.data?.context) {
            setContextName(data.data.context.name);
          }
        })
        .catch(err => console.error('Error fetching context:', err))
        .finally(() => setLoadingContext(false));
    } else {
      setContextName(null);
    }
  }, [idea.context_id]);

  const handleGoalClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    
    setMenuPosition({ x: e.clientX, y: e.clientY });

    // Fetch available open goals from active project only
    try {
      const response = await fetch(`/api/goals?projectId=${activeProject.id}`);
      const data = await response.json();
      const openGoals = data.goals?.filter((g: DbGoal) => g.status === 'open') || [];
      setAvailableGoals(openGoals);
      setShowGoalMenu(true);
    } catch (err) {
      console.error('Error fetching goals:', err);
    }
  };

  const handleContextClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    
    setMenuPosition({ x: e.clientX, y: e.clientY });

    // Fetch available contexts from active project only
    try {
      const response = await fetch(`/api/contexts?projectId=${activeProject.id}`);
      const data = await response.json();
      const contexts = data.data?.contexts || [];
      setAvailableContexts(contexts);
      setShowContextMenu(true);
    } catch (err) {
      console.error('Error fetching contexts:', err);
    }
  };

  const selectGoal = async (goalId: string | null) => {
    // Optimistically update the UI
    if (goalId) {
      const selectedGoal = availableGoals.find(g => g.id === goalId);
      if (selectedGoal) {
        setGoalTitle(selectedGoal.title);
      }
    } else {
      setGoalTitle(null);
    }
    
    setShowGoalMenu(false);
    
    try {
      await onUpdate({ goal_id: goalId });
    } catch (err) {
      console.error('Error updating goal:', err);
      // Revert on error by re-fetching
      if (idea.goal_id) {
        const response = await fetch(`/api/goals?id=${idea.goal_id}`);
        const data = await response.json();
        setGoalTitle(data.goal?.title || null);
      } else {
        setGoalTitle(null);
      }
    }
  };

  const selectContext = async (contextId: string | null) => {
    // Optimistically update the UI
    if (contextId) {
      const selectedContext = availableContexts.find(c => c.id === contextId);
      if (selectedContext) {
        setContextName(selectedContext.name);
      }
    } else {
      setContextName(null);
    }
    
    setShowContextMenu(false);
    
    try {
      await onUpdate({ context_id: contextId });
    } catch (err) {
      console.error('Error updating context:', err);
      // Revert on error by re-fetching
      if (idea.context_id) {
        const response = await fetch(`/api/contexts/detail?contextId=${idea.context_id}`);
        const data = await response.json();
        setContextName(data.data?.name || null);
      } else {
        setContextName(null);
      }
    }
  };

  return (
    <>
      <div className="flex items-center flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 bg-gray-800/40 border border-gray-700/40 rounded text-gray-400 font-mono">
          {new Date(idea.created_at).toLocaleDateString()}
        </span>
        <span className="px-2 py-1 bg-gray-800/40 border border-gray-700/40 rounded text-gray-400">
          {idea.category.replace('_', ' ')}
        </span>

        {/* Goal Badge - Clickable */}
        <motion.button
          data-testid="idea-meta-goal-button"
          onClick={handleGoalClick}
          className={`relative flex items-center gap-1.5 px-2 py-1 border rounded transition-colors ${
            goalTitle
              ? 'bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/30'
              : 'bg-gray-800/40 border-gray-600/40 hover:bg-gray-800/60 border-dashed'
          }`}
          whileHover={{
            scale: 1.05,
            boxShadow: goalTitle
              ? '0 0 12px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.2)'
              : '0 0 8px rgba(107, 114, 128, 0.3)'
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <Target className={`w-3 h-3 ${goalTitle ? 'text-purple-400' : 'text-gray-500'}`} />
          <span className={goalTitle ? 'text-purple-300 font-medium' : 'text-gray-500 italic'}>
            {loadingGoal ? 'Loading...' : goalTitle || 'no goal'}
          </span>
        </motion.button>

        {/* Context Badge - Clickable */}
        <motion.button
          data-testid="idea-meta-context-button"
          onClick={handleContextClick}
          className={`relative flex items-center gap-1.5 px-2 py-1 border rounded transition-colors ${
            contextName
              ? 'bg-blue-900/20 border-blue-500/30 hover:bg-blue-900/30'
              : 'bg-gray-800/40 border-gray-600/40 hover:bg-gray-800/60 border-dashed'
          }`}
          whileHover={{
            scale: 1.05,
            boxShadow: contextName
              ? '0 0 12px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.2)'
              : '0 0 8px rgba(107, 114, 128, 0.3)'
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <Box className={`w-3 h-3 ${contextName ? 'text-blue-400' : 'text-gray-500'}`} />
          <span className={contextName ? 'text-blue-300 font-medium' : 'text-gray-500 italic'}>
            {loadingContext ? 'Loading...' : contextName || 'no context'}
          </span>
        </motion.button>
      </div>

      {/* Context Menus */}
      <ContextMenu
        isOpen={showGoalMenu}
        position={menuPosition}
        onClose={() => setShowGoalMenu(false)}
        items={[
          ...availableGoals.map(goal => ({
            label: goal.title,
            onClick: () => selectGoal(goal.id),
            icon: Target,
          })),
          ...(idea.goal_id ? [{
            label: 'Remove Goal',
            onClick: () => selectGoal(null),
            destructive: true,
          }] : []),
        ]}
      />

      <ContextMenu
        isOpen={showContextMenu}
        position={menuPosition}
        onClose={() => setShowContextMenu(false)}
        items={[
          ...availableContexts.map(context => ({
            label: context.name,
            onClick: () => selectContext(context.id),
            icon: Box,
          })),
          ...(idea.context_id ? [{
            label: 'Remove Context',
            onClick: () => selectContext(null),
            destructive: true,
          }] : []),
        ]}
      />
    </>
  );
}
