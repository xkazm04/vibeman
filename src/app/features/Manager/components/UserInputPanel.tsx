/**
 * User Input Panel Component
 * Handles user input for improvements with LLM advisors
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit3, Loader2, CheckCircle } from 'lucide-react';
import ProviderSelector from '@/components/llm/ProviderSelector';
import { SupportedProvider } from '@/lib/llm/types';
import { ADVISOR_CONFIGS } from '../lib/advisorConfig';
import { AdvisorType, EnrichedImplementationLog } from '../lib/types';
import { generateAdvisorSuggestion } from '../lib/llmHelpers';
import { generateRequirementFile, acceptImplementation } from '@/lib/tools';

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
  const [proposedChange, setProposedChange] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorType | null>(null);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('openai');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<'advisor' | 'analyst' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAdvisorClick = async (advisorType: AdvisorType) => {
    setSelectedAdvisor(advisorType);
    setGenerationStep('advisor');
    setShowProviderSelector(true);
  };

  const handleProviderSelected = async (provider: SupportedProvider) => {
    setSelectedProvider(provider);
    setShowProviderSelector(false);
    setIsGenerating(true);

    try {
      if (generationStep === 'advisor' && selectedAdvisor) {
        // Generate advisor suggestion
        const suggestion = await generateAdvisorSuggestion(
          log,
          selectedAdvisor,
          proposedChange,
          provider
        );
        // Prepend suggestion to existing input
        setProposedChange(prev => {
          const newText = suggestion + (prev ? `\n\n${prev}` : '');
          return newText;
        });
        setSelectedAdvisor(null);
      } else if (generationStep === 'analyst') {
        // Generate implementation plan and create requirement using reusable tool
        if (projectPath) {
          const result = await generateRequirementFile({
            contextId: log.context_id || undefined,
            projectId: log.project_id,
            projectPath,
            description: proposedChange,
            provider,
            title: log.title,
            advisorType: selectedAdvisor || undefined,
            previousOverview: log.overview,
            previousBullets: log.overview_bullets || undefined,
          });

          if (result.success && result.requirementName) {
            // Mark log as tested using reusable tool
            await acceptImplementation(log.id);

            setSuccessMessage(`Requirement created: ${result.requirementName}`);
            onRequirementCreated(result.requirementName);
            // Trigger accept to remove from list
            setTimeout(() => {
              onAccept();
            }, 1500);
          } else {
            alert(`Failed to create requirement: ${result.error}`);
          }
        }
      }
    } catch (error) {
      console.error('LLM generation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate suggestion');
    } finally {
      setIsGenerating(false);
      setGenerationStep(null);
    }
  };

  const handleSubmitChange = () => {
    if (!proposedChange.trim()) return;
    setGenerationStep('analyst');
    setShowProviderSelector(true);
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
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">Propose a Change</h3>
            <button
              onClick={() => {
                setShowProposeInput(false);
                setProposedChange('');
                setSuccessMessage(null);
              }}
              className="text-xs text-gray-500 hover:text-gray-400"
            >
              Cancel
            </button>
          </div>

          {/* LLM Advisor Buttons */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">AI Advisors</span>
              {isGenerating && generationStep === 'advisor' && (
                <span className="text-xs text-cyan-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating...
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ADVISOR_CONFIGS.map((advisor) => {
                const Icon = advisor.icon;
                return (
                  <button
                    key={advisor.type}
                    onClick={() => handleAdvisorClick(advisor.type)}
                    disabled={isGenerating}
                    className={`p-2 rounded-lg bg-${advisor.color}-500/10 border border-${advisor.color}-500/30 hover:bg-${advisor.color}-500/20 transition-all flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={advisor.description}
                    data-testid={`advisor-${advisor.type}`}
                  >
                    <Icon className={`w-4 h-4 text-${advisor.color}-400`} />
                    <span className={`text-xs text-${advisor.color}-400`}>{advisor.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={proposedChange}
            onChange={(e) => setProposedChange(e.target.value)}
            placeholder="Describe what you'd like to change, or click an AI advisor for suggestions..."
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none mb-3"
            rows={4}
            disabled={isGenerating}
            data-testid="improvement-textarea"
          />

          {/* Success Message */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-3 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            onClick={handleSubmitChange}
            disabled={!proposedChange.trim() || isGenerating || !projectPath}
            className="w-full px-4 py-3 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            data-testid="submit-change-button"
          >
            {isGenerating && generationStep === 'analyst' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Requirement...
              </>
            ) : (
              <>Submit Change</>
            )}
          </button>

          {!projectPath && (
            <p className="text-xs text-amber-400 mt-2">⚠️ Project path required to create requirement</p>
          )}
        </>
      )}

      {/* Provider Selector Modal */}
      <AnimatePresence>
        {showProviderSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowProviderSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-cyan-500/30 rounded-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                {generationStep === 'advisor' ? 'Select AI Advisor Provider' : 'Select Analyst Provider'}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {generationStep === 'advisor'
                  ? 'Choose which LLM to use for generating improvement suggestions'
                  : 'Choose which LLM to use for creating the implementation plan'}
              </p>
              <div className="flex justify-center mb-6">
                <ProviderSelector
                  selectedProvider={selectedProvider}
                  onSelectProvider={handleProviderSelected}
                  showAllProviders={true}
                />
              </div>
              <button
                onClick={() => setShowProviderSelector(false)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
