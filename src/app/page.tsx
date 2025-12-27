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
import { createLazyFeature, LazyFeaturePresets } from '@/components/lazy';

// Lazy-loaded feature layouts with performance tracking
const LazyIdeasLayout = createLazyFeature(
  () => import('./features/Ideas/IdeasLayout'),
  LazyFeaturePresets.withCards('Ideas')
);

const LazyTinderLayout = createLazyFeature(
  () => import('./features/tinder/TinderLayout'),
  LazyFeaturePresets.minimal('Tinder')
);

const LazyTaskRunnerLayout = createLazyFeature(
  () => import('./features/TaskRunner/TaskRunnerLayout'),
  LazyFeaturePresets.withTable('TaskRunner')
);

const LazyReflectorLayout = createLazyFeature(
  () => import('./features/reflector/ReflectorLayout'),
  LazyFeaturePresets.withSidebar('Reflector')
);

const LazyManagerLayout = createLazyFeature(
  () => import('./features/Manager/ManagerLayout'),
  LazyFeaturePresets.withSidebar('Manager')
);

const LazyDocsPage = createLazyFeature(
  () => import('./docs/page'),
  LazyFeaturePresets.withSidebar('Docs')
);

const LazyRefactorPage = createLazyFeature(
  () => import('./refactor/page'),
  LazyFeaturePresets.withSidebar('Refactor')
);

const LazyGoalsLayout = createLazyFeature(
  () => import('./features/Goals/GoalsLayout'),
  LazyFeaturePresets.withCards('Goals')
);

const LazyHallOfFameLayout = createLazyFeature(
  () => import('./features/HallOfFame/HallOfFameLayout'),
  LazyFeaturePresets.withCards('HallOfFame')
);

const LazyHorizontalContextBar = createLazyFeature(
  () => import('./features/Context/ContextLayout'),
  LazyFeaturePresets.minimal('Contexts')
);

const LazySocialLayout = createLazyFeature(
  () => import('./features/Social/SocialLayout'),
  LazyFeaturePresets.withCards('Social')
);

const LazyBlueprintComposer = createLazyFeature(
  () => import('./features/Composer/BlueprintComposer'),
  LazyFeaturePresets.withSidebar('Composer')
);

const LazyZenLayout = createLazyFeature(
  () => import('./zen/ZenLayout'),
  LazyFeaturePresets.minimal('Zen')
);

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
      case 'coder':
        return <LazyGoalsLayout key="coder" projectId={projectId} />;
      case 'contexts':
        return <LazyHorizontalContextBar key="contexts" selectedFilesCount={0} />;
      case 'ideas':
        return <LazyIdeasLayout key="ideas" />;
      case 'tinder':
        return <LazyTinderLayout key="tinder" />;
      case 'tasker':
        return <LazyTaskRunnerLayout key="tasker" />;
      case 'reflector':
        return <LazyReflectorLayout key="reflector" />;
      case 'docs':
        return <LazyDocsPage key="docs" />;
      case 'refactor':
        return <LazyRefactorPage key="refactor" />;
      case 'manager':
        return <LazyManagerLayout key="manager" projectId={projectId} />;
      case 'halloffame':
        return <LazyHallOfFameLayout key="halloffame" />;
      case 'social':
        return <LazySocialLayout key="social" />;
      case 'composer':
        return (
          <div key="composer" className="h-full">
            <LazyBlueprintComposer />
          </div>
        );
      case 'zen':
        return <LazyZenLayout key="zen" />;
      default:
        return <LazyGoalsLayout key="coder" projectId={projectId} />;
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