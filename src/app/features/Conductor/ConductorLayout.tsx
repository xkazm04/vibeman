'use client';

import ConductorView from './components/ConductorView';
import RunSidebar from './components/RunSidebar';
import { useConductorStore } from './lib/conductorStore';

interface ConductorLayoutProps {
  projectId?: string | null;
}

export default function ConductorLayout({ projectId }: ConductorLayoutProps) {
  const handleNewRun = () => {
    useConductorStore.getState().selectRun(null);
  };

  return (
    <div className="p-4 flex gap-4">
      <RunSidebar onNewRun={handleNewRun} />
      <div className="flex-1 min-w-0">
        <ConductorView projectId={projectId} />
      </div>
    </div>
  );
}
