'use client';

import { X, Shield, Code2, Wand2, Zap } from 'lucide-react';

export interface WizardHeaderProps {
  isDSLMode: boolean;
  onToggleDSLMode: () => void;
  onOpenDebtPrediction: () => void;
  onClose: () => void;
  onSwitchToQuickMode?: () => void;
}

export default function WizardHeader({
  isDSLMode,
  onToggleDSLMode,
  onOpenDebtPrediction,
  onClose,
  onSwitchToQuickMode,
}: WizardHeaderProps) {
  return (
    <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-cyan-500/10 bg-cyan-950/20 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
          <span className="text-cyan-400 font-bold text-lg">RW</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Refactor Wizard</h1>
          <p className="text-xs text-cyan-400/60 font-mono">AI-POWERED CODE EVOLUTION</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Mode Button */}
        {onSwitchToQuickMode && (
          <button
            onClick={onSwitchToQuickMode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
            data-testid="switch-to-quick-mode"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Mode</span>
          </button>
        )}

        {/* DSL Mode Toggle */}
        <button
          onClick={onToggleDSLMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isDSLMode
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
          }`}
          data-testid="toggle-dsl-mode"
        >
          {isDSLMode ? (
            <>
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">Wizard Mode</span>
            </>
          ) : (
            <>
              <Code2 className="w-4 h-4" />
              <span className="hidden sm:inline">DSL Mode</span>
            </>
          )}
        </button>

        {/* Debt Prediction Button */}
        <button
          onClick={onOpenDebtPrediction}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors"
          data-testid="open-debt-prediction"
        >
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Debt Prevention</span>
        </button>

        <button
          onClick={onClose}
          className="group relative p-2 hover:bg-white/5 rounded-full transition-colors"
          data-testid="close-refactor-wizard"
        >
          <X className="w-6 h-6 text-cyan-400/60 group-hover:text-cyan-400 transition-colors" />
          <span className="sr-only">Close Wizard</span>
        </button>
      </div>
    </header>
  );
}
