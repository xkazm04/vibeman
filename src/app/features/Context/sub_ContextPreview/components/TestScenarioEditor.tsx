'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Play, Loader2, CheckCircle, XCircle, Plus, Trash2, Mouse } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface TestStep {
  id: string;
  type: 'navigate' | 'wait' | 'click';
  editable: boolean;
  value: string;
  label?: string;
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
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [focusedStepId, setFocusedStepId] = useState<string | null>(null);

  // Initialize steps from value prop or set defaults
  useEffect(() => {
    if (value && value.trim() !== '') {
      // Parse existing value (if it's JSON array)
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const loadedSteps: TestStep[] = parsed.map((step: any, index: number) => ({
            id: `step-${index}`,
            type: step.type,
            editable: step.type === 'click',
            value: step.url || step.delay?.toString() || step.selector || '',
            label: step.type === 'click' ? 'Click element' : step.type === 'wait' ? 'Wait' : 'Navigate to',
          }));
          setSteps(loadedSteps);
          return;
        }
      } catch (e) {
        // Not JSON, ignore and use defaults
      }
    }

    // Set default initialization steps
    setSteps([
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
    ]);
  }, []);

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
    const apiSteps = steps.map(step => {
      switch (step.type) {
        case 'navigate':
          return { type: 'navigate', url: step.value };
        case 'wait':
          return { type: 'wait', delay: parseInt(step.value) };
        case 'click':
          return { type: 'click', selector: step.value };
        default:
          return { type: step.type };
      }
    });

    onChange(JSON.stringify(apiSteps));
  }, [steps, onChange]);

  // Handle selectedTestId from TestSelectorsPanel
  useEffect(() => {
    if (selectedTestId && focusedStepId) {
      console.log('[TestScenarioEditor] Auto-filling step:', focusedStepId, 'with testId:', selectedTestId);
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
    if (steps.length === 0) {
      setTestResult({ success: false, message: 'No steps defined' });
      return;
    }

    // Check if all click steps have selectors
    const emptyClicks = steps.filter(s => s.type === 'click' && !s.value.trim());
    if (emptyClicks.length > 0) {
      setTestResult({ success: false, message: 'Please fill in all click selectors' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/tester/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId,
          scanOnly: false,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: `Screenshot saved! Path: ${result.screenshotPath}`,
        });

        // Notify parent of preview update
        if (result.screenshotPath && onPreviewUpdate) {
          onPreviewUpdate(result.screenshotPath);
        }
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Screenshot failed',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
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

      {/* Steps Editor */}
      <div className="flex gap-2">
        {/* Left Panel - Action Buttons */}
        <div className="flex-shrink-0 w-24 space-y-2">
          <motion.button
            onClick={addClickStep}
            className="w-full flex flex-col items-center gap-1 px-2 py-3 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded border border-gray-600/50 hover:border-cyan-500/50 transition-all text-xs font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-2 p-2 rounded text-xs font-mono ${
            testResult.success
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {testResult.success ? (
            <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          )}
          <span className="flex-1">{testResult.message}</span>
        </motion.div>
      )}

      <p className="text-xs text-gray-500 font-mono">
        Steps are executed sequentially by Playwright to capture screenshots. Click the + button to add click actions.
      </p>
    </div>
  );
}
