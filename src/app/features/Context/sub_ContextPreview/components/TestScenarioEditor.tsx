'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, Play, Loader2, CheckCircle, XCircle, Plus, Trash2, Mouse } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorDisplay from '@/app/features/Context/components/ErrorDisplay';
import {
  useJsonValidation,
  type ValidationResult,
} from '@/app/features/Context/sub_ContextOverview/components/useJsonValidation';

interface TestScenarioEditorProps {
  value: string;
  onChange: (value: string) => void;
  groupColor: string;
  contextId: string;
  onStepFocus?: (stepId: string | null) => void;
  selectedTestId?: string | null;
  onTestIdConsumed?: () => void;
  onPreviewUpdate?: (previewPath: string) => void;
}

interface EditorTestStep {
  id: string;
  type: 'navigate' | 'wait' | 'click';
  editable: boolean;
  value: string;
  label?: string;
}

interface ParsedTestStep {
  type: 'navigate' | 'wait' | 'click';
  url?: string;
  delay?: number;
  selector?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: string;
}

/**
 * Custom validator for test scenario editor format
 * Converts parsed JSON into EditorTestStep format
 */
function editorScenarioValidator(data: unknown): ValidationResult<EditorTestStep[]> {
  if (!Array.isArray(data)) {
    return {
      success: false,
      error: 'Test scenario must be an array of steps',
    };
  }

  const validTypes = ['navigate', 'wait', 'click'];
  const loadedSteps: EditorTestStep[] = data.map((step: ParsedTestStep, index: number) => {
    if (!step.type || !validTypes.includes(step.type)) {
      console.warn(`[TestScenarioEditor] Invalid step type at index ${index}:`, step);
    }

    return {
      id: `step-${index}`,
      type: step.type || 'wait',
      editable: step.type === 'click',
      value: step.url || step.delay?.toString() || step.selector || '',
      label: step.type === 'click' ? 'Click element' : step.type === 'wait' ? 'Wait' : 'Navigate to',
    };
  });

  return { success: true, data: loadedSteps };
}


export default function TestScenarioEditor({
  value,
  onChange,
  groupColor,
  contextId,
  onStepFocus,
  selectedTestId,
  onTestIdConsumed,
  onPreviewUpdate,
}: TestScenarioEditorProps) {
  const [steps, setSteps] = useState<EditorTestStep[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [focusedStepId, setFocusedStepId] = useState<string | null>(null);

  // Use the generic JSON validation hook
  const jsonValidation = useJsonValidation<EditorTestStep[]>({
    validate: editorScenarioValidator,
    initialValue: value,
  });

  // Memoized default steps for reuse
  const defaultSteps = useMemo<EditorTestStep[]>(() => [
    {
      id: 'init-nav',
      type: 'navigate',
      editable: false,
      value: 'http://localhost:3000',
      label: 'Navigate to',
    },
    {
      id: 'init-wait',
      type: 'wait',
      editable: false,
      value: '3000',
      label: 'Wait',
    },
  ], []);

  // Initialize steps from value prop or set defaults
  useEffect(() => {
    if (value && value.trim() !== '') {
      const result = jsonValidation.parse(value);

      if (!result.success || !result.data) {
        // Don't clear existing steps on parse error - let user fix the issue
        if (steps.length === 0) {
          setSteps(defaultSteps);
        }
      } else {
        if (result.data.length > 0) {
          setSteps(result.data);
        }
      }
    } else if (steps.length === 0) {
      // Set default initialization steps only if no steps exist
      setSteps(defaultSteps);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Helper functions (must be defined before useEffect that uses them)
  const updateStepValue = useCallback((id: string, newValue: string) => {
    // Auto-format to data-testid selector
    const formattedValue = newValue.trim() ? `[data-testid='${newValue.trim()}']` : newValue;
    setSteps(prevSteps => prevSteps.map(s => s.id === id ? { ...s, value: formattedValue } : s));
  }, []);

  const getDisplayValue = (value: string): string => {
    // Extract testid from formatted selector for display
    const match = value.match(/\[data-testid='([^']+)'\]/);
    return match ? match[1] : value;
  };

  // Convert steps to API format and call onChange
  useEffect(() => {
    try {
      const apiSteps = steps.map(step => {
        switch (step.type) {
          case 'navigate':
            return { type: 'navigate', url: step.value };
          case 'wait':
            const delay = parseInt(step.value);
            return { type: 'wait', delay: isNaN(delay) ? 1000 : delay };
          case 'click':
            return { type: 'click', selector: step.value };
          default:
            return { type: step.type };
        }
      });

      onChange(JSON.stringify(apiSteps));
      jsonValidation.clearError(); // Clear error on successful serialization
    } catch (e) {
      console.error('[TestScenarioEditor] Error serializing steps:', e);
    }
  }, [steps, onChange, jsonValidation]);

  // Handle selectedTestId from TestSelectorsPanel
  useEffect(() => {
    if (selectedTestId && focusedStepId) {
      // Auto-fill the focused step with the selected test id
      updateStepValue(focusedStepId, selectedTestId);
      onTestIdConsumed?.();
    }
  }, [selectedTestId, focusedStepId, updateStepValue, onTestIdConsumed]);

  const addClickStep = () => {
    const newClickId = `click-${Date.now()}`;
    const newWaitId = `wait-${Date.now()}`;

    setSteps([
      ...steps,
      {
        id: newClickId,
        type: 'click',
        editable: true,
        value: '',
        label: 'Click element',
      },
      {
        id: newWaitId,
        type: 'wait',
        editable: false,
        value: '1500',
        label: 'Wait',
      },
    ]);
  };

  const removeStep = (id: string) => {
    // When removing a click step, also remove its following wait step
    const stepIndex = steps.findIndex(s => s.id === id);
    if (stepIndex === -1) return;

    const step = steps[stepIndex];
    if (step.type === 'click' && stepIndex + 1 < steps.length && steps[stepIndex + 1].type === 'wait') {
      // Remove both click and its wait
      setSteps(steps.filter((_, i) => i !== stepIndex && i !== stepIndex + 1));
    } else {
      setSteps(steps.filter(s => s.id !== id));
    }
  };

  const handleTest = async () => {
    // Validate steps before testing
    if (steps.length === 0) {
      setTestResult({ success: false, message: 'No steps defined', details: 'Add at least one step to create a test scenario' });
      return;
    }

    // Check if all click steps have selectors
    const emptyClicks = steps.filter(s => s.type === 'click' && !s.value.trim());
    if (emptyClicks.length > 0) {
      setTestResult({
        success: false,
        message: 'Incomplete test steps',
        details: `${emptyClicks.length} click step(s) are missing selectors`,
      });
      return;
    }

    // Check for invalid wait values
    const invalidWaits = steps.filter(s => s.type === 'wait' && (isNaN(parseInt(s.value)) || parseInt(s.value) < 0));
    if (invalidWaits.length > 0) {
      setTestResult({
        success: false,
        message: 'Invalid wait time',
        details: 'Wait steps must have a positive number for delay (in milliseconds)',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch('/api/tester/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId,
          scanOnly: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle network/server errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 503) {
          setTestResult({
            success: false,
            message: 'Dev server not accessible',
            details: errorData.hint || 'Make sure your development server is running',
          });
        } else if (response.status === 404) {
          setTestResult({
            success: false,
            message: 'Context or project not found',
            details: errorData.error || 'The context may have been deleted',
          });
        } else {
          setTestResult({
            success: false,
            message: `Server error (${response.status})`,
            details: errorData.error || errorData.details || 'Unknown server error',
          });
        }
        return;
      }

      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: 'Screenshot captured successfully!',
          details: result.screenshotPath ? `Saved to: ${result.screenshotPath}` : undefined,
        });

        // Notify parent of preview update
        if (result.screenshotPath && onPreviewUpdate) {
          onPreviewUpdate(result.screenshotPath);
        }
      } else {
        // Handle specific error types from the API
        let message = 'Screenshot failed';
        let details = result.error || 'Unknown error';

        if (result.error?.includes('selector')) {
          message = 'Element not found';
          details = `Could not find element: ${result.error.match(/selector[:\s]*(.+)/i)?.[1] || 'unknown'}`;
        } else if (result.error?.includes('timeout')) {
          message = 'Operation timed out';
          details = 'The page took too long to respond. Check if your server is running.';
        } else if (result.error?.includes('navigation')) {
          message = 'Navigation failed';
          details = 'Could not navigate to the target URL. Check the URL in step 1.';
        }

        setTestResult({ success: false, message, details });
      }
    } catch (error) {
      // Handle network/timeout errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setTestResult({
            success: false,
            message: 'Request timed out',
            details: 'The screenshot operation took longer than 60 seconds',
          });
        } else if (error.message.includes('fetch')) {
          setTestResult({
            success: false,
            message: 'Network error',
            details: 'Could not connect to the server. Check your network connection.',
          });
        } else {
          setTestResult({
            success: false,
            message: 'Unexpected error',
            details: error.message,
          });
        }
      } else {
        setTestResult({
          success: false,
          message: 'Unknown error',
          details: 'An unexpected error occurred',
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4" style={{ color: groupColor }} />
          <label className="block text-sm font-medium text-gray-400 font-mono">
            Test Scenario (Visual Editor)
          </label>
        </div>
        <motion.button
          onClick={handleTest}
          disabled={isTesting || steps.length === 0}
          className="flex items-center gap-1 px-2 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-teal-500/30"
          whileHover={{ scale: !isTesting && steps.length > 0 ? 1.05 : 1 }}
          whileTap={{ scale: !isTesting && steps.length > 0 ? 0.95 : 1 }}
          data-testid="run-test-btn"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Testing...</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              <span>Test</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Parse Error Display */}
      {jsonValidation.error && (
        <ErrorDisplay
          error={jsonValidation.error}
          severity="warning"
          context="JSON Parse Warning"
          onDismiss={jsonValidation.clearError}
          compact
        />
      )}

      {/* Steps Editor */}
      <div className="flex gap-2">
        {/* Left Panel - Action Buttons */}
        <div className="flex-shrink-0 w-24 space-y-2">
          <motion.button
            onClick={addClickStep}
            className="w-full flex flex-col items-center gap-1 px-2 py-3 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded border border-gray-600/50 hover:border-cyan-500/50 transition-all text-xs font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="add-click-step-btn"
          >
            <Plus className="w-4 h-4" />
            <Mouse className="w-3 h-3" />
            <span>Click</span>
          </motion.button>
        </div>

        {/* Right Panel - Steps List */}
        <div className="flex-1 bg-gray-900/50 border border-gray-600/50 rounded-lg p-2 space-y-1 min-h-[200px] max-h-[600px] overflow-y-auto">
          <AnimatePresence>
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={`flex items-center gap-2 p-2 rounded ${
                  step.editable
                    ? 'bg-cyan-500/10 border border-cyan-500/30'
                    : 'bg-gray-800/50 border border-gray-700/30'
                }`}
                data-testid={`test-step-${index}`}
              >
                {/* Step number */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                  {index + 1}
                </div>

                {/* Step icon and type */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {step.type === 'navigate' && (
                    <span className="text-xs text-blue-400 font-mono">→</span>
                  )}
                  {step.type === 'wait' && (
                    <span className="text-xs text-yellow-400 font-mono">⏱</span>
                  )}
                  {step.type === 'click' && (
                    <Mouse className="w-3 h-3 text-cyan-400" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  {step.editable ? (
                    <input
                      type="text"
                      value={getDisplayValue(step.value)}
                      onChange={(e) => updateStepValue(step.id, e.target.value)}
                      onFocus={() => {
                        setFocusedStepId(step.id);
                        onStepFocus?.(step.id);
                      }}
                      onBlur={() => {
                        // Delay clearing focus to allow click events to complete
                        setTimeout(() => {
                          setFocusedStepId(null);
                          onStepFocus?.(null);
                        }, 200);
                      }}
                      placeholder="Enter testid (e.g., save-button)"
                      className={`w-full px-2 py-1 bg-gray-900/50 border rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono ${
                        focusedStepId === step.id ? 'border-cyan-500/50 ring-1 ring-cyan-500/50' : 'border-gray-600/50'
                      }`}
                      data-testid={`step-${index}-input`}
                    />
                  ) : (
                    <div className="text-xs text-gray-400 font-mono truncate">
                      {step.type === 'navigate' && `Navigate: ${step.value}`}
                      {step.type === 'wait' && `Wait: ${step.value}ms`}
                    </div>
                  )}
                </div>

                {/* Delete button (only for editable steps) */}
                {step.editable && (
                  <motion.button
                    onClick={() => removeStep(step.id)}
                    className="flex-shrink-0 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    data-testid={`step-${index}-delete-btn`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {steps.length === 0 && (
            <div className="flex items-center justify-center h-full text-xs text-gray-500 font-mono">
              No steps added yet
            </div>
          )}
        </div>
      </div>

      {/* Test Result */}
      <AnimatePresence mode="wait">
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`flex items-start gap-2 p-2 rounded text-xs font-mono ${
              testResult.success
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
            data-testid="test-result"
          >
            {testResult.success ? (
              <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <span className="font-medium">{testResult.message}</span>
              {testResult.details && (
                <p className="mt-1 opacity-80">{testResult.details}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-gray-500 font-mono">
        Steps are executed sequentially by Playwright to capture screenshots. Click the + button to add click actions.
      </p>
    </div>
  );
}
