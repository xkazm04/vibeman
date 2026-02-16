'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';

interface TeamConfigPanelProps {
  member: any;
  onClose: () => void;
  onRoleChange: (memberId: string, role: string) => void;
  onRemove: (memberId: string) => void;
}

const ROLES = [
  { value: 'orchestrator', label: 'Orchestrator', description: 'Coordinates other agents' },
  { value: 'worker', label: 'Worker', description: 'Executes assigned tasks' },
  { value: 'reviewer', label: 'Reviewer', description: 'Reviews outputs and provides feedback' },
  { value: 'router', label: 'Router', description: 'Routes tasks to appropriate agents' },
];

export default function TeamConfigPanel({ member, onClose, onRoleChange, onRemove }: TeamConfigPanelProps) {
  if (!member) return null;

  const personaName = member.persona_name || member.name || 'Agent';
  const personaIcon = member.persona_icon || member.icon || '';
  const personaColor = member.persona_color || member.color || '#6366f1';
  const isUrl = typeof personaIcon === 'string' && personaIcon.startsWith('http');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="absolute top-0 right-0 bottom-0 w-72 bg-background/95 backdrop-blur-md border-l border-primary/15 z-20 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10">
          <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider">Configure</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary/60 text-muted-foreground/50 hover:text-foreground/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Persona Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-primary/10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
              style={{
                backgroundColor: personaColor + '15',
                borderColor: personaColor + '30',
              }}
            >
              {isUrl ? (
                <img src={personaIcon} alt="" className="w-5 h-5 rounded object-cover" />
              ) : (
                <span className="text-base">{personaIcon || '🤖'}</span>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground/90">{personaName}</div>
              <div className="text-[11px] text-muted-foreground/50">Member ID: {member.id?.slice(0, 8)}...</div>
            </div>
          </div>

          {/* Role Selector */}
          <div>
            <label className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider mb-2 block">
              Role
            </label>
            <div className="space-y-1.5">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  onClick={() => onRoleChange(member.id, role.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                    member.role === role.value
                      ? 'bg-indigo-500/10 border-indigo-500/25'
                      : 'bg-secondary/30 border-primary/10 hover:bg-secondary/50'
                  }`}
                >
                  <div className={`text-xs font-medium ${member.role === role.value ? 'text-indigo-300' : 'text-foreground/70'}`}>
                    {role.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground/40 mt-0.5">{role.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-primary/10">
          <button
            onClick={() => {
              if (confirm(`Remove "${personaName}" from team?`)) {
                onRemove(member.id);
                onClose();
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 text-xs font-medium transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove from Team
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
