/**
 * Manager Feature Types
 * Types for implementation log management and improvement suggestions
 */

export interface EnrichedImplementationLog {
  id: string;
  project_id: string;
  project_name: string | null;
  context_id: string | null;
  context_name: string | null;
  context_group_id?: string | null;
  requirement_name: string;
  title: string;
  overview: string;
  overview_bullets: string | null;
  tested: number;
  screenshot: string | null;
  created_at: string;
}

export type AdvisorType = 'improve' | 'optimize' | 'refactor' | 'enhance';

export interface AdvisorConfig {
  type: AdvisorType;
  label: string;
  icon: any; // Lucide icon component
  color: string;
  description: string;
}

export interface LLMPromptContext {
  contextDescription?: string;
  previousOverview?: string;
  previousBullets?: string;
  userInput?: string;
}

export interface NewTaskPromptContext {
  contextDescription?: string;
  userInput: string;
  secondaryContextDescription?: string;
  isMultiproject?: boolean;
}

export interface ProjectContext {
  id: string;
  name: string;
  path: string;
}

export interface ImprovementRequest {
  log: EnrichedImplementationLog;
  advisorType?: AdvisorType;
  userInput: string;
  contextDescription?: string;
}
