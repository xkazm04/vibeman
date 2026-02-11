'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BarChart3, Bot, Zap, Key, Plus, Activity, ClipboardCheck, MessageSquare } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import type { SidebarSection, OverviewTab } from '@/app/features/Personas/lib/types';
import PersonaCard from './PersonaCard';
import CreatePersonaModal from './CreatePersonaModal';

const sections: Array<{ id: SidebarSection; icon: typeof Bot; label: string }> = [
  { id: 'overview', icon: BarChart3, label: 'Overview' },
  { id: 'personas', icon: Bot, label: 'Agents' },
  { id: 'events', icon: Zap, label: 'Events' },
  { id: 'credentials', icon: Key, label: 'Keys' },
];

export default function Sidebar() {
  const sidebarSection = usePersonaStore((s) => s.sidebarSection);
  const setSidebarSection = usePersonaStore((s) => s.setSidebarSection);
  const personas = usePersonaStore((s) => s.personas);
  const selectedPersonaId = usePersonaStore((s) => s.selectedPersonaId);
  const selectPersona = usePersonaStore((s) => s.selectPersona);
  const createPersona = usePersonaStore((s) => s.createPersona);
  const credentials = usePersonaStore((s) => s.credentials);
  const overviewTab = usePersonaStore((s) => s.overviewTab);
  const setOverviewTab = usePersonaStore((s) => s.setOverviewTab);
  const pendingReviewCount = usePersonaStore((s) => s.pendingReviewCount);
  const fetchPendingReviewCount = usePersonaStore((s) => s.fetchPendingReviewCount);
  const unreadMessageCount = usePersonaStore((s) => s.unreadMessageCount);
  const fetchUnreadMessageCount = usePersonaStore((s) => s.fetchUnreadMessageCount);

  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPendingReviewCount();
    fetchUnreadMessageCount();
  }, [fetchPendingReviewCount, fetchUnreadMessageCount]);

  const handleCreatePersona = () => {
    setShowCreateModal(true);
  };

  const overviewItems: Array<{ id: OverviewTab; icon: typeof Activity; label: string }> = [
    { id: 'executions', icon: Activity, label: 'Executions' },
    { id: 'manual-review', icon: ClipboardCheck, label: 'Manual Review' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'usage', icon: BarChart3, label: 'Usage' },
  ];

  const renderLevel2 = () => {
    if (sidebarSection === 'overview') {
      return (
        <>
          {overviewItems.map((item) => {
            const Icon = item.icon;
            const isActive = overviewTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setOverviewTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-secondary/50 border border-transparent'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                  isActive
                    ? 'bg-primary/15 border-primary/25'
                    : 'bg-secondary/40 border-primary/15'
                }`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground/50'}`} />
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-foreground/90' : 'text-muted-foreground/60'}`}>
                  {item.label}
                </span>
                {item.id === 'manual-review' && pendingReviewCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold leading-none rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {pendingReviewCount}
                  </span>
                )}
                {item.id === 'messages' && unreadMessageCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold leading-none rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {unreadMessageCount}
                  </span>
                )}
              </button>
            );
          })}
        </>
      );
    }

    if (sidebarSection === 'personas') {
      return (
        <>
          <button
            onClick={handleCreatePersona}
            className="w-full flex items-center gap-3 px-3 py-2.5 mb-3 rounded-xl border border-dashed border-primary/30 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary/80 group-hover:text-primary">New Persona</span>
          </button>

          <AnimatePresence>
            {personas.map((persona, i) => (
              <motion.div
                key={persona.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
              >
                <PersonaCard
                  persona={persona}
                  isSelected={selectedPersonaId === persona.id}
                  onClick={() => selectPersona(persona.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {personas.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground/50">
              No personas yet
            </div>
          )}
        </>
      );
    }

    if (sidebarSection === 'events') {
      return (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-amber-400/60" />
          </div>
          <p className="text-sm text-muted-foreground/60">Event triggers</p>
          <p className="text-xs text-muted-foreground/40 mt-1">Configure in persona settings</p>
        </div>
      );
    }

    if (sidebarSection === 'credentials') {
      return (
        <>
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="mb-2 p-3 rounded-xl border border-primary/15 bg-secondary/40 hover:bg-secondary/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Key className="w-4 h-4 text-emerald-400/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground/90 truncate">{cred.name}</div>
                  <div className="text-[11px] font-mono text-muted-foreground/50 uppercase">{cred.service_type}</div>
                </div>
              </div>
            </div>
          ))}
          {credentials.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Key className="w-6 h-6 text-emerald-400/60" />
              </div>
              <p className="text-sm text-muted-foreground/60">No credentials</p>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <div className="flex h-full">
      <CreatePersonaModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />

      {/* Level 1: Section icons */}
      <div className="w-[60px] bg-secondary/40 border-r border-primary/15 flex flex-col items-center py-4 gap-1.5">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = sidebarSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => setSidebarSection(section.id)}
              className="relative w-11 h-11 rounded-xl flex items-center justify-center transition-all group"
              title={section.label}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarSectionIndicator"
                  className="absolute inset-0 rounded-xl bg-primary/15 border border-primary/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className={`relative z-10 w-5 h-5 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-foreground/70'
              }`} />
            </button>
          );
        })}
      </div>

      {/* Level 2: Item list */}
      <div className="w-[240px] bg-secondary/30 border-r border-primary/15 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-primary/10 bg-primary/5">
          <h2 className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider">
            {sections.find((s) => s.id === sidebarSection)?.label || 'Overview'}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {renderLevel2()}
        </div>
      </div>
    </div>
  );
}
