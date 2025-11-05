'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, FileText, Sparkles } from 'lucide-react';
import ProviderSelector from '@/components/llm/ProviderSelector';
import { SupportedProvider } from '@/lib/llm/types';
import { trackCommand } from '../lib/analyticsWrapper';
import { AnnetteTheme } from './AnnetteThemeSwitcher';
import { THEME_CONFIGS } from './AnnetteThemeSwitcher';

interface AnnetteTestButtonsProps {
  theme: AnnetteTheme;
  isProcessing: boolean;
  activeProjectId: string | null;
  onSendToAnnette: (message: string, provider: SupportedProvider) => Promise<void>;
}

type TestType = 'ideas' | 'docs' | 'summarize' | null;

/**
 * Test buttons for Annette voice interface
 * Includes LLM provider selection before executing tests
 */
export default function AnnetteTestButtons({
  theme,
  isProcessing,
  activeProjectId,
  onSendToAnnette,
}: AnnetteTestButtonsProps) {
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('ollama');
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [pendingTest, setPendingTest] = useState<TestType>(null);

  const themeConfig = THEME_CONFIGS[theme];

  // Test configurations
  const TEST_CONFIGS = {
    ideas: {
      icon: Lightbulb,
      label: 'Ideas Count',
      title: 'Ask for pending ideas count',
      message: 'How many pending ideas does this project have?',
      command: 'test_ideas_count',
      colorScheme: 'purple',
    },
    docs: {
      icon: FileText,
      label: 'Check Docs',
      title: 'Ask if docs can be retrieved',
      message: 'Can you retrieve the high-level documentation for this project?',
      command: 'test_docs_retrieval',
      colorScheme: 'cyan',
    },
    summarize: {
      icon: Sparkles,
      label: 'Summarize',
      title: 'Ask to summarize project vision',
      message: 'Please summarize the project vision for me.',
      command: 'test_summarize',
      colorScheme: 'pink',
    },
  };

  const handleInitiateTest = (testType: TestType) => {
    if (!activeProjectId || !testType) return;
    setPendingTest(testType);
    setShowProviderSelector(true);
  };

  const handleProviderSelect = async (provider: SupportedProvider) => {
    if (!activeProjectId || !pendingTest) return;

    setSelectedProvider(provider);
    setShowProviderSelector(false);

    const testConfig = TEST_CONFIGS[pendingTest];

    // Track the command
    await trackCommand(activeProjectId, testConfig.command, 'button_command', async () => {
      await onSendToAnnette(testConfig.message, provider);
    }).catch(() => {});

    setPendingTest(null);
  };

  const handleCancelProviderSelection = () => {
    setShowProviderSelector(false);
    setPendingTest(null);
  };

  return (
    <div className="space-y-4">
      {/* Provider Selector Modal */}
      <AnimatePresence>
        {showProviderSelector && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3 p-4 bg-gray-800/60 border border-gray-600/40 rounded-xl backdrop-blur-md"
          >
            <span className="text-sm text-gray-300 font-medium">Select LLM Provider:</span>
            <ProviderSelector
              selectedProvider={selectedProvider}
              onSelectProvider={handleProviderSelect}
              compact={false}
            />
            <motion.button
              onClick={handleCancelProviderSelection}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test Buttons Row */}
      {!showProviderSelector && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 justify-center"
        >
          {(Object.keys(TEST_CONFIGS) as TestType[]).filter(Boolean).map((testKey) => {
            const config = TEST_CONFIGS[testKey!];
            const Icon = config.icon;

            return (
              <motion.button
                key={testKey}
                onClick={() => handleInitiateTest(testKey)}
                disabled={isProcessing || !activeProjectId}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative px-4 py-2 rounded-lg border transition-all duration-300 ${
                  isProcessing || !activeProjectId
                    ? 'border-gray-700/30 bg-gray-800/20 text-gray-600 cursor-not-allowed'
                    : `border-${config.colorScheme}-500/30 bg-${config.colorScheme}-500/10 ${themeConfig.colors.text} hover:border-${config.colorScheme}-500/50 hover:bg-${config.colorScheme}-500/20`
                }`}
                title={config.title}
                data-testid={`annette-test-${testKey}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-mono">{config.label}</span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
