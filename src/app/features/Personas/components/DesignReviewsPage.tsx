'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Play,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Lightbulb,
  RotateCcw,
  Download,
  Plug,
  Mail,
  Calendar,
  HardDrive,
  MessageSquare,
  Github,
  Globe,
  Wrench,
  Webhook,
  Zap,
  Brain,
  FileText,
  Code2,
  ShieldAlert,
  Sparkles,
  Filter,
  X,
  Workflow,
} from 'lucide-react';
import { useDesignReviews } from '../hooks/useDesignReviews';
import DesignReviewRunner from './DesignReviewRunner';
import ActivityDiagramModal from './ActivityDiagramModal';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { DbDesignReview, StructuralCheck } from '@/lib/personas/testing/testTypes';
import type { UseCaseFlow } from '@/lib/personas/testing/flowTypes';
import type { DesignAnalysisResult, SuggestedTrigger, SuggestedConnector } from '@/app/features/Personas/lib/designTypes';

// ============================================================================
// Constants
// ============================================================================

const CONNECTOR_META: Record<string, { label: string; color: string; iconUrl: string | null; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  gmail: { label: 'Gmail', color: '#EA4335', iconUrl: 'https://cdn.simpleicons.org/gmail/EA4335', Icon: Mail },
  google_calendar: { label: 'Google Calendar', color: '#4285F4', iconUrl: 'https://cdn.simpleicons.org/googlecalendar/4285F4', Icon: Calendar },
  google_drive: { label: 'Google Drive', color: '#0F9D58', iconUrl: 'https://cdn.simpleicons.org/googledrive/0F9D58', Icon: HardDrive },
  slack: { label: 'Slack', color: '#4A154B', iconUrl: 'https://cdn.simpleicons.org/slack/4A154B', Icon: MessageSquare },
  github: { label: 'GitHub', color: '#24292e', iconUrl: 'https://cdn.simpleicons.org/github/f0f0f0', Icon: Github },
  http: { label: 'HTTP / REST', color: '#3B82F6', iconUrl: null, Icon: Globe },
  telegram: { label: 'Telegram', color: '#26A5E4', iconUrl: 'https://cdn.simpleicons.org/telegram/26A5E4', Icon: MessageSquare },
  discord: { label: 'Discord', color: '#5865F2', iconUrl: 'https://cdn.simpleicons.org/discord/5865F2', Icon: MessageSquare },
  jira: { label: 'Jira', color: '#0052CC', iconUrl: 'https://cdn.simpleicons.org/jira/0052CC', Icon: Globe },
  notion: { label: 'Notion', color: '#FFFFFF', iconUrl: 'https://cdn.simpleicons.org/notion/f0f0f0', Icon: Globe },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
}

function parseJsonSafe<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function getConnectorMeta(name: string): { label: string; color: string; iconUrl: string | null; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> } {
  if (CONNECTOR_META[name]) return CONNECTOR_META[name];
  // Try to resolve unknown connectors via Simple Icons CDN
  const slug = name.toLowerCase().replace(/[_\s]/g, '');
  return { label: name, color: '#6B7280', iconUrl: `https://cdn.simpleicons.org/${slug}/9ca3af`, Icon: Plug };
}

function ConnectorIcon({ meta, size = 'w-3.5 h-3.5' }: { meta: ReturnType<typeof getConnectorMeta>; size?: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const FallbackIcon = meta.Icon;
  if (meta.iconUrl && !imgFailed) {
    return <img src={meta.iconUrl} alt={meta.label} className={size} onError={() => setImgFailed(true)} />;
  }
  return <FallbackIcon className={size} style={{ color: meta.color }} />;
}

function getQualityScore(review: DbDesignReview): number | null {
  if (review.structural_score === null && review.semantic_score === null) return null;
  if (review.structural_score !== null && review.semantic_score !== null) {
    return Math.round((review.structural_score + review.semantic_score) / 2);
  }
  return review.structural_score ?? review.semantic_score;
}

function getQualityColor(score: number): string {
  if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-red-400 bg-red-500/10 border-red-500/20';
}

// ============================================================================
// ConnectorDropdown Sub-Component
// ============================================================================

function ConnectorDropdown({
  availableConnectors,
  connectorFilter,
  setConnectorFilter,
}: {
  availableConnectors: string[];
  connectorFilter: string[];
  setConnectorFilter: (connectors: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toggleConnector = (name: string) => {
    if (connectorFilter.includes(name)) {
      setConnectorFilter(connectorFilter.filter((c) => c !== name));
    } else {
      setConnectorFilter([...connectorFilter, name]);
    }
  };

  const sorted = useMemo(() => {
    return [...availableConnectors].sort((a, b) => {
      const la = getConnectorMeta(a).label;
      const lb = getConnectorMeta(b).label;
      return la.localeCompare(lb);
    });
  }, [availableConnectors]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-xs rounded-xl border border-primary/15 hover:bg-secondary/50 text-muted-foreground/60 transition-colors flex items-center gap-1.5"
      >
        <Filter className="w-3.5 h-3.5" />
        Filter by connector
        {connectorFilter.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-medium">
            {connectorFilter.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-background border border-primary/20 rounded-xl shadow-xl min-w-[220px] py-1.5 overflow-hidden">
          {sorted.map((name) => {
            const meta = getConnectorMeta(name);
            const isSelected = connectorFilter.includes(name);
            return (
              <button
                key={name}
                onClick={() => toggleConnector(name)}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-left hover:bg-primary/5 transition-colors"
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${meta.color}20` }}
                >
                  <ConnectorIcon meta={meta} size="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-foreground/70 flex-1">{meta.label}</span>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-violet-500/30 border-violet-500/50'
                      : 'border-primary/20'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-violet-300" />}
                </div>
              </button>
            );
          })}
          {connectorFilter.length > 0 && (
            <div className="border-t border-primary/10 mt-1 pt-1">
              <button
                onClick={() => {
                  setConnectorFilter([]);
                  setIsOpen(false);
                }}
                className="w-full px-3.5 py-2 text-left text-xs text-muted-foreground/50 hover:text-foreground/60 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
          {sorted.length === 0 && (
            <div className="px-3.5 py-2 text-xs text-muted-foreground/30 italic">
              No connectors available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TemplateSummaryCard Sub-Component
// ============================================================================

function TemplateSummaryCard({ summary }: { summary: string }) {
  return (
    <div className="bg-gradient-to-r from-violet-500/5 to-transparent border border-violet-500/10 rounded-xl px-4 py-3">
      <p className="text-sm text-foreground/70 leading-relaxed">{summary}</p>
    </div>
  );
}

// ============================================================================
// TemplatePromptPreview Sub-Component
// ============================================================================

interface PromptSection {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  content: string;
}

function TemplatePromptPreview({
  designResult,
}: {
  designResult: DesignAnalysisResult;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const sections = useMemo<PromptSection[]>(() => {
    const sp = designResult.structured_prompt;
    const builtIn: PromptSection[] = [];

    if (sp.identity) builtIn.push({ key: 'identity', label: 'Identity', Icon: Brain, content: sp.identity });
    if (sp.instructions) builtIn.push({ key: 'instructions', label: 'Instructions', Icon: FileText, content: sp.instructions });
    if (sp.toolGuidance) builtIn.push({ key: 'toolGuidance', label: 'Tool Guidance', Icon: Wrench, content: sp.toolGuidance });
    if (sp.examples) builtIn.push({ key: 'examples', label: 'Examples', Icon: Code2, content: sp.examples });
    if (sp.errorHandling) builtIn.push({ key: 'errorHandling', label: 'Error Handling', Icon: ShieldAlert, content: sp.errorHandling });

    if (sp.customSections) {
      for (const cs of sp.customSections) {
        builtIn.push({
          key: `custom_${cs.title}`,
          label: cs.title,
          Icon: Sparkles,
          content: cs.content,
        });
      }
    }

    return builtIn;
  }, [designResult.structured_prompt]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 text-sm font-semibold text-foreground/70 tracking-wide hover:text-foreground/90 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        Prompt Preview
        <span className="text-xs text-muted-foreground/40 font-normal">
          ({sections.length} sections)
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-1.5">
              {sections.map((section) => {
                const SectionIcon = section.Icon;
                const sectionOpen = openSections.has(section.key);
                return (
                  <div key={section.key} className="bg-secondary/20 border border-primary/8 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 w-full text-left hover:bg-primary/5 transition-colors"
                    >
                      {sectionOpen ? (
                        <ChevronDown className="w-3 h-3 text-muted-foreground/40" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                      )}
                      <SectionIcon className="w-3.5 h-3.5 text-violet-400/70" />
                      <span className="text-xs font-medium text-foreground/60">{section.label}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {sectionOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3.5 py-2.5 border-t border-primary/8 max-h-[300px] overflow-y-auto">
                            <MarkdownRenderer content={section.content} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// TemplateConnectorGrid Sub-Component
// ============================================================================

interface ConnectorRow {
  connector: SuggestedConnector | null;
  tools: string[];
  triggerIndices: number[];
}

function TemplateConnectorGrid({
  designResult,
}: {
  designResult: DesignAnalysisResult;
}) {
  const suggestedConnectors = designResult.suggested_connectors ?? [];

  const rows = useMemo<ConnectorRow[]>(() => {
    const linkedTools = new Set<string>();
    const linkedTriggers = new Set<number>();
    const connectorRows: ConnectorRow[] = [];

    for (const conn of suggestedConnectors) {
      const tools = (conn.related_tools ?? []).filter((t) => designResult.suggested_tools.includes(t));
      const triggerIdxs = (conn.related_triggers ?? []).filter(
        (i) => i >= 0 && i < designResult.suggested_triggers.length
      );

      tools.forEach((t) => linkedTools.add(t));
      triggerIdxs.forEach((i) => linkedTriggers.add(i));

      connectorRows.push({ connector: conn, tools, triggerIndices: triggerIdxs });
    }

    const unlinkedTools = designResult.suggested_tools.filter((t) => !linkedTools.has(t));
    const unlinkedTriggers = designResult.suggested_triggers
      .map((_, i) => i)
      .filter((i) => !linkedTriggers.has(i));

    if (unlinkedTools.length > 0 || unlinkedTriggers.length > 0) {
      connectorRows.push({ connector: null, tools: unlinkedTools, triggerIndices: unlinkedTriggers });
    }

    return connectorRows;
  }, [suggestedConnectors, designResult.suggested_tools, designResult.suggested_triggers]);

  if (rows.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wide mb-2">
        Connectors &amp; Configuration
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((row, rowIdx) => (
          <TemplateConnectorCard
            key={rowIdx}
            row={row}
            designResult={designResult}
          />
        ))}
      </div>
    </div>
  );
}

function triggerIcon(type: SuggestedTrigger['trigger_type']) {
  switch (type) {
    case 'schedule':
    case 'polling':
      return <Clock className="w-4 h-4 text-amber-400" />;
    case 'webhook':
      return <Webhook className="w-4 h-4 text-blue-400" />;
    case 'manual':
      return <Play className="w-4 h-4 text-emerald-400" />;
    default:
      return <Zap className="w-4 h-4 text-purple-400" />;
  }
}

function TemplateConnectorCard({
  row,
  designResult,
}: {
  row: ConnectorRow;
  designResult: DesignAnalysisResult;
}) {
  const [expanded, setExpanded] = useState(false);

  const connector = row.connector;
  const connectorName = connector?.name ?? 'general';
  const meta = getConnectorMeta(connectorName);
  const ConnIcon = connector ? meta.Icon : Wrench;

  const toolCount = row.tools.length;
  const triggerCount = row.triggerIndices.length;

  return (
    <div className="bg-secondary/30 border border-primary/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-2.5 px-3.5 py-2.5 w-full text-left hover:bg-primary/5 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
        )}
        {connector ? (
          <div
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${meta.color}20` }}
          >
            <ConnIcon className="w-3.5 h-3.5" style={{ color: meta.color }} />
          </div>
        ) : (
          <Wrench className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-foreground/80 truncate flex-1">
          {connector ? meta.label : 'General'}
        </span>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {toolCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/60 text-xs text-foreground/50">
              <Wrench className="w-3 h-3 text-primary/50" />
              {toolCount}
            </span>
          )}
          {triggerCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/60 text-xs text-foreground/50">
              <Zap className="w-3 h-3 text-amber-400/60" />
              {triggerCount}
            </span>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3.5 py-2.5 space-y-2 border-t border-primary/8">
              {row.tools.map((toolName) => (
                <div key={toolName} className="flex items-start gap-2">
                  <Wrench className="w-3.5 h-3.5 text-primary/40 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground/70 truncate">{toolName}</span>
                </div>
              ))}

              {row.triggerIndices.map((trigIdx) => {
                const trigger = designResult.suggested_triggers[trigIdx];
                if (!trigger) return null;
                return (
                  <div key={trigIdx} className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">{triggerIcon(trigger.trigger_type)}</div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground/70 capitalize truncate block">
                        {trigger.trigger_type}
                      </span>
                      <span className="text-sm text-muted-foreground/40 leading-snug block">
                        {trigger.description}
                      </span>
                    </div>
                  </div>
                );
              })}

              {toolCount === 0 && triggerCount === 0 && (
                <div className="text-sm text-muted-foreground/20 py-1">&mdash;</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// TemplateQualitySection Sub-Component
// ============================================================================

function TemplateQualitySection({ review }: { review: DbDesignReview }) {
  const structuralEval = parseJsonSafe<{ passed: boolean; score: number; checks: StructuralCheck[] } | null>(
    review.structural_evaluation,
    null
  );
  const semanticEval = parseJsonSafe<{
    passed: boolean;
    overallScore: number;
    dimensions: { name: string; score: number; feedback: string }[];
    llmReasoning: string;
  } | null>(review.semantic_evaluation, null);

  if (!structuralEval && !semanticEval) return null;

  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wide mb-2">
        Quality Evaluation
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Structural checks */}
        <div>
          <h5 className="text-xs font-medium text-muted-foreground/60 mb-2">Structural Checks</h5>
          {structuralEval ? (
            <div className="space-y-1">
              {structuralEval.checks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {check.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  )}
                  <span className={check.passed ? 'text-foreground/70' : 'text-red-300/80'}>
                    <span className="font-medium">{check.name}</span>: {check.message}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/30">No structural data</p>
          )}
        </div>

        {/* Right: Semantic dimensions */}
        <div>
          <h5 className="text-xs font-medium text-muted-foreground/60 mb-2">Semantic Dimensions</h5>
          {semanticEval ? (
            <div className="space-y-3">
              {semanticEval.dimensions.map((dim, i) => (
                <div key={i} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground/80 font-medium">{dim.name}</span>
                    <span
                      className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                        dim.score >= 80 ? 'text-emerald-400 bg-emerald-500/10' : dim.score >= 60 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'
                      }`}
                    >
                      {dim.score}
                    </span>
                  </div>
                  <div className="space-y-0.5 pl-1">
                    {dim.feedback.split(/\\n|\n/).filter(Boolean).map((line, j) => {
                      const trimmed = line.trim();
                      const isPositive = trimmed.startsWith('+');
                      const isIssue = trimmed.startsWith('!');
                      const isBullet = trimmed.startsWith('-') || isPositive || isIssue;
                      const text = isBullet ? trimmed.slice(1).trim() : trimmed;
                      return (
                        <div key={j} className="flex items-start gap-1.5">
                          {isPositive ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                          ) : isIssue ? (
                            <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                          ) : isBullet ? (
                            <span className="w-1 h-1 rounded-full bg-foreground/30 mt-1.5 flex-shrink-0" />
                          ) : null}
                          <span className={`${isIssue ? 'text-amber-300/90' : isPositive ? 'text-emerald-300/90' : 'text-foreground/60'}`}>
                            {text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/30">Semantic evaluation skipped</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ExpandedDetail Sub-Component
// ============================================================================

function ExpandedDetail({
  review,
  onAdopt,
  isAdopting,
  isRunning,
  onApplyAdjustment,
  onViewDiagram,
}: {
  review: DbDesignReview;
  onAdopt: (review: DbDesignReview) => void;
  isAdopting: boolean;
  isRunning: boolean;
  onApplyAdjustment: (adjustedInstruction: string) => void;
  onViewDiagram: (review: DbDesignReview) => void;
}) {
  const [showJson, setShowJson] = useState(false);

  const designResult = parseJsonSafe<DesignAnalysisResult | null>(review.design_result, null);
  const adjustment = parseJsonSafe<{
    suggestion: string;
    reason: string;
    appliedFixes: string[];
  } | null>(review.suggested_adjustment, null);

  if (!designResult) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground/40">
        Design data unavailable for this template.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Summary Card */}
      {designResult.summary && (
        <TemplateSummaryCard summary={designResult.summary} />
      )}

      {/* 2. Prompt Preview */}
      <TemplatePromptPreview designResult={designResult} />

      {/* 3. Connector Grid */}
      <TemplateConnectorGrid designResult={designResult} />

      {/* 3.5. Use Case Flows Preview */}
      {(() => {
        const flows = parseJsonSafe<UseCaseFlow[]>(review.use_case_flows, []);
        if (flows.length === 0) return null;
        return (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wide mb-2">
              Use Case Flows
            </h4>
            <div className="flex items-center gap-3 flex-wrap">
              {flows.map((flow) => (
                <button
                  key={flow.id}
                  onClick={() => onViewDiagram(review)}
                  className="bg-violet-500/5 border border-violet-500/15 rounded-xl px-4 py-3 text-left hover:bg-violet-500/10 hover:border-violet-500/25 transition-all group min-w-[180px]"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Workflow className="w-4 h-4 text-violet-400/70 group-hover:text-violet-400 transition-colors" />
                    <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground/90 truncate">
                      {flow.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground/40">
                    <span>{flow.nodes.length} nodes</span>
                    <span>{flow.edges.length} edges</span>
                  </div>
                  <div className="text-[10px] text-violet-400/50 mt-1.5 group-hover:text-violet-400/70 transition-colors">
                    View diagram
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 4. Quality Section */}
      <TemplateQualitySection review={review} />

      {/* 5. Adjustment Section */}
      {adjustment && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400/80" />
              <h4 className="text-xs font-medium text-amber-400/80 uppercase">
                Suggested Adjustment
                {review.adjustment_generation > 0 && (
                  <span className="ml-1.5 text-muted-foreground/40 normal-case">
                    (attempt {review.adjustment_generation}/3)
                  </span>
                )}
              </h4>
            </div>
            <button
              onClick={() => onApplyAdjustment(adjustment.suggestion)}
              disabled={isRunning}
              className="px-3 py-1.5 text-xs rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              Apply &amp; Re-run
            </button>
          </div>
          <p className="text-xs text-muted-foreground/50">{adjustment.reason}</p>
          <div className="bg-background/50 rounded-md px-3 py-2 text-sm text-foreground/70 border border-primary/10">
            {adjustment.suggestion}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {adjustment.appliedFixes.map((fix: string, i: number) => (
              <span
                key={i}
                className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/10 border border-amber-500/15 text-amber-400/70"
              >
                {fix}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 6. References indicator */}
      {review.had_references === 1 && (
        <div className="flex items-center gap-1.5 text-xs text-violet-400/50">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400/40" />
          This template used reference patterns from prior passing reviews
        </div>
      )}

      {/* 7. Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-primary/8">
        <button
          onClick={() => onAdopt(review)}
          disabled={isAdopting}
          className="px-4 py-2.5 text-sm rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Adopt as New Persona
        </button>
        <button
          onClick={() => setShowJson(!showJson)}
          className="text-xs text-violet-400/60 hover:text-violet-400/80 transition-colors"
        >
          {showJson ? 'Hide' : 'View'} Raw JSON
        </button>
      </div>

      {showJson && (
        <pre className="p-3 bg-background/70 rounded-lg border border-primary/10 text-xs text-muted-foreground/50 overflow-x-auto max-h-[300px] overflow-y-auto">
          {JSON.stringify(designResult, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DesignReviewsPage() {
  const {
    reviews,
    isLoading,
    error,
    connectorFilter,
    setConnectorFilter,
    availableConnectors,
    refresh,
    runLines,
    isRunning,
    runResult,
    startNewReview,
    cancelReview,
    adoptTemplate,
    isAdopting,
    adoptError,
  } = useDesignReviews();

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showRunner, setShowRunner] = useState(false);
  const [diagramReview, setDiagramReview] = useState<DbDesignReview | null>(null);

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => a.test_case_name.localeCompare(b.test_case_name));
  }, [reviews]);

  const passRate = useMemo(() => {
    if (reviews.length === 0) return null;
    const passed = reviews.filter((r) => r.status === 'passed').length;
    return Math.round((passed / reviews.length) * 100);
  }, [reviews]);

  const lastReviewDate = useMemo(() => {
    if (reviews.length === 0) return null;
    const dates = reviews.map((r) => r.reviewed_at).sort();
    return dates[dates.length - 1];
  }, [reviews]);

  const handleStartReview = () => {
    setShowRunner(true);
  };

  const handleRunnerStart = (options?: { useCaseIds?: string[]; customInstructions?: string[] }) => {
    startNewReview(options);
  };

  const handleRunnerClose = () => {
    setShowRunner(false);
  };

  const handleAdopt = async (review: DbDesignReview) => {
    try {
      await adoptTemplate(review);
    } catch {
      // adoptError state is set inside the hook
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-primary/10 bg-primary/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground/90">Agentic Templates</h1>
              <p className="text-xs text-muted-foreground/50">
                {reviews.length} template{reviews.length !== 1 ? 's' : ''} available
                {lastReviewDate && ` \u00B7 Last run: ${formatRelativeTime(lastReviewDate)}`}
                {passRate !== null && ` \u00B7 ${passRate}% pass rate`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="px-3 py-2 text-xs rounded-xl border border-primary/15 hover:bg-secondary/50 text-muted-foreground/60 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleStartReview}
              disabled={isRunning}
              className="px-4 py-2 text-sm rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 transition-colors flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              Generate Templates
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-3 border-b border-primary/10 flex items-center gap-2 flex-shrink-0">
        <ConnectorDropdown
          availableConnectors={availableConnectors}
          connectorFilter={connectorFilter}
          setConnectorFilter={setConnectorFilter}
        />
        {connectorFilter.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2">
            {connectorFilter.map((name) => {
              const meta = getConnectorMeta(name);
              return (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300"
                >
                  <ConnectorIcon meta={meta} size="w-3 h-3" />
                  {meta.label}
                  <button
                    onClick={() => setConnectorFilter(connectorFilter.filter((c) => c !== name))}
                    className="ml-0.5 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Adopt error */}
      {adoptError && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {adoptError}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && reviews.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground/40 text-sm">
            Loading templates...
          </div>
        ) : reviews.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground/40">
            <FlaskConical className="w-12 h-12 opacity-30" />
            <p className="text-sm font-medium">No templates yet</p>
            <p className="text-xs text-muted-foreground/30 text-center max-w-xs">
              Generate templates to build a library of reusable persona configurations
            </p>
            <button
              onClick={handleStartReview}
              disabled={isRunning}
              className="px-4 py-2 text-sm rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 transition-colors flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              Generate Templates
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-secondary/40 border-b border-primary/10">
                <th className="text-left text-xs font-medium text-muted-foreground/50 px-6 py-3 w-8" />
                <th className="text-left text-xs font-medium text-muted-foreground/50 px-4 py-3">Template Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground/50 px-4 py-3">Connectors</th>
                <th className="text-center text-xs font-medium text-muted-foreground/50 px-4 py-3">Quality</th>
                <th className="text-center text-xs font-medium text-muted-foreground/50 px-4 py-3">Status</th>
                <th className="text-center text-xs font-medium text-muted-foreground/50 px-4 py-3">Flows</th>
                <th className="text-right text-xs font-medium text-muted-foreground/50 px-6 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {sortedReviews.map((review) => {
                  const isExpanded = expandedRow === review.id;
                  const connectors: string[] = parseJsonSafe(review.connectors_used, []);
                  const qualityScore = getQualityScore(review);

                  const statusBadge = {
                    passed: { Icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'pass' },
                    failed: { Icon: XCircle, color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'fail' },
                    error: { Icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'error' },
                  }[review.status] || { Icon: Clock, color: 'text-muted-foreground bg-secondary/30 border-primary/10', label: review.status };

                  const StatusIcon = statusBadge.Icon;

                  return (
                    <React.Fragment key={review.id}>
                      {/* Main row */}
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : review.id)}
                        className="border-b border-primary/5 hover:bg-secondary/30 cursor-pointer transition-colors"
                      >
                        {/* Expand chevron */}
                        <td className="px-6 py-3">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                          )}
                        </td>

                        {/* Template Name */}
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-sm font-medium text-foreground/80 block">
                              {review.test_case_name}
                            </span>
                            <span className="text-xs text-muted-foreground/40 block truncate max-w-[400px]">
                              {review.instruction.length > 80
                                ? review.instruction.slice(0, 80) + '...'
                                : review.instruction}
                            </span>
                          </div>
                        </td>

                        {/* Connectors */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {connectors.map((c) => {
                              const meta = getConnectorMeta(c);
                              return (
                                <div
                                  key={c}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: `${meta.color}18` }}
                                  title={meta.label}
                                >
                                  <ConnectorIcon meta={meta} size="w-4 h-4" />
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Quality */}
                        <td className="px-4 py-3 text-center">
                          {qualityScore !== null ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 text-xs font-mono font-semibold rounded-full border ${getQualityColor(qualityScore)}`}
                            >
                              {qualityScore}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/30">--</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${statusBadge.color}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {statusBadge.label}
                            </span>
                            {review.suggested_adjustment && (
                              <span title="Adjustment suggestion available">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-400/60" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Flows button */}
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const flows = parseJsonSafe<UseCaseFlow[]>(review.use_case_flows, []);
                            if (flows.length === 0) return null;
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDiagramReview(review);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                              >
                                <Workflow className="w-3 h-3" />
                                {flows.length}
                              </button>
                            );
                          })()}
                        </td>

                        {/* Adopt button */}
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdopt(review);
                            }}
                            disabled={isAdopting}
                            className="px-3 py-1.5 text-xs rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3 h-3" />
                            Adopt
                          </button>
                        </td>
                      </tr>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-secondary/20 border-b border-primary/10">
                            <ExpandedDetail
                              review={review}
                              onAdopt={handleAdopt}
                              isAdopting={isAdopting}
                              isRunning={isRunning}
                              onApplyAdjustment={(adjustedInstruction) => {
                                startNewReview({ customInstructions: [adjustedInstruction] });
                                setExpandedRow(null);
                              }}
                              onViewDiagram={setDiagramReview}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        )}
      </div>

      {/* Runner modal */}
      <DesignReviewRunner
        isOpen={showRunner}
        onClose={handleRunnerClose}
        lines={runLines}
        isRunning={isRunning}
        result={runResult}
        onStart={handleRunnerStart}
        onCancel={cancelReview}
      />

      {/* Activity diagram modal */}
      {diagramReview && (
        <ActivityDiagramModal
          isOpen={!!diagramReview}
          onClose={() => setDiagramReview(null)}
          templateName={diagramReview.test_case_name}
          flows={parseJsonSafe<UseCaseFlow[]>(diagramReview.use_case_flows, [])}
        />
      )}
    </div>
  );
}
