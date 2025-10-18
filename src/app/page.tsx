'use client';

import React, { useState } from 'react';
import CoderLayout from './coder/CoderLayout';
import MonitorLayout from './features/footer-monitor/MonitorLayout';
import { ProjectManagerPanel } from './features/ProjectManager';
import FrozenComponent from '../components/FrozenComponent';

export default function Home() {
  const [shouldFreezeComponents, setShouldFreezeComponents] = useState(false);

  const handleFreezeStateChange = (shouldFreeze: boolean) => {
    setShouldFreezeComponents(shouldFreeze);
  };

  return (
    <main className="min-h-screen relative">
      <FrozenComponent shouldFreeze={shouldFreezeComponents}>
        <CoderLayout />
        <MonitorLayout />
      </FrozenComponent>
      
      <ProjectManagerPanel onFreezeStateChange={handleFreezeStateChange} />
    </main>
  );
}