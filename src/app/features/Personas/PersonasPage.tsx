'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePersonaStore } from '@/stores/personaStore';
import Sidebar from './components/Sidebar';
import OverviewPage from './components/OverviewPage';
import PersonaEditor from './components/PersonaEditor';
import { TriggerList } from './components/TriggerList';
import { CredentialManager } from './components/CredentialManager';
import EmptyState from './components/EmptyState';

export default function PersonasPage() {
  const sidebarSection = usePersonaStore((s) => s.sidebarSection);
  const selectedPersonaId = usePersonaStore((s) => s.selectedPersonaId);
  const fetchPersonas = usePersonaStore((s) => s.fetchPersonas);
  const fetchToolDefinitions = usePersonaStore((s) => s.fetchToolDefinitions);
  const fetchCredentials = usePersonaStore((s) => s.fetchCredentials);
  const fetchPendingReviewCount = usePersonaStore((s) => s.fetchPendingReviewCount);

  useEffect(() => {
    fetchPersonas();
    fetchToolDefinitions();
    fetchCredentials();
    fetchPendingReviewCount();
  }, [fetchPersonas, fetchToolDefinitions, fetchCredentials, fetchPendingReviewCount]);

  const renderContent = () => {
    if (sidebarSection === 'overview') return <OverviewPage />;
    if (sidebarSection === 'credentials') return <CredentialManager />;
    if (sidebarSection === 'events') return <TriggerList />;
    if (selectedPersonaId) return <PersonaEditor />;
    return <EmptyState />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background text-foreground overflow-hidden">
      {/* Background effects matching GoalsLayout */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/0 to-background/80 pointer-events-none" />
      <div className="absolute top-0 left-0 w-1/3 h-1/2 bg-accent/5 blur-3xl pointer-events-none" />

      {/* Main layout */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Content area */}
        <motion.div
          key={sidebarSection + (selectedPersonaId || '')}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 overflow-hidden"
        >
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
}
