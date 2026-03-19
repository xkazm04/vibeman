'use client';

import { KNOWLEDGE_DOMAINS } from '@/app/db/models/knowledge.types';
import type { KnowledgeDomain } from '@/app/db/models/knowledge.types';
import type { KBStats } from '../lib/useKnowledgeBase';
import DomainCard from './DomainCard';

interface DomainGridProps {
  stats: KBStats | null;
  selectedDomain: KnowledgeDomain | null;
  onSelectDomain: (domain: KnowledgeDomain | null) => void;
}

export default function DomainGrid({ stats, selectedDomain, onSelectDomain }: DomainGridProps) {
  const handleClick = (domain: KnowledgeDomain) => {
    onSelectDomain(selectedDomain === domain ? null : domain);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {KNOWLEDGE_DOMAINS.map((domain, i) => {
        const count = stats?.byDomain[domain] ?? 0;
        return (
          <DomainCard
            key={domain}
            domain={domain}
            count={count}
            avgConfidence={count > 0 ? (stats?.avgConfidence ?? 0) : 0}
            isSelected={selectedDomain === domain}
            onClick={() => handleClick(domain)}
            index={i}
          />
        );
      })}
    </div>
  );
}
