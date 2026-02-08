/**
 * Wizard Optimizer - Stub for backward compatibility
 */

export interface WizardPlan {
  id: string;
  steps: WizardStep[];
  estimatedTime?: string;
  dependencies?: string[];
}

export interface WizardStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}
