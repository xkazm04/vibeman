'use client';

import { useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useSessionInitialize } from '@/lib/session/hooks';
import FrozenComponent from '../components/FrozenComponent';
import LazyContentSection from '../components/Navigation/LazyContentSection';
import GlobalTaskBar from '@/components/GlobalTaskBar';
import { ModuleUrlSync } from '@/components/Navigation/useModuleUrlSync';
import { createLazyFeature, LazyFeaturePresets } from '@/components/lazy';
import { usePrefetchModules } from '@/components/lazy/usePrefetchModule';

// ── Direct import: default module (instant) ────────────────────────────
import { OverviewLayout } from './features/Overview';

// ── Lazy imports: loaded on-demand per module switch ────────────────────
const LazyGoalsLayout = createLazyFeature(
  () => import('./features/Goals/GoalsLayout'),
  LazyFeaturePresets.withCards('Goals')
);
const LazyContextLayout = createLazyFeature(
  () => import('./features/Context/ContextLayout'),
  LazyFeaturePresets.withSidebar('Context')
);
const LazyIdeasLayout = createLazyFeature(
  () => import('./features/Ideas/IdeasLayout'),
  LazyFeaturePresets.withCards('Ideas')
);
const LazyTinderLayout = createLazyFeature(
  () => import('./features/tinder/TinderLayout'),
  LazyFeaturePresets.withCards('Tinder')
);
const LazyTaskRunnerLayout = createLazyFeature(
  () => import('./features/TaskRunner/TaskRunnerLayout'),
  LazyFeaturePresets.withTable('TaskRunner')
);
const LazyReflectorLayout = createLazyFeature(
  () => import('./features/reflector/ReflectorLayout'),
  LazyFeaturePresets.minimal('Reflector')
);
const LazyManagerLayout = createLazyFeature(
  () => import('./features/Manager/ManagerLayout'),
  LazyFeaturePresets.withCards('Manager')
);
const LazyHallOfFameLayout = createLazyFeature(
  () => import('./features/HallOfFame/HallOfFameLayout'),
  LazyFeaturePresets.minimal('HallOfFame')
);
const LazyExplorerLayout = createLazyFeature(
  () => import('./features/Explorer/ExplorerLayout'),
  LazyFeaturePresets.withSidebar('Explorer')
);


export default function Home() {
  const [shouldFreezeComponents] = useState(false);
  const { activeModule } = useOnboardingStore();
  const { activeProject } = useClientProjectStore();
  const { selectedProjectId } = useClientProjectStore();
  // Initialize application session coordinator on app load
  useSessionInitialize();

  // Prefetch neighbor modules during idle time
  usePrefetchModules(activeModule);

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
        return <LazyGoalsLayout key="coder" projectId={projectId} />;
      case 'contexts':
        return <LazyContextLayout key="contexts" selectedFilesCount={0} />;
      case 'ideas':
        return <LazyIdeasLayout key="ideas" selectedProjectId={selectedProjectId} />;
      case 'tinder':
        return <LazyTinderLayout key="tinder" />;
      case 'tasker':
        return <LazyTaskRunnerLayout key="tasker" />;
      case 'reflector':
        return <LazyReflectorLayout key="reflector" />;
      case 'manager':
        return <LazyManagerLayout key="manager" projectId={projectId} />;
      case 'halloffame':
        return <LazyHallOfFameLayout key="halloffame" />;
      case 'explorer':
        return <LazyExplorerLayout key="explorer" />;
      default:
        return <OverviewLayout key="overview" />;
    }
  };

  return (
    <main className="relative min-h-full pt-10">
      {/* Keep the active module in sync with the URL (Back/Forward, bookmarks, deep links) */}
      <Suspense fallback={null}>
        <ModuleUrlSync />
      </Suspense>

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
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {renderActiveModule()}
            </motion.div>
          </AnimatePresence>
        </FrozenComponent>
      </LazyContentSection>

      {/* Global Task Bar - visible across all modules */}
      <GlobalTaskBar />
    </main>
  );
}
