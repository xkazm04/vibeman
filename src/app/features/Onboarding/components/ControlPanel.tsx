'use client';

import { useState } from 'react';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useRouter } from 'next/navigation';
import Drawer from '@/components/ui/Drawer';
import StarterTasks from '../sub_GettingStarted/components/StarterTasks';
import StarterBlueprint from '../sub_GettingStarted/components/StarterBlueprint';
import { HealthDashboard } from '../sub_HealthDashboard';
import { buildTasks } from '../sub_GettingStarted/lib/config';
import type { OnboardingTask } from '../sub_GettingStarted/lib/types';
import { Activity, ListTodo } from 'lucide-react';

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBlueprint: () => void;
}

type TabView = 'tasks' | 'health';

/**
 * Getting Started Control Panel
 * Displays onboarding tasks, Blueprint access, and Health Dashboard
 * Now project-specific: shows progress for the active project
 */
export default function ControlPanel({ isOpen, onClose, onOpenBlueprint }: ControlPanelProps) {
  const { isStepCompleted, setActiveModule, closeControlPanel } = useOnboardingStore();
  const { activeProject } = useActiveProjectStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabView>('health');

  // Build tasks from store - now project-specific
  // Wrapper to handle type conversion from string to OnboardingStep
  const tasks = buildTasks((stepId: string) => isStepCompleted(stepId as any, activeProject?.id));

  const handleTaskClick = (task: OnboardingTask) => {
    setActiveModule(task.location);
    closeControlPanel();
  };

  const handleNavigate = (path: string) => {
    closeControlPanel();
    onClose();
    router.push(path);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => {
        onClose();
        closeControlPanel();
      }}
      side="left"
      maxWidth="max-w-lg"
      backgroundImage="/patterns/bg_blueprint.jpg"
      transparentOverlay={true}
    >
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 mb-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <button
          onClick={() => setActiveTab('health')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all
            ${activeTab === 'health'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
            }`}
        >
          <Activity className="w-4 h-4" />
          Health
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all
            ${activeTab === 'tasks'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
            }`}
        >
          <ListTodo className="w-4 h-4" />
          Tasks
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'health' ? (
        <HealthDashboard
          onOpenBlueprint={onOpenBlueprint}
          onNavigate={handleNavigate}
          compact={false}
        />
      ) : (
        <>
          <StarterTasks
            tasks={tasks}
            onTaskClick={handleTaskClick}
          />

          <StarterBlueprint
            onOpenBlueprint={onOpenBlueprint}
          />
        </>
      )}
    </Drawer>
  );
}
