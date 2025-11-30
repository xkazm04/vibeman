'use client';

import {
  ChevronRight,
  Play,
  AlertTriangle,
  BookOpen,
  PanelRightClose,
} from 'lucide-react';
import { ValidationError } from '../../lib/dslTypes';
import { getErrorCounts } from '../../lib/dslValidator';

export interface DSLBuilderHeaderProps {
  validationErrors: ValidationError[];
  showLibrary: boolean;
  canExecute: boolean;
  onToggleLibrary: () => void;
  onExecute: () => void;
  onBack: () => void;
}

/**
 * DSLBuilderHeader - Header component for the DSL Builder
 * 
 * Displays:
 * - Back button to return to wizard
 * - Validation status (errors/warnings count)
 * - Library toggle button
 * - Execute button
 */
export default function DSLBuilderHeader({
  validationErrors,
  showLibrary,
  canExecute,
  onToggleLibrary,
  onExecute,
  onBack,
}: DSLBuilderHeaderProps) {
  const errorCounts = getErrorCounts(validationErrors);

  return (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        data-testid="dsl-builder-back-btn"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to Wizard
      </button>

      <div className="flex items-center gap-3">
        {/* Validation status */}
        {validationErrors.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            {errorCounts.errors > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                {errorCounts.errors} error{errorCounts.errors !== 1 ? 's' : ''}
              </span>
            )}
            {errorCounts.warnings > 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <AlertTriangle className="w-4 h-4" />
                {errorCounts.warnings} warning{errorCounts.warnings !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Library toggle */}
        <button
          onClick={onToggleLibrary}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
            showLibrary
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
          data-testid="toggle-library-btn"
        >
          {showLibrary ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <BookOpen className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Library</span>
        </button>

        {/* Execute button */}
        <button
          onClick={onExecute}
          disabled={!canExecute}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="dsl-execute-btn"
        >
          <Play className="w-4 h-4" />
          Execute
        </button>
      </div>
    </div>
  );
}
