/**
 * User Input Panel Component
 * Handles user input for improvements with LLM advisors
 */

'use client';

import { useState } from 'react';
import { Check, Edit3 } from 'lucide-react';
import { EnrichedImplementationLog } from '../lib/types';
import { generateAdvisorSuggestion } from '../lib/llmHelpers';
import { generateRequirementFile, acceptImplementation } from '@/lib/tools';
import { SupportedProvider } from '@/lib/llm/types';
import { AdvisorType } from '../lib/types';
import LLMInputForm from './LLMInputForm';

interface UserInputPanelProps {
  log: EnrichedImplementationLog;
  onAccept: () => void;
  onRequirementCreated: (requirementName: string) => void;
  projectPath?: string;
}

export default function UserInputPanel({
  log,
  onAccept,
  onRequirementCreated,
  projectPath,
}: UserInputPanelProps) {
  const [showProposeInput, setShowProposeInput] = useState(false);

  const handleGenerateAdvisor = (
    value: string,
    advisorType: AdvisorType,
    provider: SupportedProvider,
  ) => generateAdvisorSuggestion(log, advisorType, value, provider);

  const handleGenerateAnalyst = async (value: string, provider: SupportedProvider) => {
    if (!projectPath) return { success: false, error: 'Project path required' };
    const result = await generateRequirementFile({
      contextId: log.context_id || undefined,
      projectId: log.project_id,
      projectPath,
      description: value,
      provider,
      title: log.title,
      previousOverview: log.overview,
      previousBullets: log.overview_bullets || undefined,
    });
    if (result.success && result.requirementName) {
      await acceptImplementation(log.id);
    }
    return result;
  };

  const handleAnalystSuccess = (requirementName: string) => {
    onRequirementCreated(requirementName);
    setTimeout(() => onAccept(), 1500);
  };

  return (
    <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm p-6">
      {!showProposeInput ? (
        <>
          <h3 className="text-sm font-semibold text-gray-300 mb-4">What would you like to do?</h3>
          <div className="flex gap-3">
            <button
              onClick={onAccept}
              className="flex-1 px-4 py-3 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2 font-medium"
              data-testid="accept-button"
            >
              <Check className="w-5 h-5" />
              Accept
            </button>
            <button
              onClick={() => setShowProposeInput(true)}
              className="flex-1 px-4 py-3 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-2 font-medium"
              data-testid="propose-change-button"
            >
              <Edit3 className="w-5 h-5" />
              Propose Change
            </button>
          </div>
        </>
      ) : (
        <LLMInputForm
          heading="Propose a Change"
          placeholder="Describe what you'd like to change, or click an AI advisor for suggestions..."
          textareaRows={4}
          submitIdleContent={<>Submit Change</>}
          onCancel={() => setShowProposeInput(false)}
          projectPath={projectPath}
          generateAdvisor={handleGenerateAdvisor}
          generateAnalyst={handleGenerateAnalyst}
          onAnalystSuccess={handleAnalystSuccess}
        />
      )}
    </div>
  );
}
