'use client';

import { FileJson } from 'lucide-react';
import { CyberCard } from '@/components/ui/wizard';
import { RefactorSpec } from '../../lib/dslTypes';

interface SpecInfoCardProps {
  spec: RefactorSpec;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
}

/**
 * SpecInfoCard - Displays and edits spec name, description, and summary stats
 */
export default function SpecInfoCard({ spec, onNameChange, onDescriptionChange }: SpecInfoCardProps) {
  return (
    <CyberCard variant="dark" data-testid="spec-header-card">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
          <FileJson className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="flex-1 space-y-3">
          <input
            type="text"
            value={spec.name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full bg-transparent text-lg font-medium text-white border-b border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none transition-colors pb-1"
            placeholder="Specification Name"
            data-testid="spec-name-input"
          />
          <input
            type="text"
            value={spec.description || ''}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-400 border-b border-transparent hover:border-white/20 focus:border-cyan-500/50 focus:outline-none transition-colors pb-1"
            placeholder="Add a description..."
            data-testid="spec-description-input"
          />
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{spec.transformations.length} rule{spec.transformations.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{spec.scope.include.length} include pattern{spec.scope.include.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>Mode: {spec.execution?.mode || 'preview'}</span>
          </div>
        </div>
      </div>
    </CyberCard>
  );
}
