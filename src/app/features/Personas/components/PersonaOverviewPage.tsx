'use client';

import { useState, useMemo } from 'react';
import {
  Bot,
  Plus,
  Plug,
  Mail,
  Calendar,
  HardDrive,
  MessageSquare,
  Github,
  Globe,
  Clock,
  Webhook,
  Play,
  Zap,
} from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import type { DbPersona } from '@/app/features/Personas/lib/types';
import type { DesignAnalysisResult } from '@/app/features/Personas/lib/designTypes';
import CreatePersonaModal from './CreatePersonaModal';

// ============================================================================
// Connector Infrastructure
// ============================================================================

const CONNECTOR_META: Record<string, { label: string; color: string; iconUrl: string | null; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  gmail: { label: 'Gmail', color: '#EA4335', iconUrl: 'https://cdn.simpleicons.org/gmail/EA4335', Icon: Mail },
  google_calendar: { label: 'Google Calendar', color: '#4285F4', iconUrl: 'https://cdn.simpleicons.org/googlecalendar/4285F4', Icon: Calendar },
  google_drive: { label: 'Google Drive', color: '#0F9D58', iconUrl: 'https://cdn.simpleicons.org/googledrive/0F9D58', Icon: HardDrive },
  slack: { label: 'Slack', color: '#4A154B', iconUrl: 'https://cdn.simpleicons.org/slack/E01E5A', Icon: MessageSquare },
  github: { label: 'GitHub', color: '#24292e', iconUrl: 'https://cdn.simpleicons.org/github/f0f0f0', Icon: Github },
  http: { label: 'HTTP / REST', color: '#3B82F6', iconUrl: null, Icon: Globe },
  telegram: { label: 'Telegram', color: '#26A5E4', iconUrl: 'https://cdn.simpleicons.org/telegram/26A5E4', Icon: MessageSquare },
  discord: { label: 'Discord', color: '#5865F2', iconUrl: 'https://cdn.simpleicons.org/discord/5865F2', Icon: MessageSquare },
  jira: { label: 'Jira', color: '#0052CC', iconUrl: 'https://cdn.simpleicons.org/jira/0052CC', Icon: Globe },
  notion: { label: 'Notion', color: '#FFFFFF', iconUrl: 'https://cdn.simpleicons.org/notion/f0f0f0', Icon: Globe },
};

function getConnectorMeta(name: string) {
  if (CONNECTOR_META[name]) return CONNECTOR_META[name];
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

// ============================================================================
// Helpers
// ============================================================================

function parseDesignResult(persona: DbPersona): { connectors: string[]; triggerTypes: string[] } {
  if (!persona.last_design_result) return { connectors: [], triggerTypes: [] };
  try {
    const dr = JSON.parse(persona.last_design_result) as DesignAnalysisResult;
    const connectors = (dr.suggested_connectors ?? []).map(c => typeof c === 'string' ? c : c.name);
    const triggerTypes = (dr.suggested_triggers ?? []).map(t => t.trigger_type);
    return { connectors, triggerTypes };
  } catch {
    return { connectors: [], triggerTypes: [] };
  }
}

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

function triggerIcon(type: string) {
  switch (type) {
    case 'schedule':
    case 'polling':
      return <Clock className="w-3 h-3 text-amber-400" />;
    case 'webhook':
      return <Webhook className="w-3 h-3 text-blue-400" />;
    case 'manual':
      return <Play className="w-3 h-3 text-emerald-400" />;
    default:
      return <Zap className="w-3 h-3 text-purple-400" />;
  }
}

// ============================================================================
// Main Component
// ============================================================================

export default function PersonaOverviewPage() {
  const personas = usePersonaStore((s) => s.personas);
  const selectPersona = usePersonaStore((s) => s.selectPersona);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const sortedPersonas = useMemo(() => {
    return [...personas].sort((a, b) => a.name.localeCompare(b.name));
  }, [personas]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CreatePersonaModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />

      {/* Header - matching DesignReviewsPage style */}
      <div className="px-6 py-5 border-b border-primary/10 bg-primary/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground/90">All Agents</h1>
              <p className="text-xs text-muted-foreground/50">
                {personas.length} agent{personas.length !== 1 ? 's' : ''} configured
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/25 hover:bg-blue-500/25 transition-colors flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            New Agent
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {personas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground/40">
            <Bot className="w-12 h-12 opacity-30" />
            <p className="text-sm font-medium">No agents yet</p>
            <p className="text-xs text-muted-foreground/30 text-center max-w-xs">
              Create your first agent to automate tasks with AI-driven personas
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/25 hover:bg-blue-500/25 transition-colors flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              New Agent
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-secondary/40 border-b border-primary/10">
                <th className="text-left text-xs font-medium text-muted-foreground/50 px-6 py-3">Agent</th>
                <th className="text-left text-xs font-medium text-muted-foreground/50 px-4 py-3">Connectors</th>
                <th className="text-center text-xs font-medium text-muted-foreground/50 px-4 py-3">Status</th>
                <th className="text-center text-xs font-medium text-muted-foreground/50 px-4 py-3">Triggers</th>
                <th className="text-right text-xs font-medium text-muted-foreground/50 px-6 py-3">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {sortedPersonas.map((persona) => {
                const color = persona.color || '#6b7280';
                const { connectors, triggerTypes } = parseDesignResult(persona);
                const uniqueTriggers = [...new Set(triggerTypes)];

                return (
                  <tr
                    key={persona.id}
                    onClick={() => selectPersona(persona.id)}
                    className="border-b border-primary/5 hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    {/* Agent */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${color}15, ${color}30)`,
                            border: `1px solid ${color}40`,
                          }}
                        >
                          <Bot className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground/80 block truncate">
                            {persona.name}
                          </span>
                          {persona.description && (
                            <span className="text-xs text-muted-foreground/40 block truncate max-w-[300px]">
                              {persona.description.length > 60
                                ? persona.description.slice(0, 60) + '...'
                                : persona.description}
                            </span>
                          )}
                        </div>
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
                        {connectors.length === 0 && (
                          <span className="text-xs text-muted-foreground/25">--</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {persona.enabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border text-muted-foreground/50 bg-secondary/30 border-primary/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                          inactive
                        </span>
                      )}
                    </td>

                    {/* Triggers */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {uniqueTriggers.map((type) => (
                          <div
                            key={type}
                            className="w-6 h-6 rounded flex items-center justify-center bg-secondary/40"
                            title={type}
                          >
                            {triggerIcon(type)}
                          </div>
                        ))}
                        {uniqueTriggers.length === 0 && (
                          <span className="text-xs text-muted-foreground/25">--</span>
                        )}
                      </div>
                    </td>

                    {/* Last Active */}
                    <td className="px-6 py-3 text-right">
                      <span className="text-xs text-muted-foreground/40">
                        {formatRelativeTime(persona.updated_at)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
