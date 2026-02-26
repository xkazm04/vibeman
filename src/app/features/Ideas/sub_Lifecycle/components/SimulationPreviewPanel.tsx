'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  GitBranch,
  GitPullRequest,
  FileCode,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  Copy,
  Check,
} from 'lucide-react';
import { SimulationPreview } from '../lib/lifecycleTypes';

interface SimulationPreviewPanelProps {
  preview: SimulationPreview;
  onDismiss?: () => void;
  onPromoteToDeploy?: () => void;
}

export default function SimulationPreviewPanel({
  preview,
  onDismiss,
  onPromoteToDeploy,
}: SimulationPreviewPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');
  const [copiedPR, setCopiedPR] = useState(false);

  const allGatesPassed = preview.gate_summary.every(g => g.passed);
  const passedCount = preview.gate_summary.filter(g => g.passed).length;

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const copyPRBody = () => {
    navigator.clipboard.writeText(preview.pr_body);
    setCopiedPR(true);
    setTimeout(() => setCopiedPR(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gray-800/60 border border-amber-500/30 rounded-lg overflow-hidden"
      data-testid="simulation-preview-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/40 bg-amber-500/5">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300">Simulation Preview</span>
          <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] uppercase font-semibold rounded">
            dry run
          </span>
        </div>
        <div className="flex items-center gap-2">
          {allGatesPassed && !preview.blocked_reason && onPromoteToDeploy && (
            <button
              onClick={onPromoteToDeploy}
              className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded text-green-400 text-xs transition-colors"
              data-testid="simulation-promote-btn"
            >
              <GitPullRequest className="w-3 h-3" />
              Deploy for Real
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-500 hover:text-gray-400 text-xs"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Blocked warning */}
      {preview.blocked_reason && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/5 border-b border-gray-700/40">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-xs text-red-400">{preview.blocked_reason}</span>
        </div>
      )}

      {/* Summary Section */}
      <div>
        <button
          onClick={() => toggleSection('summary')}
          className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-700/20 transition-colors"
        >
          <span className="text-xs font-medium text-gray-300">What Would Happen</span>
          {expandedSection === 'summary' ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          )}
        </button>
        <AnimatePresence>
          {expandedSection === 'summary' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-2">
                {/* Branch */}
                <div className="flex items-center gap-2 text-xs">
                  <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-gray-400">Branch:</span>
                  <code className="px-1.5 py-0.5 bg-gray-700/50 rounded text-blue-300 font-mono text-[11px]">
                    {preview.would_create_branch}
                  </code>
                </div>

                {/* PR */}
                <div className="flex items-center gap-2 text-xs">
                  <GitPullRequest className={`w-3.5 h-3.5 ${preview.would_create_pr ? 'text-green-400' : 'text-gray-500'}`} />
                  <span className="text-gray-400">Pull Request:</span>
                  <span className={preview.would_create_pr ? 'text-green-400' : 'text-gray-500'}>
                    {preview.would_create_pr ? 'Would be created' : 'Not eligible'}
                  </span>
                </div>

                {/* Files */}
                <div className="flex items-center gap-2 text-xs">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-gray-400">Files changed:</span>
                  <span className="text-cyan-300">{preview.files_changed.length}</span>
                </div>

                {/* Gates */}
                <div className="flex items-center gap-2 text-xs">
                  <Shield className={`w-3.5 h-3.5 ${allGatesPassed ? 'text-green-400' : 'text-amber-400'}`} />
                  <span className="text-gray-400">Quality gates:</span>
                  <span className={allGatesPassed ? 'text-green-400' : 'text-amber-400'}>
                    {passedCount}/{preview.gate_summary.length} passed
                  </span>
                </div>

                {/* Impact */}
                <div className="mt-2 px-3 py-2 bg-gray-700/30 rounded text-xs text-gray-300">
                  {preview.estimated_impact}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ideas Section */}
      {preview.ideas_implemented.length > 0 && (
        <div className="border-t border-gray-700/40">
          <button
            onClick={() => toggleSection('ideas')}
            className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-700/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-gray-300">
                Ideas ({preview.ideas_implemented.length})
              </span>
            </div>
            {expandedSection === 'ideas' ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSection === 'ideas' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-1.5">
                  {preview.ideas_implemented.map((idea) => (
                    <div
                      key={idea.id}
                      className="flex items-center gap-2 px-2 py-1.5 bg-gray-700/20 rounded text-xs"
                    >
                      <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />
                      <span className="text-gray-300 truncate">{idea.title}</span>
                      <span className="text-gray-500 shrink-0">({idea.category})</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Quality Gates Section */}
      {preview.gate_summary.length > 0 && (
        <div className="border-t border-gray-700/40">
          <button
            onClick={() => toggleSection('gates')}
            className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-700/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-medium text-gray-300">
                Gate Results
              </span>
            </div>
            {expandedSection === 'gates' ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSection === 'gates' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-1">
                  {preview.gate_summary.map((gate, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs"
                    >
                      {gate.passed ? (
                        <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                      )}
                      <span className={`font-medium ${gate.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {gate.gate}
                      </span>
                      {gate.message && (
                        <span className="text-gray-500 truncate">{gate.message}</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* PR Preview Section */}
      <div className="border-t border-gray-700/40">
        <button
          onClick={() => toggleSection('pr')}
          className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-700/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-medium text-gray-300">PR Preview</span>
          </div>
          {expandedSection === 'pr' ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          )}
        </button>
        <AnimatePresence>
          {expandedSection === 'pr' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-2">
                <div className="text-xs text-gray-400">
                  <span className="text-gray-500">Title:</span>{' '}
                  <span className="text-gray-200">{preview.pr_title}</span>
                </div>
                <div className="relative">
                  <pre className="p-3 bg-gray-900/50 border border-gray-700/30 rounded text-[11px] text-gray-400 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {preview.pr_body}
                  </pre>
                  <button
                    onClick={copyPRBody}
                    className="absolute top-2 right-2 p-1 bg-gray-700/50 hover:bg-gray-700/80 rounded transition-colors"
                    title="Copy PR body"
                  >
                    {copiedPR ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Files Changed Section */}
      {preview.files_changed.length > 0 && (
        <div className="border-t border-gray-700/40">
          <button
            onClick={() => toggleSection('files')}
            className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-700/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-gray-300">
                Files ({preview.files_changed.length})
              </span>
            </div>
            {expandedSection === 'files' ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSection === 'files' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3">
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {preview.files_changed.map((file, idx) => (
                      <div key={idx} className="text-[11px] font-mono text-gray-400 px-1.5 py-0.5 hover:bg-gray-700/20 rounded">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
