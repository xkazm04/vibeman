'use client';

import { useState, useMemo } from 'react';
import { Bot, Plug, Mail, Calendar, HardDrive, MessageSquare, Github, Globe } from 'lucide-react';
import type { DbPersona } from '@/app/features/Personas/lib/types';
import type { DesignAnalysisResult } from '@/app/features/Personas/lib/designTypes';

// Connector icon metadata (subset for sidebar)
const CONNECTOR_META: Record<string, { color: string; iconUrl: string | null; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  gmail: { color: '#EA4335', iconUrl: 'https://cdn.simpleicons.org/gmail/EA4335', Icon: Mail },
  google_calendar: { color: '#4285F4', iconUrl: 'https://cdn.simpleicons.org/googlecalendar/4285F4', Icon: Calendar },
  google_drive: { color: '#0F9D58', iconUrl: 'https://cdn.simpleicons.org/googledrive/0F9D58', Icon: HardDrive },
  slack: { color: '#4A154B', iconUrl: 'https://cdn.simpleicons.org/slack/E01E5A', Icon: MessageSquare },
  github: { color: '#24292e', iconUrl: 'https://cdn.simpleicons.org/github/f0f0f0', Icon: Github },
  http: { color: '#3B82F6', iconUrl: null, Icon: Globe },
  telegram: { color: '#26A5E4', iconUrl: 'https://cdn.simpleicons.org/telegram/26A5E4', Icon: MessageSquare },
  discord: { color: '#5865F2', iconUrl: 'https://cdn.simpleicons.org/discord/5865F2', Icon: MessageSquare },
  jira: { color: '#0052CC', iconUrl: 'https://cdn.simpleicons.org/jira/0052CC', Icon: Globe },
  notion: { color: '#FFFFFF', iconUrl: 'https://cdn.simpleicons.org/notion/f0f0f0', Icon: Globe },
};

function getConnectorMeta(name: string) {
  if (CONNECTOR_META[name]) return CONNECTOR_META[name];
  const slug = name.toLowerCase().replace(/[_\s]/g, '');
  return { color: '#6B7280', iconUrl: `https://cdn.simpleicons.org/${slug}/9ca3af`, Icon: Plug };
}

function MiniConnectorIcon({ meta }: { meta: ReturnType<typeof getConnectorMeta> }) {
  const [imgFailed, setImgFailed] = useState(false);
  const FallbackIcon = meta.Icon;
  if (meta.iconUrl && !imgFailed) {
    return <img src={meta.iconUrl} alt="" className="w-3 h-3" onError={() => setImgFailed(true)} />;
  }
  return <FallbackIcon className="w-3 h-3" style={{ color: meta.color }} />;
}

interface PersonaCardProps {
  persona: DbPersona;
  isSelected: boolean;
  onClick: () => void;
}

export default function PersonaCard({ persona, isSelected, onClick }: PersonaCardProps) {
  // Extract connector names from last_design_result
  const connectors = useMemo(() => {
    if (!persona.last_design_result) return [];
    try {
      const dr = JSON.parse(persona.last_design_result) as DesignAnalysisResult;
      return (dr.suggested_connectors ?? []).map(c => typeof c === 'string' ? c : c.name).slice(0, 4);
    } catch {
      return [];
    }
  }, [persona.last_design_result]);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 rounded-lg transition-all mb-0.5 ${
        isSelected
          ? 'bg-primary/10 border-l-2 border-l-primary border-y border-r border-y-primary/20 border-r-primary/20'
          : 'border-l-2 border-transparent hover:bg-primary/5'
      }`}
    >
      {/* Connector icons row */}
      {connectors.length > 0 && (
        <div className="flex items-center gap-1 mb-0.5">
          {connectors.map((name) => {
            const meta = getConnectorMeta(name);
            return (
              <div
                key={name}
                className="w-4 h-4 rounded flex items-center justify-center"
                style={{ backgroundColor: `${meta.color}15` }}
              >
                <MiniConnectorIcon meta={meta} />
              </div>
            );
          })}
        </div>
      )}

      {/* Name + status */}
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-medium truncate flex-1 ${
          isSelected ? 'text-foreground' : 'text-muted-foreground/70'
        }`}>
          {persona.name}
        </span>
        <div
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            persona.enabled ? 'bg-emerald-400' : 'bg-muted-foreground/30'
          }`}
        />
      </div>
    </button>
  );
}
