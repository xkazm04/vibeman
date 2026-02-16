'use client';

import { useEffect, useRef } from 'react';
import { Trash2, Settings, UserCog } from 'lucide-react';

const ROLES = ['orchestrator', 'worker', 'reviewer', 'router'] as const;

interface NodeContextMenuProps {
  x: number;
  y: number;
  memberName: string;
  currentRole: string;
  onChangeRole: (role: string) => void;
  onRemove: () => void;
  onConfigure: () => void;
  onClose: () => void;
}

export default function NodeContextMenu({ x, y, memberName, currentRole, onChangeRole, onRemove, onConfigure, onClose }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-48 rounded-xl bg-background/95 backdrop-blur-md border border-primary/20 shadow-xl py-1 overflow-hidden"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-muted-foreground/40 border-b border-primary/10">
        {memberName}
      </div>

      {/* Role options */}
      <div className="px-1 py-1 border-b border-primary/10">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => { onChangeRole(role); onClose(); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
              currentRole === role ? 'bg-indigo-500/15 text-indigo-300' : 'text-foreground/70 hover:bg-secondary/60'
            }`}
          >
            <UserCog className="w-3 h-3" />
            <span className="capitalize">{role}</span>
            {currentRole === role && <span className="ml-auto text-[9px] text-indigo-400">current</span>}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="px-1 py-1">
        <button
          onClick={() => { onConfigure(); onClose(); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground/70 hover:bg-secondary/60 rounded-lg transition-colors"
        >
          <Settings className="w-3 h-3" />
          Configure
        </button>
        <button
          onClick={() => { onRemove(); onClose(); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Remove from Team
        </button>
      </div>
    </div>
  );
}
