'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import TestSelectorsPanel from '@/app/features/Context/sub_ContextPreview/components/TestSelectorsPanel';

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
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  // Load scenarios for this context
  useEffect(() => {
    loadScenarios();
  }, [contextId]);

  // Load steps when scenario changes
  useEffect(() => {
    if (scenarios.length > 0) {
      loadSteps(scenarios[currentScenarioIndex].id);
    }
  }, [currentScenarioIndex, scenarios]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/test-case-scenarios?contextId=${contextId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.scenarios) {
          setScenarios(data.scenarios);
        }
      }
    } catch (error) {
      console.error('[TestCaseStepsEditor] Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSteps = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/test-case-steps?scenarioId=${scenarioId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.steps) {
          setSteps(data.steps);
        }
      }
    } catch (error) {
      console.error('[TestCaseStepsEditor] Error loading steps:', error);
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

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 font-mono text-sm">
        Loading test scenarios...
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 font-mono text-sm">
        No test case scenarios found for this context.
      </div>
    );
  }

  const currentScenario = scenarios[currentScenarioIndex];

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Left: Test Steps Editor */}
      <div className="space-y-3">
        {/* Scenario Navigator */}
        <div className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg">
          <button
            onClick={handlePreviousScenario}
            disabled={currentScenarioIndex === 0}
            className="p-1 rounded hover:bg-gray-800/50 disabled:opacity-30 disabled:cursor-not-allowed"
            data-testid="previous-scenario-btn"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>

          <div className="flex-1 text-center">
            <div className="text-sm font-mono text-gray-300">
              {currentScenario.name}
            </div>
            <div className="text-xs font-mono text-gray-500">
              {currentScenarioIndex + 1} / {scenarios.length}
            </div>
          </div>

          <button
            onClick={handleNextScenario}
            disabled={currentScenarioIndex === scenarios.length - 1}
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

        {/* Test Steps List */}
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 space-y-2 max-h-96 overflow-y-auto">
          {steps.length === 0 ? (
            <div className="text-center py-4 text-gray-500 font-mono text-xs">
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
                      {step.step_name}
                    </div>
                    <div className="text-xs font-mono text-gray-500">
                      Expected: {step.expected_result}
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
