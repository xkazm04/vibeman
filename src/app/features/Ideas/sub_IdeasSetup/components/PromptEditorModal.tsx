'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Download, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ScanType } from '../../lib/scanTypes';

interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanType: ScanType;
  promptLabel: string;
}

export default function PromptEditorModal({
  isOpen,
  onClose,
  scanType,
  promptLabel
}: PromptEditorModalProps) {
  const [promptContent, setPromptContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Load prompt content when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPrompt();
    }
  }, [isOpen, scanType]);

  const loadPrompt = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Find the prompt file path based on scan type
      const promptFileName = getPromptFileName(scanType);
      const response = await fetch(`/api/disk/read-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: `src/app/projects/ProjectAI/ScanIdeas/prompts/${promptFileName}`
        })
      });

      const data = await response.json();
      if (data.success && data.content) {
        // Extract the editable parts (between function declaration and return statement)
        const extractedContent = extractEditableContent(data.content);
        setPromptContent(extractedContent);
      } else {
        setError('Failed to load prompt content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const savePrompt = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      const promptFileName = getPromptFileName(scanType);
      const response = await fetch(`/api/disk/save-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: `src/app/projects/ProjectAI/ScanIdeas/prompts/${promptFileName}`,
          content: promptContent
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Prompt saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to save prompt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-8 z-50 flex flex-col bg-gray-900 border-2 border-gray-700/50 rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-cyan-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Edit Prompt: {promptLabel}</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Customize the AI agent behavior and focus areas
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-400">Loading prompt...</div>
                </div>
              ) : (
                <>
                  {/* Status Messages */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  {successMessage && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                      {successMessage}
                    </div>
                  )}

                  {/* Textarea Editor */}
                  <textarea
                    value={promptContent}
                    onChange={(e) => setPromptContent(e.target.value)}
                    className="flex-1 w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 text-gray-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Enter prompt content in TypeScript/Markdown format..."
                    spellCheck={false}
                  />

                  {/* Helper Text */}
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-xs">
                    <strong>Note:</strong> Edit the prompt template carefully. The content will be used as-is in the TypeScript file.
                    Make sure to maintain valid TypeScript syntax and template literal format.
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700/50">
              <div className="text-sm text-gray-400">
                File: <code className="text-cyan-400">...prompts/{getPromptFileName(scanType)}</code>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={savePrompt}
                  disabled={isSaving || isLoading}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Map scan type to prompt filename
 */
function getPromptFileName(scanType: ScanType): string {
  const fileMap: Record<ScanType, string> = {
    zen_architect: 'zenArchitectPrompt.ts',
    bug_hunter: 'bugHunterPrompt.ts',
    perf_optimizer: 'perfOptimizerPrompt.ts',
    security_protector: 'securityProtectorPrompt.ts',
    insight_synth: 'insightSynthPrompt.ts',
    ambiguity_guardian: 'ambiguityGuardianPrompt.ts',
    business_visionary: 'businessVisionaryPrompt.ts',
    ui_perfectionist: 'uiPerfectionistPrompt.ts',
    feature_scout: 'featureScoutPrompt.ts',
    onboarding_optimizer: 'onboardingOptimizerPrompt.ts',
    ai_integration_scout: 'aiIntegrationScoutPrompt.ts',
    delight_designer: 'delightDesignerPrompt.ts',
    refactor_analysis: 'refactorAnalysisPrompt.ts',
    code_refactor: 'codeRefactorPrompt.ts',
    pragmatic_integrator: 'pragmaticIntegratorPrompt.ts',
    user_empathy_champion: 'userEmpathyChampionPrompt.ts',
    accessibility_advocate: 'accessibilityAdvocatePrompt.ts',
    paradigm_shifter: 'paradigmShifterPrompt.ts',
    moonshot_architect: 'moonshotArchitectPrompt.ts',
    dev_experience_engineer: 'devExperienceEngineerPrompt.ts',
    data_flow_optimizer: 'dataFlowOptimizerPrompt.ts'
  };

  return fileMap[scanType] || 'zenArchitectPrompt.ts';
}

/**
 * Extract editable content from the full TypeScript file
 * This extracts the template literal content from the return statement
 */
function extractEditableContent(fullContent: string): string {
  // Try to extract the template literal from the return statement
  const returnMatch = fullContent.match(/return\s+`([\s\S]*?)`\s*;?\s*\}/);
  if (returnMatch && returnMatch[1]) {
    return returnMatch[1].trim();
  }

  // If that fails, return the full content
  return fullContent;
}
