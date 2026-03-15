/**
 * LLMInputForm
 * Shared form: advisor buttons, textarea, success message, submit button, provider modal.
 * Used by UserInputPanel and NewTaskInputPanel.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import ProviderSelector from '@/components/llm/ProviderSelector';
import { ADVISOR_COLOR_MAP, ADVISOR_CONFIGS } from '../lib/advisorConfig';
import { AdvisorType } from '../lib/types';
import { SupportedProvider } from '@/lib/llm/types';
import { useLLMAdvisorFlow } from '../hooks/useLLMAdvisorFlow';

interface LLMInputFormProps {
  heading: string;
  placeholder?: string;
  textareaRows?: number;
  /** Content rendered inside the submit button when idle (not generating). */
  submitIdleContent: React.ReactNode;
  /** When provided, a Cancel button appears and this is called on click. */
  onCancel?: () => void;
  projectPath?: string;
  generateAdvisor: (
    value: string,
    advisorType: AdvisorType,
    provider: SupportedProvider,
  ) => Promise<string>;
  generateAnalyst: (
    value: string,
    provider: SupportedProvider,
  ) => Promise<{ success: boolean; requirementName?: string; error?: string }>;
  onAnalystSuccess: (requirementName: string) => void;
}

export default function LLMInputForm({
  heading,
  placeholder = 'Describe what you want...',
  textareaRows = 4,
  submitIdleContent,
  onCancel,
  projectPath,
  generateAdvisor,
  generateAnalyst,
  onAnalystSuccess,
}: LLMInputFormProps) {
  const [value, setValue] = useState('');

  const flow = useLLMAdvisorFlow({
    onAdvisorSuggestion: (suggestion) => {
      setValue((prev) => suggestion + (prev ? `\n\n${prev}` : ''));
    },
    onAnalystSuccess,
    generateAdvisor: (advisorType, provider) => generateAdvisor(value, advisorType, provider),
    generateAnalyst: (provider) => generateAnalyst(value, provider),
  });

  const handleCancel = () => {
    setValue('');
    flow.setSuccessMessage(null);
    onCancel?.();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">{heading}</h3>
        {onCancel && (
          <button onClick={handleCancel} className="text-xs text-gray-500 hover:text-gray-400">
            Cancel
          </button>
        )}
      </div>

      {/* LLM Advisor Buttons */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">AI Advisors</span>
          {flow.isGenerating && flow.generationStep === 'advisor' && (
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
                onClick={() => flow.handleAdvisorClick(advisor.type)}
                disabled={flow.isGenerating}
                className={`p-2 rounded-lg ${ADVISOR_COLOR_MAP[advisor.type].button} transition-all flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed`}
                title={advisor.description}
              >
                <Icon className={ADVISOR_COLOR_MAP[advisor.type].icon} />
                <span className={ADVISOR_COLOR_MAP[advisor.type].text}>{advisor.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none mb-3"
        rows={textareaRows}
        disabled={flow.isGenerating}
      />

      {/* Success Message */}
      <AnimatePresence>
        {flow.successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-3 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">{flow.successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <button
        onClick={flow.handleSubmit}
        disabled={!value.trim() || flow.isGenerating || !projectPath}
        className="w-full px-4 py-3 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
      >
        {flow.isGenerating && flow.generationStep === 'analyst' ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating Requirement...
          </>
        ) : (
          submitIdleContent
        )}
      </button>

      {!projectPath && (
        <p className="text-xs text-amber-400 mt-2">⚠️ Project path required to create requirement</p>
      )}

      {/* Provider Selector Modal */}
      <AnimatePresence>
        {flow.showProviderSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => flow.setShowProviderSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-cyan-500/30 rounded-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                {flow.generationStep === 'advisor' ? 'Select AI Advisor Provider' : 'Select Analyst Provider'}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {flow.generationStep === 'advisor'
                  ? 'Choose which LLM to use for generating suggestions'
                  : 'Choose which LLM to use for creating the implementation plan'}
              </p>
              <div className="flex justify-center mb-6">
                <ProviderSelector
                  selectedProvider={flow.selectedProvider}
                  onSelectProvider={flow.handleProviderSelected}
                  showAllProviders={true}
                />
              </div>
              <button
                onClick={() => flow.setShowProviderSelector(false)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
