import { ProjectOverviewItem, AnnetteState } from '../types';

/**
 * Simulate Annette interaction with a project
 */
export const simulateAnnetteInteraction = async (
  project: ProjectOverviewItem,
  message: string = "Give me a comprehensive overview of this project"
): Promise<string> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return `I've analyzed ${project.name} and found interesting insights about its structure and goals.`;
};

/**
 * Handle Annette speak interaction
 */
export const handleAnnetteSpeak = async (
  project: ProjectOverviewItem,
  setAnnetteState: React.Dispatch<React.SetStateAction<AnnetteState>>,
  onAnnetteInteraction?: (project: ProjectOverviewItem, message: string) => void
): Promise<void> => {
  const testMessage = "Give me a comprehensive overview of this project";

  setAnnetteState(prev => ({
    ...prev,
    isActive: true,
    isProcessing: true,
    selectedProject: project
  }));

  if (onAnnetteInteraction) {
    onAnnetteInteraction(project, testMessage);
  }

  try {
    const response = await simulateAnnetteInteraction(project, testMessage);
    
    setAnnetteState(prev => ({
      ...prev,
      isProcessing: false,
      lastResponse: response
    }));
  } catch (error) {
    console.error('Annette interaction failed:', error);
    setAnnetteState(prev => ({
      ...prev,
      isProcessing: false,
      lastResponse: 'Sorry, I encountered an error while analyzing the project.'
    }));
  }
};