'use client';
import React from 'react';

// NOTE: This component's buttons have been moved to ProjectsLayout
// This component is kept for backward compatibility but is now empty
// The buttons (Add Goal, Analyze Goal, Refresh) are now in the unified ProjectsLayout toolbar

interface GoalsActionsProps {
  selectedGoal?: any;
  onAddGoal?: () => void;
  onAnalyzeGoal?: () => void;
  onRefresh?: () => void;
}

export default function GoalsActions({
  selectedGoal,
  onAddGoal,
  onAnalyzeGoal,
  onRefresh
}: GoalsActionsProps) {
  // All functionality moved to ProjectsLayout
  // This component now renders nothing to avoid duplication
  return null;
} 