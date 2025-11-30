'use client';

import { Sparkles } from 'lucide-react';
import { CyberCard } from '@/components/ui/wizard';

export interface ResultsNextStepsProps {
  isDirectMode: boolean;
}

/**
 * ResultsNextSteps - Displays the next steps guidance card with numbered instructions.
 * 
 * Shows a card with four numbered steps guiding the user on how to execute
 * the generated refactoring packages.
 */
export function ResultsNextSteps({ isDirectMode }: ResultsNextStepsProps) {
  return (
    <CyberCard variant="glow" data-testid="next-steps-card">
      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        Next Steps
      </h4>
      <div className="space-y-3">
        <div className="flex items-start gap-3 text-sm">
          <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
            <span className="text-xs font-mono text-cyan-400">1</span>
          </div>
          <div>
            <p className="text-white font-medium mb-1">Execute Packages in Order</p>
            <p className="text-gray-400 text-xs">
              Start with package #1 and follow the execution order to respect dependencies
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
            <span className="text-xs font-mono text-cyan-400">2</span>
          </div>
          <div>
            <p className="text-white font-medium mb-1">Use Claude Code</p>
            <p className="text-gray-400 text-xs">
              Run <code className="px-1 py-0.5 bg-black/30 rounded text-xs font-mono">/package-...</code> commands to execute each strategic requirement
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
            <span className="text-xs font-mono text-cyan-400">3</span>
          </div>
          <div>
            <p className="text-white font-medium mb-1">Validate Each Package</p>
            <p className="text-gray-400 text-xs">
              Each requirement includes validation criteria - check tests, types, and measurable outcomes
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-sm">
          <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
            <span className="text-xs font-mono text-cyan-400">4</span>
          </div>
          <div>
            <p className="text-white font-medium mb-1">Review CLAUDE.md Context</p>
            <p className="text-gray-400 text-xs">
              Each package includes project context, priorities, and conventions for context-aware implementation
            </p>
          </div>
        </div>
      </div>
    </CyberCard>
  );
}
