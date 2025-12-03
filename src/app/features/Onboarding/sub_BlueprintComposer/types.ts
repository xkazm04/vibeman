/**
 * Blueprint Composer Types
 * Types for the visual blueprint composition interface
 */

import { ComponentType } from '@/lib/blueprint/types';

// Analyzer categorization
export type AnalyzerCategory = 'technical' | 'business';

// Component metadata for UI display
export interface ComponentMeta {
  id: string;
  componentId: string;
  type: ComponentType;
  category: AnalyzerCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  tags: string[];
  configSchema?: Record<string, unknown>;
  defaultConfig?: Record<string, unknown>;
  // Compatibility mapping: which processors work with this analyzer
  compatibleProcessors?: string[];
  // For business analyzers: list of available prompts
  availablePrompts?: PromptMeta[];
}

// Prompt metadata for business analyzers
export interface PromptMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'feature' | 'quality' | 'architecture' | 'user' | 'innovation';
}

// Decision node configuration
export interface DecisionNodeConfig {
  enabled: boolean;
  position: 'after-analyzer' | 'after-processor' | 'before-executor';
  autoApprove: boolean;
  approvalThreshold?: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    maxIssues?: number;
  };
}

// Blueprint composition state
export interface BlueprintComposition {
  id?: string;
  name: string;
  description: string;
  color: string;
  // Selected components
  analyzer: ComponentMeta | null;
  processors: ComponentMeta[];
  executor: ComponentMeta | null;
  // Configuration
  analyzerConfig?: Record<string, unknown>;
  processorConfigs?: Record<string, Record<string, unknown>>;
  executorConfig?: Record<string, unknown>;
  // Decision nodes
  decisionNodes: DecisionNodeConfig[];
  // For business analyzers
  selectedPrompt?: PromptMeta;
}

// Scan evidence for bottom panel
export interface ScanEvidence {
  id: string;
  blueprintId: string;
  name: string;
  color: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  issueCount?: number;
  timestamp: Date;
}

// Chain composition for serial scan execution
export interface ScanChain {
  id: string;
  name: string;
  description: string;
  blueprints: string[]; // Blueprint IDs in order
  createdAt: Date;
  updatedAt: Date;
}

// Color palette options
export const COLOR_PALETTE = [
  { name: 'Cyan', value: '#06b6d4', glow: 'rgba(6, 182, 212, 0.3)' },
  { name: 'Violet', value: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.3)' },
  { name: 'Pink', value: '#ec4899', glow: 'rgba(236, 72, 153, 0.3)' },
  { name: 'Emerald', value: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
  { name: 'Amber', value: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
  { name: 'Rose', value: '#f43f5e', glow: 'rgba(244, 63, 94, 0.3)' },
  { name: 'Indigo', value: '#6366f1', glow: 'rgba(99, 102, 241, 0.3)' },
  { name: 'Teal', value: '#14b8a6', glow: 'rgba(20, 184, 166, 0.3)' },
];

// Composer view tab
export type ComposerTab = 'compose' | 'chain';
