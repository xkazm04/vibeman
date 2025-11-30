'use client';

import { AnimatePresence } from 'framer-motion';
import type { ScanTechniqueGroup } from '../../../lib/scanTechniques';
import ScanGroupCard from './ScanGroupCard';

export interface ScanGroupListProps {
  groups: ScanTechniqueGroup[];
  selectedGroups: Set<string>;
  onToggleGroup: (id: string) => void;
}

/**
 * ScanGroupList - Renders a list of scan technique groups with animations.
 * 
 * Uses AnimatePresence for smooth enter/exit animations and delegates
 * individual group rendering to ScanGroupCard component.
 */
export default function ScanGroupList({ groups, selectedGroups, onToggleGroup }: ScanGroupListProps) {
  return (
    <div className="space-y-3 max-h-[800px] py-6 overflow-y-auto pr-2">
      <AnimatePresence mode="popLayout">
        {groups.map((group, index) => (
          <ScanGroupCard
            key={group.id}
            group={group}
            isSelected={selectedGroups.has(group.id)}
            onToggle={() => onToggleGroup(group.id)}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
