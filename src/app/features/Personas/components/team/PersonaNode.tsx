'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  orchestrator: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25' },
  worker: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/25' },
  reviewer: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  router: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/25' },
};

function PersonaNodeComponent({ data, selected }: NodeProps) {
  const d = data as any;
  const name = d.name || 'Agent';
  const icon = d.icon || '';
  const color = d.color || '#6366f1';
  const role = d.role || 'worker';
  const roleDef = ROLE_COLORS[role] || ROLE_COLORS.worker;

  const isUrl = typeof icon === 'string' && icon.startsWith('http');

  return (
    <div
      className={`relative px-4 py-3 rounded-xl bg-secondary/60 backdrop-blur-sm border transition-all min-w-[160px] ${
        selected
          ? 'border-indigo-500/50 shadow-[0_0_16px_rgba(99,102,241,0.15)]'
          : 'border-primary/15 hover:border-primary/25'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !rounded-full !border-2 !border-indigo-500/40 !bg-background"
      />

      <div className="flex items-center gap-2.5">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
          style={{
            backgroundColor: color + '15',
            borderColor: color + '30',
          }}
        >
          {isUrl ? (
            <img src={icon} alt="" className="w-5 h-5 rounded object-cover" />
          ) : (
            <span className="text-base">{icon || '🤖'}</span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground/90 truncate max-w-[100px]">
            {name}
          </div>
          <div className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 text-[9px] font-mono uppercase rounded-md border ${roleDef.bg} ${roleDef.text} ${roleDef.border}`}>
            {role}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !rounded-full !border-2 !border-indigo-500/40 !bg-background"
      />
    </div>
  );
}

export default memo(PersonaNodeComponent);
