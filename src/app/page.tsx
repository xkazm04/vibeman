'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import FrozenComponent from '../components/FrozenComponent';
import LazyContentSection from '../components/Navigation/LazyContentSection';
import GlobalTaskBar from '@/components/GlobalTaskBar';
import { Toaster } from 'sonner';

// Direct imports for feature layouts (no lazy loading)
import IdeasLayout from './features/Ideas/IdeasLayout';
import TinderLayout from './features/tinder/TinderLayout';
import TaskRunnerLayout from './features/TaskRunner/TaskRunnerLayout';
import ReflectorLayout from './features/reflector/ReflectorLayout';
import ManagerLayout from './features/Manager/ManagerLayout';
import RefactorPage from './refactor/page';
import GoalsLayout from './features/Goals/GoalsLayout';
import HallOfFameLayout from './features/HallOfFame/HallOfFameLayout';
import ContextLayout from './features/Context/ContextLayout';
import SocialLayout from './features/Social/SocialLayout';
import BlueprintComposer from './features/Composer/BlueprintComposer';
import ZenLayout from './zen/ZenLayout';
import QuestionsLayout from './features/Questions/QuestionsLayout';
import IntegrationsLayout from './features/Integrations/IntegrationsLayout';
import { BrainLayout } from './features/Brain';
import { CommanderLayout } from './features/Commander';
import { OverviewLayout } from './features/Overview';

export default function Home() {
  const [shouldFreezeComponents] = useState(false);
  const { activeModule } = useOnboardingStore();
  const { activeProject } = useActiveProjectStore();
  const { selectedProjectId } = useUnifiedProjectStore();

  // Smooth transition variants for module and project switching
  const moduleVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  const renderActiveModule = () => {
    const projectId = activeProject?.id || null;

    switch (activeModule) {
      case 'overview':
        return <OverviewLayout key="overview" />;
      case 'coder':
        return <GoalsLayout key="coder" projectId={projectId} />;
      case 'contexts':
        return <ContextLayout key="contexts" selectedFilesCount={0} />;
      case 'ideas':
        return <IdeasLayout key="ideas" selectedProjectId={selectedProjectId} />;
      case 'tinder':
        return <TinderLayout key="tinder" />;
      case 'tasker':
        return <TaskRunnerLayout key="tasker" />;
      case 'reflector':
        return <ReflectorLayout key="reflector" />;
      case 'refactor':
        return <RefactorPage key="refactor" />;
      case 'manager':
        return <ManagerLayout key="manager" projectId={projectId} />;
      case 'halloffame':
        return <HallOfFameLayout key="halloffame" />;
      case 'social':
        return <SocialLayout key="social" />;
      case 'composer':
        return (
          <div key="composer" className="h-full">
            <BlueprintComposer />
          </div>
        );
      case 'zen':
        return <ZenLayout key="zen" />;
      case 'questions':
        return <QuestionsLayout key="questions" />;
      case 'integrations':
        return <IntegrationsLayout key="integrations" projectId={projectId} />;
      case 'brain':
        return <BrainLayout key="brain" />;
      case 'commander':
        return <CommanderLayout key="commander" />;
      default:
        return <OverviewLayout key="overview" />;
    }
  };

  return (
    <main className="relative min-h-full pt-10">
      {/* Module Content with Smooth Transitions */}
      <LazyContentSection delay={0.1}>
        <FrozenComponent shouldFreeze={shouldFreezeComponents}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeModule}-${selectedProjectId}`}
              variants={moduleVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {renderActiveModule()}
            </motion.div>
          </AnimatePresence>
        </FrozenComponent>
      </LazyContentSection>

      {/* Global Task Bar - visible across all modules */}
      <GlobalTaskBar />

      {/* Toast notifications */}
      <Toaster position="top-right" richColors />
    </main>
  );
}