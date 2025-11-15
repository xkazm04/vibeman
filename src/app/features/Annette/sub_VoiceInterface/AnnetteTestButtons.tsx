'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProviderSelector from '@/components/llm/ProviderSelector';
import { SupportedProvider } from '@/lib/llm/types';
import { trackCommand } from '../lib/analyticsWrapper';
import { useThemeStore } from '@/stores/themeStore';

interface AnnetteTestButtonsProps {
  isProcessing: boolean;
  activeProjectId: string | null;
  onSendToAnnette: (message: string, provider: SupportedProvider) => Promise<void>;
  onPlayDirectResponse: (text: string) => Promise<void>;
}

type TestType = 'status' | 'nextStep' | 'analyze' | null;

/**
 * Test buttons for Annette voice interface
 * Includes LLM provider selection before executing tests
 */
export default function AnnetteTestButtons({
  isProcessing,
  activeProjectId,
  onSendToAnnette,
  onPlayDirectResponse,
}: AnnetteTestButtonsProps) {
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('ollama');
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [pendingTest, setPendingTest] = useState<TestType>(null);

  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  // Test configurations
  const TEST_CONFIGS = {
    status: {
      label: 'Status',
      title: 'Get current project status',
      message: 'What is the current status of this project?',
      command: 'project_status',
      shortcut: '1',
      useDirectApi: false,
    },
    nextStep: {
      label: 'Next Step',
      title: 'Get recommendation for next scan to execute',
      message: '', // Not used - goes directly to API
      command: 'next_step_recommendation',
      shortcut: '2',
      useDirectApi: true,
    },
    analyze: {
      label: 'Analyze',
      title: 'Analyze project insights',
      message: 'Please analyze the current project insights and goals.',
      command: 'project_analysis',
      shortcut: '3',
      useDirectApi: false,
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
      // For Next Step, call the direct API endpoint
      if (testConfig.useDirectApi && pendingTest === 'nextStep') {
        const response = await fetch('/api/annette/next-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: activeProjectId,
            provider,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Play the response directly without going through chat API
          await onPlayDirectResponse(data.response);
        } else {
          throw new Error(data.error || 'Failed to get next step recommendation');
        }
      } else {
        // For other tests, use the regular chat flow
        await onSendToAnnette(testConfig.message, provider);
      }
    }).catch(() => {});

    setPendingTest(null);
  };

  const handleCancelProviderSelection = () => {
    setShowProviderSelector(false);
    setPendingTest(null);
  };

  // Keyboard shortcuts (1, 2, 3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignore if showing provider selector
      if (showProviderSelector || isProcessing || !activeProjectId) {
        return;
      }

      const keyMap: Record<string, TestType> = {
        '1': 'status',
        '2': 'nextStep',
        '3': 'analyze',
      };

      const testType = keyMap[e.key];
      if (testType) {
        e.preventDefault();
        handleInitiateTest(testType);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showProviderSelector, isProcessing, activeProjectId]);

  return (
    <div className="relative">
      {/* Blueprint-styled Container */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className={`relative bg-gray-900/90 backdrop-blur-xl border ${colors.border} rounded-xl overflow-hidden shadow-xl`}
      >
        {/* Grid Pattern Background */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(${colors.baseColor}4D 1px, transparent 1px),
              linear-gradient(90deg, ${colors.baseColor}4D 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Ambient Glow */}
        <div className={`absolute inset-0 bg-gradient-to-r ${colors.primary} opacity-5 blur-2xl pointer-events-none`} />

        {/* Content */}
        <div className="relative p-3">
          {/* Provider Selector Modal */}
          <AnimatePresence>
            {showProviderSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col items-center gap-3 p-4 bg-gray-800/80 border ${colors.border} rounded-lg backdrop-blur-md`}
              >
                <span className={`text-xs ${colors.text} font-mono uppercase tracking-wide`}>Select LLM Provider:</span>
                <ProviderSelector
                  selectedProvider={selectedProvider}
                  onSelectProvider={handleProviderSelect}
                  compact={false}
                />
                <motion.button
                  onClick={handleCancelProviderSelection}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors font-mono"
                >
                  Cancel
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons Row */}
          {!showProviderSelector && (
            <div className="flex gap-3">
              {(Object.keys(TEST_CONFIGS) as TestType[]).filter(Boolean).map((testKey, idx) => {
                const config = TEST_CONFIGS[testKey!];

                return (
                  <motion.button
                    key={testKey}
                    onClick={() => handleInitiateTest(testKey)}
                    disabled={isProcessing || !activeProjectId}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: idx * 0.05,
                      type: 'spring',
                      stiffness: 300,
                      damping: 30
                    }}
                    className="relative flex-1 group overflow-hidden"
                    title={`${config.title} (Press ${config.shortcut})`}
                    data-testid={`annette-test-${testKey}`}
                  >
                    {/* Main Button Container */}
                    <div
                      className={`
                        relative h-16 w-full overflow-hidden border-2 rounded-lg
                        bg-gradient-to-br from-gray-900/40 via-transparent to-gray-800/40 backdrop-blur-sm
                        transition-all duration-300
                        ${
                          isProcessing || !activeProjectId
                            ? 'border-gray-700/30 opacity-50 cursor-not-allowed'
                            : `${colors.border} group-hover:from-gray-800/60 group-hover:to-gray-700/60 ${colors.borderHover}`
                        }
                      `}
                    >
                      {/* Vertical Bars Pattern */}
                      <div className="absolute inset-0 flex">
                        {Array.from({ length: 8 }).map((_, barIndex) => (
                          <motion.div
                            key={`v-${barIndex}`}
                            className={`flex-1 border-r ${colors.borderLight}`}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{
                              delay: idx * 0.05 + barIndex * 0.02,
                              duration: 0.3
                            }}
                          />
                        ))}
                      </div>

                      {/* Horizontal Bars Pattern */}
                      <div className="absolute inset-0 flex flex-col">
                        {Array.from({ length: 3 }).map((_, barIndex) => (
                          <motion.div
                            key={`h-${barIndex}`}
                            className={`flex-1 border-b ${colors.borderLight}`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{
                              delay: idx * 0.05 + barIndex * 0.03,
                              duration: 0.3
                            }}
                          />
                        ))}
                      </div>

                      {/* Large Semi-Transparent Number - Left Side */}
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-0">
                        <motion.span
                          className="text-6xl font-bold font-mono leading-none transition-colors duration-300"
                          style={{
                            color: isProcessing || !activeProjectId
                              ? 'rgba(55, 65, 81, 0.2)'
                              : `${colors.baseColor}33`,
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            delay: idx * 0.05 + 0.2,
                            type: "spring",
                            stiffness: 300,
                            damping: 30
                          }}
                        >
                          {config.shortcut}
                        </motion.span>
                      </div>

                      {/* Title - Main Content */}
                      <div className="relative z-10 h-full flex items-center justify-center px-4">
                        <motion.h4
                          className={`
                            font-bold font-mono text-center leading-tight text-lg
                            bg-gradient-to-r bg-clip-text text-transparent
                            ${
                              isProcessing || !activeProjectId
                                ? 'opacity-50'
                                : ''
                            }
                          `}
                          style={{
                            backgroundImage: `linear-gradient(to right, ${colors.baseColor}, ${colors.baseColor}C0)`
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            delay: idx * 0.05 + 0.3,
                            type: "spring",
                            stiffness: 300,
                            damping: 30
                          }}
                        >
                          {config.label}
                        </motion.h4>
                      </div>

                      {/* Hover Glow Effect */}
                      {!isProcessing && activeProjectId && (
                        <motion.div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                          style={{
                            background: `linear-gradient(45deg, ${colors.baseColor}15, transparent, ${colors.baseColor}15)`,
                            filter: 'blur(2px)',
                          }}
                        />
                      )}

                      {/* Corner Reinforcements */}
                      <div
                        className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2"
                        style={{ borderColor: `${colors.baseColor}99` }}
                      />
                      <div
                        className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2"
                        style={{ borderColor: `${colors.baseColor}99` }}
                      />
                      <div
                        className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2"
                        style={{ borderColor: `${colors.baseColor}99` }}
                      />
                      <div
                        className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2"
                        style={{ borderColor: `${colors.baseColor}99` }}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Accent Line */}
        <div className={`h-0.5 bg-gradient-to-r ${colors.primary} opacity-30`} />
      </motion.div>
    </div>
  );
}
