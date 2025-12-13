'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import TestSelectorsPanel from '@/app/features/Context/sub_ContextPreview/components/TestSelectorsPanel';
import ErrorDisplay from '@/app/features/Context/components/ErrorDisplay';

interface TestCaseScenario {
  id: string;
  context_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface TestCaseStep {
  id: string;
  scenario_id: string;
  step_order: number;
  step_name: string;
  expected_result: string;
  test_selector_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TestCaseStepsEditorProps {
  contextId: string;
  groupColor: string;
}

export default function TestCaseStepsEditor({
  contextId,
  groupColor,
}: TestCaseStepsEditorProps) {
  const [scenarios, setScenarios] = useState<TestCaseScenario[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [steps, setSteps] = useState<TestCaseStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepsError, setStepsError] = useState<string | null>(null);

  // Load scenarios for this context
  useEffect(() => {
    loadScenarios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextId]);

  // Load steps when scenario changes
  useEffect(() => {
    if (scenarios.length > 0 && scenarios[currentScenarioIndex]) {
      loadSteps(scenarios[currentScenarioIndex].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScenarioIndex, scenarios]);

  const loadScenarios = async () => {
    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Use unified test-scenarios endpoint with type=manual filter
      const response = await fetch(`/api/test-scenarios?contextId=${contextId}&type=manual`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load scenarios (${response.status})`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load scenarios');
      }

      if (data.scenarios && Array.isArray(data.scenarios)) {
        setScenarios(data.scenarios);
        // Reset to first scenario when context changes
        setCurrentScenarioIndex(0);
      } else {
        setScenarios([]);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred while loading scenarios');
      }
      console.error('[TestCaseStepsEditor] Error loading scenarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSteps = async (scenarioId: string) => {
    if (!scenarioId) return;

    setStepsLoading(true);
    setStepsError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Use unified test-scenarios endpoint to get scenario with embedded steps
      const response = await fetch(`/api/test-scenarios?id=${scenarioId}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load steps (${response.status})`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load steps');
      }

      // Steps are now embedded in the scenario response
      if (data.scenario && data.scenario.steps && Array.isArray(data.scenario.steps)) {
        setSteps(data.scenario.steps);
      } else {
        setSteps([]);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setStepsError('Request timed out. Please try again.');
        } else {
          setStepsError(err.message);
        }
      } else {
        setStepsError('An unexpected error occurred while loading steps');
      }
      console.error('[TestCaseStepsEditor] Error loading steps:', err);
    } finally {
      setStepsLoading(false);
    }
  };

  const handleSelectorClick = (testId: string) => {
    setSelectedTestId(testId);
    // TODO: Add step with this selector
  };

  const handleStepFocus = (stepId: string | null) => {
    setActiveStepId(stepId);
  };

  const handlePreviousScenario = () => {
    if (currentScenarioIndex > 0) {
      setCurrentScenarioIndex(currentScenarioIndex - 1);
    }
  };

  const handleNextScenario = () => {
    if (currentScenarioIndex < scenarios.length - 1) {
      setCurrentScenarioIndex(currentScenarioIndex + 1);
    }
  };

  const handleRetry = () => {
    loadScenarios();
  };

  const handleRetrySteps = () => {
    if (scenarios.length > 0 && scenarios[currentScenarioIndex]) {
      loadSteps(scenarios[currentScenarioIndex].id);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 font-mono text-sm" data-testid="loading-scenarios">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading test scenarios...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        context="Failed to load test scenarios"
        onRetry={handleRetry}
        onDismiss={() => setError(null)}
      />
    );
  }

  // Empty state
  if (scenarios.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 font-mono text-sm" data-testid="no-scenarios">
        <p>No test case scenarios found for this context.</p>
        <p className="text-xs mt-2 text-gray-600">Create a test scenario to get started.</p>
      </div>
    );
  }

  // Validate current scenario index
  const safeIndex = Math.min(currentScenarioIndex, scenarios.length - 1);
  const currentScenario = scenarios[safeIndex];

  if (!currentScenario) {
    return (
      <ErrorDisplay
        error="Invalid scenario state"
        context="Scenario Error"
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Left: Test Steps Editor */}
      <div className="space-y-3">
        {/* Scenario Navigator */}
        <div className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg">
          <button
            onClick={handlePreviousScenario}
            disabled={safeIndex === 0}
            className="p-1 rounded hover:bg-gray-800/50 disabled:opacity-30 disabled:cursor-not-allowed"
            data-testid="previous-scenario-btn"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>

          <div className="flex-1 text-center">
            <div className="text-sm font-mono text-gray-300" data-testid="scenario-name">
              {currentScenario.name || 'Unnamed Scenario'}
            </div>
            <div className="text-xs font-mono text-gray-500">
              {safeIndex + 1} / {scenarios.length}
            </div>
          </div>

          <button
            onClick={handleNextScenario}
            disabled={safeIndex === scenarios.length - 1}
            className="p-1 rounded hover:bg-gray-800/50 disabled:opacity-30 disabled:cursor-not-allowed"
            data-testid="next-scenario-btn"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Description */}
        {currentScenario.description && (
          <div className="p-3 bg-gray-900/30 border border-gray-700/30 rounded-lg">
            <div className="text-xs font-mono text-gray-500 uppercase mb-1">Description</div>
            <div className="text-sm text-gray-400 font-mono">
              {currentScenario.description}
            </div>
          </div>
        )}

        {/* Steps Error */}
        {stepsError && (
          <ErrorDisplay
            error={stepsError}
            context="Failed to load steps"
            onRetry={handleRetrySteps}
            onDismiss={() => setStepsError(null)}
            compact
          />
        )}

        {/* Test Steps List */}
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 space-y-2 max-h-96 overflow-y-auto">
          {stepsLoading ? (
            <div className="flex items-center justify-center py-4 text-gray-500 font-mono text-xs" data-testid="loading-steps">
              <Loader2 className="w-3 h-3 animate-spin mr-2" />
              Loading steps...
            </div>
          ) : steps.length === 0 ? (
            <div className="text-center py-4 text-gray-500 font-mono text-xs" data-testid="no-steps">
              No steps defined for this scenario
            </div>
          ) : (
            steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-3 bg-gray-800/50 border rounded-lg transition-all cursor-pointer ${
                  activeStepId === step.id
                    ? 'border-cyan-500/50 bg-cyan-500/10'
                    : 'border-gray-700/30 hover:border-gray-600/50'
                }`}
                onClick={() => handleStepFocus(step.id)}
                data-testid={`test-step-${index}`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono"
                    style={{
                      backgroundColor: `${groupColor}20`,
                      color: groupColor,
                      border: `1px solid ${groupColor}40`,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-mono text-gray-300">
                      {step.step_name || 'Unnamed step'}
                    </div>
                    <div className="text-xs font-mono text-gray-500">
                      Expected: {step.expected_result || 'No expected result defined'}
                    </div>
                    {step.test_selector_id && (
                      <div className="text-xs font-mono text-cyan-400">
                        ✓ Has selector
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Test Selectors Panel */}
      <TestSelectorsPanel
        contextId={contextId}
        groupColor={groupColor}
        activeStepId={activeStepId}
        onSelectorClick={handleSelectorClick}
      />
    </div>
  );
}
