/**
 * StepperNavigation Component
 * Horizontal step navigation for standup wizard
 */

'use client';

import { Check } from 'lucide-react';
import type { ProjectWithGoals } from '../types';

interface StepperNavigationProps {
  projects: ProjectWithGoals[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (index: number) => void;
}

export function StepperNavigation({
  projects,
  currentStep,
  completedSteps,
  onStepClick,
}: StepperNavigationProps) {
  return (
    <div className="border-b border-gray-800 bg-gray-900/30">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {projects.map((project, index) => {
            const isActive = index === currentStep;
            const isCompleted = completedSteps.has(index);

            return (
              <button
                key={project.id}
                onClick={() => onStepClick(index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : isCompleted
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                )}
                <span className="font-medium text-sm">{project.name}</span>
                {(project.openCount > 0 || project.inProgressCount > 0) && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50">
                    {project.openCount + project.inProgressCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
