'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/stores/onboardingStore';
import CoderLayout from './coder/CoderLayout';
import IdeasLayout from './features/Ideas/IdeasLayout';
import TinderLayout from './features/Tinder/TinderLayout';
import TaskRunnerLayout from './features/TaskRunner/TaskRunnerLayout';
import ReflectorLayout from './features/Reflector/ReflectorLayout';
import FrozenComponent from '../components/FrozenComponent';
import LazyContentSection from '../components/Navigation/LazyContentSection';

export default function Home() {
  const [shouldFreezeComponents, setShouldFreezeComponents] = useState(false);
  const { activeModule } = useOnboardingStore();

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
    switch (activeModule) {
      case 'coder':
        return <CoderLayout key="coder" />;
      case 'ideas':
        return <IdeasLayout key="ideas" />;
      case 'tinder':
        return <TinderLayout key="tinder" />;
      case 'tasker':
        return <TaskRunnerLayout key="tasker" />;
      case 'reflector':
        return <ReflectorLayout key="reflector" />;
      default:
        return <CoderLayout key="coder" />;
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