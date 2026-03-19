'use client';

import { motion } from 'framer-motion';
import {
  Palette, Globe, Database, TestTube, Gauge, Shield, Layers, Code2,
} from 'lucide-react';
import type { KnowledgeDomain } from '@/app/db/models/knowledge.types';
import { KNOWLEDGE_DOMAIN_LABELS } from '@/app/db/models/knowledge.types';
import { GlassCard } from '@/components/ui/GlassCard';
import { transition } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import ConfidenceBar from './ConfidenceBar';

const DOMAIN_CONFIG: Partial<Record<KnowledgeDomain, { icon: typeof Palette; color: string; accent: string }>> & Record<string, { icon: typeof Palette; color: string; accent: string }> = {
  ui:               { icon: Palette,  color: 'text-pink-400',   accent: 'rgba(236,72,153,0.12)' },
  api:              { icon: Globe,    color: 'text-blue-400',   accent: 'rgba(59,130,246,0.12)' },
  state_management: { icon: Layers,   color: 'text-purple-400', accent: 'rgba(168,85,247,0.12)' },
  database:         { icon: Database, color: 'text-amber-400',  accent: 'rgba(245,158,11,0.12)' },
  testing:          { icon: TestTube, color: 'text-green-400',  accent: 'rgba(34,197,94,0.12)' },
  performance:      { icon: Gauge,    color: 'text-cyan-400',   accent: 'rgba(6,182,212,0.12)' },
  architecture:     { icon: Code2,    color: 'text-indigo-400', accent: 'rgba(99,102,241,0.12)' },
  security:         { icon: Shield,   color: 'text-red-400',    accent: 'rgba(239,68,68,0.12)' },
};

export { DOMAIN_CONFIG };

interface DomainCardProps {
  domain: KnowledgeDomain;
  count: number;
  avgConfidence: number;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export default function DomainCard({ domain, count, avgConfidence, isSelected, onClick, index }: DomainCardProps) {
  const config = DOMAIN_CONFIG[domain]!;
  const Icon = config.icon;
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition.deliberate, delay: index * 0.04 }}
    >
      <GlassCard
        hover
        clickable
        onClick={onClick}
        padding="none"
        className={`p-4 ${isSelected ? 'ring-1 ring-purple-500/40' : ''}`}
        glowColor={isSelected ? 'rgba(168,85,247,0.12)' : config.accent}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
            style={{ background: config.accent }}
          >
            <Icon className={`w-4.5 h-4.5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-zinc-200 truncate">
              {KNOWLEDGE_DOMAIN_LABELS[domain]}
            </h3>
            <p className="text-2xs text-zinc-500 mt-0.5">
              {count} {count === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>
        {count > 0 && (
          <div className="mt-3">
            <ConfidenceBar value={Math.round(avgConfidence)} size="sm" showLabel />
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
