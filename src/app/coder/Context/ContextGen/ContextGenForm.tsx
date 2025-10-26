'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { ContextGroup } from '@/stores/contextStore';
import { generateContextDescription } from './lib/contextGenApi';
import { UniversalSelect } from '@/components/ui/UniversalSelect';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';
import ProviderSelector from '@/components/llm/ProviderSelector';
import { SupportedProvider } from '@/lib/llm/types';

interface ContextGenFormProps {
  contextName: string;
  description: string;
  selectedGroupId: string;
  availableGroups: ContextGroup[];
  selectedFilePaths: string[];
  projectPath: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onGroupChange: (groupId: string) => void;
  onError: (error: string) => void;
}

export default function ContextGenForm({
  contextName,
  description,
  selectedGroupId,
  availableGroups,
  selectedFilePaths,
  projectPath,
  onNameChange,
  onDescriptionChange,
  onGroupChange,
  onError,
}: ContextGenFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('ollama');
  const [showProviderSelector, setShowProviderSelector] = useState(false);

  const handleInitiateGeneration = () => {
    if (selectedFilePaths.length === 0) {
      onError('Please select at least one file to generate description');
      return;
    }
    setShowProviderSelector(true);
  };

  const handleProviderSelect = async (provider: SupportedProvider) => {
    setSelectedProvider(provider);
    setShowProviderSelector(false);
    setIsGenerating(true);
    onError('');

    try {
      const result = await generateContextDescription({
        filePaths: selectedFilePaths,
        projectPath,
        provider,
      });

      // Update description with generated markdown content
      onDescriptionChange(result.description);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to generate description');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Context Name and Group in same row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Context Name *
          </label>
          <input
            type="text"
            value={contextName}
            onChange={(e) => {
              onNameChange(e.target.value);
              onError('');
            }}
            placeholder="e.g., Authentication Components"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            maxLength={50}
          />
        </div>

        <div>
          <UniversalSelect
            label="Group"
            value={selectedGroupId}
            onChange={(value) => {
              onGroupChange(value);
              onError('');
            }}
            options={availableGroups.map((group) => ({
              value: group.id,
              label: group.name,
            }))}
            required
            variant="cyber"
          />
        </div>
      </div>

      {/* Description with AI Generation */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300">
            Description (optional)
          </label>
          <div className="flex items-center gap-2">
            {/* Provider Selector - shown when user initiates generation */}
            <AnimatePresence>
              {showProviderSelector && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 px-2 py-1.5 bg-gray-800/60 border border-gray-600/40 rounded-lg"
                >
                  <span className="text-xs text-gray-400">Select provider:</span>
                  <ProviderSelector
                    selectedProvider={selectedProvider}
                    onSelectProvider={handleProviderSelect}
                    compact={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleInitiateGeneration}
              disabled={isGenerating || selectedFilePaths.length === 0}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                isGenerating || selectedFilePaths.length === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/40 hover:to-pink-600/40 text-purple-300 border border-purple-500/30'
              }`}
              title="Generate description using AI from selected files"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>AI Generate</span>
                </>
              )}
            </motion.button>

            {description && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30"
                title={isExpanded ? 'Minimize viewer' : 'Expand viewer'}
              >
                {isExpanded ? (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    <span>Minimize</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3" />
                    <span>Expand</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {description ? (
          <motion.div
            initial={false}
            animate={{
              height: isExpanded ? 'auto' : '300px',
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="relative overflow-hidden"
          >
            <div
              className={`bg-gray-800/50 border max-w-[80vw] border-gray-600/50 rounded-xl p-4 ${
                isExpanded ? 'overflow-auto' : 'overflow-hidden'
              }`}
              style={{ maxHeight: isExpanded ? 'none' : '300px' }}
            >
              <MarkdownViewer content={description} />
            </div>
            {!isExpanded && description.length > 500 && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-800 to-transparent pointer-events-none" />
            )}
          </motion.div>
        ) : (
          <div className="bg-gray-800/50 border border-gray-600/50 rounded-xl p-4 h-[300px] flex items-center justify-center">
            <p className="text-sm text-gray-500 text-center">
              {selectedFilePaths.length > 0
                ? 'Click "AI Generate" to create a description from selected files'
                : 'Select files to enable AI generation'}
            </p>
          </div>
        )}

        {description && (
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              {selectedFilePaths.length > 0
                ? `Generated from ${selectedFilePaths.length} file${selectedFilePaths.length > 1 ? 's' : ''}`
                : 'AI-generated markdown description'}
            </p>
            <p className="text-xs text-gray-500">{description.length} characters</p>
          </div>
        )}
      </div>
    </div>
  );
}
