'use client';
import { useState, useCallback } from 'react';
import { ProjectOverviewItem, AnnetteState } from '../types';
import { handleAnnetteSpeak } from './annetteApi';

/**
 * Custom hook for managing Annette state
 */
export const useAnnette = (
  onAnnetteInteraction?: (project: ProjectOverviewItem, message: string) => void
) => {
  const [annetteState, setAnnetteState] = useState<AnnetteState>({
    isActive: false,
    selectedProject: null,
    isProcessing: false,
    lastResponse: ''
  });

  const handleAnnetteInteraction = useCallback(async (project: ProjectOverviewItem) => {
    if (annetteState.isProcessing) return;
    
    await handleAnnetteSpeak(project, setAnnetteState, onAnnetteInteraction);
  }, [annetteState.isProcessing, onAnnetteInteraction]);

  const dismissResponse = useCallback(() => {
    setAnnetteState(prev => ({ ...prev, lastResponse: '' }));
  }, []);

  const updateSelectedProject = useCallback((project: ProjectOverviewItem) => {
    setAnnetteState(prev => ({ ...prev, selectedProject: project }));
  }, []);

  return {
    annetteState,
    handleAnnetteInteraction,
    dismissResponse,
    updateSelectedProject
  };
};