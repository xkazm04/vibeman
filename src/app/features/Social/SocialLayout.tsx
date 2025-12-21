'use client';

import React from 'react';
import KanbanBoard from './components/KanbanBoard';

interface ToastType {
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  info: (title: string, message: string) => void;
}

interface SocialLayoutProps {
  toast?: ToastType;
  projectId?: string;
}

export function SocialLayout({ toast, projectId = 'default' }: SocialLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="p-4 h-screen">
        <KanbanBoard toast={toast} projectId={projectId} />
      </div>
    </div>
  );
}

export default SocialLayout;
