'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { SupportedProvider } from '@/lib/llm/types';
import { trackCommand } from '../lib/analyticsWrapper';
import { useThemeStore } from '@/stores/themeStore';
import { useAnnetteActionsStore } from '@/stores/annetteActionsStore';

interface AnnetteTestButtonsProps {
  isProcessing: boolean;
  activeProjectId: string | null;
  onSendToAnnette: (message: string, provider: SupportedProvider) => Promise<void>;
  onPlayDirectResponse: (text: string) => Promise<void>;
}

type TestType = 'status' | 'nextStep' | 'analyze' | 'yes' | 'no' | null;

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
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  // Get button mode and selected provider from store
  const buttonMode = useAnnetteActionsStore((state) => state.buttonMode);
  const lastMetadata = useAnnetteActionsStore((state) => state.lastMetadata);
  const resetToDefault = useAnnetteActionsStore((state) => state.resetToDefault);
  const selectedProvider = useAnnetteActionsStore((state) => state.selectedProvider);

  // Test configurations
  const TEST_CONFIGS = {
    status: {
      label: 'Status',
      title: 'Get untested implementation logs count',
      message: '', // Not used - goes directly to API
      command: 'project_status',
      shortcut: '1',
      useDirectApi: true,
      apiEndpoint: '/api/annette/status',
    },
    nextStep: {
      label: 'Next Step',
      title: 'Get recommendation for next scan to execute',
      message: '', // Not used - goes directly to API
      command: 'next_step_recommendation',
      shortcut: '2',
      useDirectApi: true,
      apiEndpoint: '/api/annette/next-step',
    },
    analyze: {
      label: 'Analyze',
      title: 'Analyze context and propose next steps',
      message: '', // Not used - goes directly to API
      command: 'context_analysis',
      shortcut: '3',
      useDirectApi: true,
      apiEndpoint: '/api/annette/analyze',
    },
  };

  // Yes/No configurations for requirement generation
  const YESNO_CONFIGS = {
    yes: {
      label: 'Yes',
      title: 'Generate requirement file for coding',
      command: 'generate_requirement',
      shortcut: 'y',
    },
    no: {
      label: 'No',
      title: 'Skip requirement generation',
      command: 'skip_requirement',
      shortcut: 'n',
    },
  };

  const handleInitiateTest = async (testType: TestType) => {
    if (!activeProjectId || !testType) return;

    const testConfig = TEST_CONFIGS[testType as keyof typeof TEST_CONFIGS];
    if (!testConfig) return;

    // Track the command
    await trackCommand(activeProjectId, testConfig.command, 'button_command', async () => {
      if (testConfig.useDirectApi) {
        // Call specific API endpoint using stored provider
        const response = await fetch(testConfig.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: activeProjectId,
            provider: selectedProvider,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Play the response
          await onPlayDirectResponse(data.response);

          // Handle metadata for Analyze action
          if (testType === 'analyze' && data.metadata) {
            const { useAnnetteActionsStore: store } = await import('@/stores/annetteActionsStore');
            const { setButtonMode, setMetadata } = store.getState();

            // Store metadata
            setMetadata(data.metadata);

            // Switch to Yes/No button mode
            setButtonMode('yesno');

            // Ask follow-up question
            await onPlayDirectResponse(
              'Would you like me to generate a requirement file for this work?'
            );
          }
        } else {
          throw new Error(data.error || `Failed to ${testConfig.command}`);
        }
      } else {
        // For other tests, use the regular chat flow
        await onSendToAnnette(testConfig.message, selectedProvider);
      }
    }).catch(() => { });
  };

  // Handle Yes/No button clicks
  const handleYesNoClick = async (choice: 'yes' | 'no') => {
    if (!activeProjectId) return;

    const config = YESNO_CONFIGS[choice];

    await trackCommand(activeProjectId, config.command, 'button_command', async () => {
      if (choice === 'yes') {
        // TODO: Implement requirement file generation
        await onPlayDirectResponse('Requirement file generation coming soon. Resetting to default.');
      } else {
        await onPlayDirectResponse('Skipping requirement generation. Resetting to default.');
      }

      // Reset to default button mode
      resetToDefault();
    }).catch(() => { });
  };

  // Keyboard shortcuts (1, 2, 3 for default; y, n for yes/no)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignore if processing
      if (isProcessing || !activeProjectId) {
        return;
      }

      if (buttonMode === 'yesno') {
        // Handle Y/N shortcuts for yes/no mode
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleYesNoClick('yes');
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          handleYesNoClick('no');
        }
      } else {
        // Handle 1/2/3 shortcuts for default mode
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, activeProjectId, buttonMode]);

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
        <div className="relative p-3 min-w-[500px]">
          {/* Action Buttons Row */}
          <div className="relative">
            {/* Note about provider selection */}
            <div className="absolute -top-5 right-0 text-[9px] text-gray-500 font-mono">
              Using: {selectedProvider}
            </div>

            <div className="flex gap-3">
              {/* Default Mode: Status, Next Step, Analyze */}
              {buttonMode === 'default' && (Object.keys(TEST_CONFIGS) as TestType[]).filter(Boolean).map((testKey, idx) => {
                const config = TEST_CONFIGS[testKey as keyof typeof TEST_CONFIGS];
                if (!config) return null;

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
                        ${isProcessing || !activeProjectId
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
                            ${isProcessing || !activeProjectId
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

              {/* Yes/No Mode: After Analyze action */}
              {buttonMode === 'yesno' && (Object.keys(YESNO_CONFIGS) as Array<'yes' | 'no'>).map((choice, idx) => {
                const config = YESNO_CONFIGS[choice];

                return (
                  <motion.button
                    key={choice}
                    onClick={() => handleYesNoClick(choice)}
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
                    title={`${config.title} (Press ${config.shortcut.toUpperCase()})`}
                    data-testid={`annette-action-${choice}`}
                  >
                    {/* Main Button Container */}
                    <div
                      className={`
                        relative h-16 w-full overflow-hidden border-2 rounded-lg
                        bg-gradient-to-br from-gray-900/40 via-transparent to-gray-800/40 backdrop-blur-sm
                        transition-all duration-300
                        ${isProcessing || !activeProjectId
                          ? 'border-gray-700/30 opacity-50 cursor-not-allowed'
                          : choice === 'yes'
                            ? 'border-emerald-500/50 group-hover:border-emerald-400/70 group-hover:from-emerald-900/30'
                            : 'border-red-500/50 group-hover:border-red-400/70 group-hover:from-red-900/30'
                        }
                      `}
                    >
                      {/* Title - Main Content */}
                      <div className="relative z-10 h-full flex items-center justify-center px-4">
                        <motion.h4
                          className={`
                            font-bold font-mono text-center leading-tight text-lg
                            ${isProcessing || !activeProjectId
                              ? 'opacity-50 text-gray-500'
                              : choice === 'yes'
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }
                          `}
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
                          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${choice === 'yes' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                            }`}
                        />
                      )}

                      {/* Corner Reinforcements */}
                      <div
                        className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${choice === 'yes' ? 'border-emerald-500/70' : 'border-red-500/70'
                          }`}
                      />
                      <div
                        className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${choice === 'yes' ? 'border-emerald-500/70' : 'border-red-500/70'
                          }`}
                      />
                      <div
                        className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${choice === 'yes' ? 'border-emerald-500/70' : 'border-red-500/70'
                          }`}
                      />
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${choice === 'yes' ? 'border-emerald-500/70' : 'border-red-500/70'
                          }`}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Accent Line */}
        <div className={`h-0.5 bg-gradient-to-r ${colors.primary} opacity-30`} />
      </motion.div>
    </div>
  );
}
