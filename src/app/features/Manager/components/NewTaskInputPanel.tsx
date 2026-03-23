/**
 * New Task Input Panel Component
 * Handles user input for new tasks with LLM advisors
 */

'use client';

import { Send } from 'lucide-react';
import { SupportedProvider } from '@/lib/llm/types';
import { AdvisorType } from '../lib/types';
import { generateNewTaskAdvisorSuggestion, generateNewTaskImplementationPlan } from '../lib/llmHelpers';
import { createRequirement } from '../lib/managerService';
import LLMInputForm from './LLMInputForm';

interface NewTaskInputPanelProps {
    contextId?: string;
    projectId?: string;
    projectPath?: string;
    secondaryProjectId?: string;
    secondaryContextId?: string;
    secondaryProjectPath?: string;
    onRequirementCreated: (requirementName: string) => void;
}

export default function NewTaskInputPanel({
    contextId,
    projectId,
    projectPath,
    secondaryProjectId,
    secondaryContextId,
    onRequirementCreated,
}: NewTaskInputPanelProps) {
    const handleGenerateAdvisor = (
        value: string,
        advisorType: AdvisorType,
        provider: SupportedProvider,
    ) => generateNewTaskAdvisorSuggestion(advisorType, value, contextId, projectId, provider);

    const handleGenerateAnalyst = async (value: string, provider: SupportedProvider) => {
        if (!projectPath) return { success: false, error: 'Project path required' };

        const plan = await generateNewTaskImplementationPlan(
            value,
            contextId,
            projectId,
            provider,
            secondaryProjectId,
            secondaryContextId,
        );

        const title = value.split('\n')[0].substring(0, 50) || 'New Task';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
        const requirementName = `${sanitizedTitle}-${timestamp}.md`;

        const result = await createRequirement(projectPath, requirementName, plan);
        if (result.success) {
            return { success: true, requirementName };
        }
        return { success: false, error: result.error || 'Unknown error' };
    };

    return (
        <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm p-6">
            <LLMInputForm
                heading="Describe Your Idea"
                placeholder="Describe the new feature or task you want to implement..."
                textareaRows={6}
                submitIdleContent={<><Send className="w-5 h-5" />Create Task</>}
                projectPath={projectPath}
                generateAdvisor={handleGenerateAdvisor}
                generateAnalyst={handleGenerateAnalyst}
                onAnalystSuccess={onRequirementCreated}
            />
        </div>
    );
}
