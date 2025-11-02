'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import IdeasLayout from './features/Ideas/IdeasLayout';
import TinderLayout from './features/Tinder/TinderLayout';
import TaskRunnerLayout from './features/TaskRunner/TaskRunnerLayout';
import ReflectorLayout from './features/Reflector/ReflectorLayout';
import DocsPage from './docs/page';
import RefactorPage from './refactor/page';
import FrozenComponent from '../components/FrozenComponent';
import LazyContentSection from '../components/Navigation/LazyContentSection';
import { HorizontalContextBar } from './features/Context';
import GoalsLayout from './features/Goals/GoalsLayout';

export default function Home() {
  const [shouldFreezeComponents, setShouldFreezeComponents] = useState(false);
  const { activeModule } = useOnboardingStore();
  const { activeProject } = useActiveProjectStore();

  const handleFreezeStateChange = (shouldFreeze: boolean) => {
    setShouldFreezeComponents(shouldFreeze);
  };

  // Smooth transition variants
  const moduleVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  const renderActiveModule = () => {
    const projectId = activeProject?.id || null;

    switch (activeModule) {
      case 'coder':
        return <GoalsLayout key="coder" projectId={projectId} />;
      case 'contexts':
        return <HorizontalContextBar key="contexts" />;
      case 'ideas':
        return <IdeasLayout key="ideas" />;
      case 'tinder':
        return <TinderLayout key="tinder" />;
      case 'tasker':
        return <TaskRunnerLayout key="tasker" />;
      case 'reflector':
        return <ReflectorLayout key="reflector" />;
      case 'docs':
        return <DocsPage key="docs" />;
      case 'refactor':
        return <RefactorPage key="refactor" />;
      default:
        return <GoalsLayout key="coder" projectId={projectId} />;
    }
  };

  return (
    <main className="relative min-h-full">
      {/* Module Content with Smooth Transitions */}
      <LazyContentSection delay={0.1}>
        <FrozenComponent shouldFreeze={shouldFreezeComponents}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              variants={moduleVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderActiveModule()}
            </motion.div>
          </AnimatePresence>
        </FrozenComponent>
      </LazyContentSection>
    </main>
  );
}