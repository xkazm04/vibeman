'use client';

import { motion } from 'framer-motion';
import { Bot, ChevronRight } from 'lucide-react';
import type { DbPersona } from '@/app/features/Personas/lib/types';

interface PersonaCardProps {
  persona: DbPersona;
  isSelected: boolean;
  onClick: () => void;
}

export default function PersonaCard({ persona, isSelected, onClick }: PersonaCardProps) {
  const color = persona.color || '#6b7280';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      className={
        'w-full text-left px-3 py-2.5 rounded-xl border transition-all group relative overflow-hidden mb-1 ' +
        (isSelected
          ? 'bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.05)]'
          : 'bg-transparent border-transparent hover:bg-primary/5 hover:border-primary/10')
      }
    >
      {isSelected && (
        <motion.div
          layoutId="activePersonaGlow"
          className="absolute inset-0 bg-primary/5"
        />
      )}
      <div className="relative flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0 relative"
          style={{
            background: `linear-gradient(135deg, ${color}15, ${color}30)`,
            border: `1px solid ${color}40`,
          }}
        >
          {persona.icon ? (
            persona.icon.startsWith('http') ? (
              <img src={persona.icon} alt="" className="w-5 h-5" />
            ) : (
              <span>{persona.icon}</span>
            )
          ) : (
            <Bot className="w-4 h-4" style={{ color }} />
          )}
          <div
            className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
              persona.enabled ? 'bg-emerald-400' : 'bg-muted-foreground/40'
            }`}
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${
            isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
          }`}>
            {persona.name}
          </p>
          {persona.description && (
            <p className="text-[11px] text-muted-foreground/50 truncate">{persona.description}</p>
          )}
        </div>

        <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
          isSelected ? 'text-primary translate-x-0.5' : 'text-muted-foreground/30 group-hover:text-muted-foreground/60'
        }`} />
      </div>
    </motion.button>
  );
}
