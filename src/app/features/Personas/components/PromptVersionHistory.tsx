'use client';

import { useEffect } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { Clock, FileText } from 'lucide-react';

interface PromptVersionHistoryProps {
  personaId: string;
}

export default function PromptVersionHistory({ personaId }: PromptVersionHistoryProps) {
  const fetchPromptVersions = usePersonaStore((s) => s.fetchPromptVersions);
  const promptVersions = usePersonaStore((s) => s.promptVersions);

  useEffect(() => {
    fetchPromptVersions(personaId);
  }, [personaId, fetchPromptVersions]);

  if (promptVersions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground/40">
        No prompt versions recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Prompt Version History
      </h3>
      <div className="space-y-2">
        {promptVersions.map((version: any) => (
          <div
            key={version.id}
            className="bg-secondary/30 border border-primary/15 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-primary/70">v{version.version_number}</span>
              <span className="text-[10px] text-muted-foreground/40">
                {new Date(version.created_at).toLocaleDateString()} {new Date(version.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {version.change_summary && (
              <p className="text-xs text-muted-foreground/60 mb-2">{version.change_summary}</p>
            )}
            {version.system_prompt && (
              <details className="group">
                <summary className="cursor-pointer text-[11px] text-muted-foreground/50 hover:text-foreground/60 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  View prompt
                </summary>
                <pre className="mt-2 p-2 bg-background/50 rounded text-[11px] text-muted-foreground/60 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {version.system_prompt?.slice(0, 1000)}
                  {(version.system_prompt?.length || 0) > 1000 ? '...' : ''}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
