'use client';

import ConductorView from './components/ConductorView';

interface ConductorLayoutProps {
  projectId?: string | null;
}

export default function ConductorLayout({ projectId }: ConductorLayoutProps) {
  return (
    <div className="p-4">
      <ConductorView projectId={projectId} />
    </div>
  );
}
