'use client';

import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Webhook,
  Play,
  Zap,
  Plug,
  AlertCircle,
  Bell,
  Hash,
  Send,
  Mail,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Wrench,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from './MarkdownRenderer';
import { DesignCheckbox } from './DesignCheckbox';
import { DesignTestResults } from './DesignTestResults';
import type { DesignAnalysisResult, DesignTestResult, SuggestedTrigger, SuggestedConnector } from '@/app/features/Personas/lib/designTypes';
import type { DbPersonaToolDefinition, DbPersonaTrigger, CredentialMetadata, ConnectorDefinition } from '@/app/features/Personas/lib/types';

interface DesignResultPreviewProps {
  result: DesignAnalysisResult;
  allToolDefs: DbPersonaToolDefinition[];
  currentToolNames: string[];
  credentials: CredentialMetadata[];
  connectorDefinitions?: ConnectorDefinition[];
  selectedTools: Set<string>;
  selectedTriggerIndices: Set<number>;
  selectedChannelIndices?: Set<number>;
  onToolToggle: (toolName: string) => void;
  onTriggerToggle: (index: number) => void;
  onChannelToggle?: (index: number) => void;
  onConnectorClick?: (connector: SuggestedConnector) => void;
  readOnly?: boolean;
  actualTriggers?: DbPersonaTrigger[];
  onTriggerEnabledToggle?: (triggerId: string, enabled: boolean) => void;
  feasibility?: DesignTestResult | null;
}

interface ConnectorRow {
  connector: SuggestedConnector | null;
  tools: string[];
  triggerIndices: number[];
  channelIndices: number[];
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

function channelIcon(type: string) {
  switch (type) {
    case 'slack':
      return <Hash className="w-3.5 h-3.5 text-blue-400" />;
    case 'telegram':
      return <Send className="w-3.5 h-3.5 text-blue-400" />;
    case 'email':
      return <Mail className="w-3.5 h-3.5 text-blue-400" />;
    default:
      return <Bell className="w-3.5 h-3.5 text-blue-400" />;
  }
}

export function DesignResultPreview({
  result,
  allToolDefs,
  currentToolNames,
  credentials,
  connectorDefinitions = [],
  selectedTools,
  selectedTriggerIndices,
  selectedChannelIndices = new Set(),
  onToolToggle,
  onTriggerToggle,
  onChannelToggle,
  onConnectorClick,
  readOnly = false,
  actualTriggers = [],
  onTriggerEnabledToggle,
  feasibility,
}: DesignResultPreviewProps) {
  const credentialTypes = new Set(credentials.map((c) => c.service_type));
  const [promptExpanded, setPromptExpanded] = useState(false);

  const connectorNames = new Set(connectorDefinitions.map((c) => c.name));
  const suggestedConnectors = result.suggested_connectors ?? [];
  const suggestedChannels = result.suggested_notification_channels ?? [];

  // Build connector rows: group tools, triggers, and channels by connector
  const rows = useMemo<ConnectorRow[]>(() => {
    const linkedTools = new Set<string>();
    const linkedTriggers = new Set<number>();
    const linkedChannels = new Set<number>();
    const connectorRows: ConnectorRow[] = [];

    for (const conn of suggestedConnectors) {
      const tools = (conn.related_tools ?? []).filter((t) => result.suggested_tools.includes(t));
      const triggerIdxs = (conn.related_triggers ?? []).filter(
        (i) => i >= 0 && i < result.suggested_triggers.length
      );
      const channelIdxs = suggestedChannels
        .map((ch, i) => (ch.required_connector === conn.name ? i : -1))
        .filter((i) => i >= 0);

      tools.forEach((t) => linkedTools.add(t));
      triggerIdxs.forEach((i) => linkedTriggers.add(i));
      channelIdxs.forEach((i) => linkedChannels.add(i));

      connectorRows.push({ connector: conn, tools, triggerIndices: triggerIdxs, channelIndices: channelIdxs });
    }

    const unlinkedTools = result.suggested_tools.filter((t) => !linkedTools.has(t));
    const unlinkedTriggers = result.suggested_triggers
      .map((_, i) => i)
      .filter((i) => !linkedTriggers.has(i));
    const unlinkedChannels = suggestedChannels
      .map((_, i) => i)
      .filter((i) => !linkedChannels.has(i));

    if (unlinkedTools.length > 0 || unlinkedTriggers.length > 0 || unlinkedChannels.length > 0) {
      connectorRows.push({ connector: null, tools: unlinkedTools, triggerIndices: unlinkedTriggers, channelIndices: unlinkedChannels });
    }

    return connectorRows;
  }, [suggestedConnectors, suggestedChannels, result.suggested_tools, result.suggested_triggers]);

  return (
    <div className="space-y-4">
      {/* ── Full Prompt (Collapsible) ───────────────────────────── */}
      <div className="space-y-2">
        <button
          onClick={() => setPromptExpanded(!promptExpanded)}
          className="flex items-center gap-2.5 text-sm font-semibold text-foreground/70 tracking-wide hover:text-foreground/90 transition-colors"
        >
          {promptExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          Full Prompt
        </button>
        {promptExpanded && (
          <div className="max-h-[500px] overflow-y-auto bg-secondary/20 border border-primary/15 rounded-2xl p-4">
            <MarkdownRenderer content={result.full_prompt_markdown} />
          </div>
        )}
      </div>

      {/* ── Configuration Grid (always visible) ─────────────────── */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((row, rowIdx) => (
            <ConnectorCard
              key={rowIdx}
              row={row}
              result={result}
              allToolDefs={allToolDefs}
              currentToolNames={currentToolNames}
              connectorDefinitions={connectorDefinitions}
              connectorNames={connectorNames}
              credentialTypes={credentialTypes}
              selectedTools={selectedTools}
              selectedTriggerIndices={selectedTriggerIndices}
              selectedChannelIndices={selectedChannelIndices}
              onToolToggle={onToolToggle}
              onTriggerToggle={onTriggerToggle}
              onChannelToggle={onChannelToggle}
              onConnectorClick={onConnectorClick}
              readOnly={readOnly}
              actualTriggers={actualTriggers}
              onTriggerEnabledToggle={onTriggerEnabledToggle}
            />
          ))}
        </div>
      )}

      {/* ── Feasibility (width-synced to grid column) ───────────── */}
      {feasibility && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <DesignTestResults result={feasibility} />
        </div>
      )}
    </div>
  );
}

/* ── ConnectorCard sub-component ─────────────────────────────────── */

function ConnectorCard({
  row,
  result,
  allToolDefs,
  currentToolNames,
  connectorDefinitions,
  connectorNames,
  credentialTypes,
  selectedTools,
  selectedTriggerIndices,
  selectedChannelIndices,
  onToolToggle,
  onTriggerToggle,
  onChannelToggle,
  onConnectorClick,
  readOnly,
  actualTriggers,
  onTriggerEnabledToggle,
}: {
  row: ConnectorRow;
  result: DesignAnalysisResult;
  allToolDefs: DbPersonaToolDefinition[];
  currentToolNames: string[];
  connectorDefinitions: ConnectorDefinition[];
  connectorNames: Set<string>;
  credentialTypes: Set<string>;
  selectedTools: Set<string>;
  selectedTriggerIndices: Set<number>;
  selectedChannelIndices: Set<number>;
  onToolToggle: (toolName: string) => void;
  onTriggerToggle: (index: number) => void;
  onChannelToggle?: (index: number) => void;
  onConnectorClick?: (connector: SuggestedConnector) => void;
  readOnly: boolean;
  actualTriggers: DbPersonaTrigger[];
  onTriggerEnabledToggle?: (triggerId: string, enabled: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const connector = row.connector;
  const connDef = connector ? connectorDefinitions.find((c) => c.name === connector.name) : null;
  const installed = connector ? connectorNames.has(connector.name) : false;
  const hasCredential = connector ? credentialTypes.has(connector.name) : false;
  const suggestedChannels = result.suggested_notification_channels ?? [];

  const toolCount = row.tools.length;
  const triggerCount = row.triggerIndices.length;
  const channelCount = row.channelIndices.length;

  // For readOnly mode: find actual triggers that match this connector's trigger types
  const relevantActualTriggers = readOnly && connector
    ? actualTriggers.filter((t) =>
        row.triggerIndices.some((idx) => {
          const suggested = result.suggested_triggers[idx];
          return suggested && suggested.trigger_type === t.trigger_type;
        })
      )
    : [];

  return (
    <div className="bg-secondary/30 border border-primary/10 rounded-xl overflow-hidden">
      {/* Card Header — click to toggle expand */}
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
        {connDef?.icon_url ? (
          <img src={connDef.icon_url} alt={connDef.label} className="w-5 h-5 flex-shrink-0" />
        ) : connector ? (
          <Plug className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
        ) : (
          <Wrench className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-foreground/80 truncate flex-1">
          {connDef?.label || connector?.name || 'General'}
        </span>

        {/* Stat pills */}
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
          {channelCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/60 text-xs text-foreground/50">
              <Bell className="w-3 h-3 text-violet-400/60" />
              {channelCount}
            </span>
          )}
          {/* Credential status */}
          {connector && (
            installed && hasCredential ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
            )
          )}
        </div>
      </button>

      {/* Card Body — animated expand/collapse */}
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
              {/* Connector setup link (when credentials are configurable) */}
              {connector && onConnectorClick && (connector.credential_fields?.length || connDef?.fields?.length) ? (
                <button
                  type="button"
                  onClick={() => onConnectorClick(connector)}
                  className="flex items-center gap-1.5 text-xs text-primary/60 hover:text-primary transition-colors mb-1"
                >
                  {installed && hasCredential ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                  )}
                  <span>{installed && hasCredential ? 'Credential ready' : 'Configure credential'}</span>
                  {connector.setup_url && <ExternalLink className="w-3 h-3" />}
                </button>
              ) : null}

              {/* Tools */}
              {row.tools.map((toolName) => {
                const toolDef = allToolDefs.find((t) => t.name === toolName);
                const isAlreadyAssigned = currentToolNames.includes(toolName);
                const isSelected = selectedTools.has(toolName);

                return (
                  <div key={toolName} className="flex items-start gap-2">
                    {!readOnly && (
                      <div className="mt-0.5">
                        <DesignCheckbox
                          checked={isSelected || isAlreadyAssigned}
                          disabled={isAlreadyAssigned}
                          onChange={() => onToolToggle(toolName)}
                        />
                      </div>
                    )}
                    <Wrench className="w-3.5 h-3.5 text-primary/40 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground/70 truncate block">
                        {toolDef?.name || toolName}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Triggers */}
              {readOnly && relevantActualTriggers.length > 0 ? (
                relevantActualTriggers.map((trigger) => {
                  const config = typeof trigger.config === 'string' ? JSON.parse(trigger.config) : (trigger.config || {});
                  return (
                    <div key={trigger.id} className="flex items-center gap-2">
                      <div className="flex-shrink-0">{triggerIcon(trigger.trigger_type)}</div>
                      <span className={`text-sm capitalize truncate flex-1 ${trigger.enabled ? 'text-foreground/70' : 'text-muted-foreground/40'}`}>
                        {trigger.trigger_type}
                        {config.interval_seconds ? ` (${config.interval_seconds}s)` : ''}
                      </span>
                      {onTriggerEnabledToggle && (
                        <button
                          onClick={() => onTriggerEnabledToggle(trigger.id, !trigger.enabled)}
                          className="flex-shrink-0 p-0.5 rounded transition-colors hover:bg-secondary/50"
                          title={trigger.enabled ? 'Disable' : 'Enable'}
                        >
                          {trigger.enabled ? (
                            <ToggleRight className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-muted-foreground/30" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                row.triggerIndices.map((trigIdx) => {
                  const trigger = result.suggested_triggers[trigIdx];
                  if (!trigger) return null;
                  const isSelected = selectedTriggerIndices.has(trigIdx);

                  return (
                    <div key={trigIdx} className="flex items-start gap-2">
                      {!readOnly && (
                        <div className="mt-0.5">
                          <DesignCheckbox
                            checked={isSelected}
                            onChange={() => onTriggerToggle(trigIdx)}
                          />
                        </div>
                      )}
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
                })
              )}

              {/* Notification Channels */}
              {row.channelIndices.map((chIdx) => {
                const channel = suggestedChannels[chIdx];
                if (!channel) return null;
                const isSelected = selectedChannelIndices.has(chIdx);

                return (
                  <div key={`ch-${chIdx}`} className="flex items-start gap-2">
                    {!readOnly && (
                      <div className="mt-0.5">
                        <DesignCheckbox
                          checked={isSelected}
                          onChange={() => onChannelToggle?.(chIdx)}
                          color="blue"
                        />
                      </div>
                    )}
                    {channelIcon(channel.type)}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground/70 capitalize truncate block">
                        {channel.type}
                      </span>
                      <span className="text-sm text-muted-foreground/40 leading-snug block">
                        {channel.description}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {row.tools.length === 0 && row.triggerIndices.length === 0 && row.channelIndices.length === 0 && (
                <div className="text-sm text-muted-foreground/20 py-1">&mdash;</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
