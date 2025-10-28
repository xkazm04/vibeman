'use client';

import { useState } from 'react';
import CoderLayout from './coder/CoderLayout';
import MonitorLayout from './features/footer-monitor/MonitorLayout';
import { ProjectManagerPanel } from './features/ProjectManager';
import FrozenComponent from '../components/FrozenComponent';
import LazyContentSection from '../components/Navigation/LazyContentSection';

export default function Home() {
  const [shouldFreezeComponents, setShouldFreezeComponents] = useState(false);

  const handleFreezeStateChange = (shouldFreeze: boolean) => {
    setShouldFreezeComponents(shouldFreeze);
  };

  return (
    <main className="relative min-h-full">
      <LazyContentSection delay={0.1}>
        <FrozenComponent shouldFreeze={shouldFreezeComponents}>
          <CoderLayout />
        </FrozenComponent>
      </LazyContentSection>

      <LazyContentSection delay={0.2}>
        <FrozenComponent shouldFreeze={shouldFreezeComponents}>
          <MonitorLayout />
        </FrozenComponent>
      </LazyContentSection>

      <LazyContentSection delay={0.3}>
        <ProjectManagerPanel onFreezeStateChange={handleFreezeStateChange} />
      </LazyContentSection>
    </main>
  );
}