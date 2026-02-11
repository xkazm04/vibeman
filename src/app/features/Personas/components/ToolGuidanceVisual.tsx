'use client';

import React, { useState } from 'react';
import { Wrench, Check, AlertTriangle, Pencil } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { DbPersonaToolDefinition, CredentialMetadata } from '@/app/features/Personas/lib/types';

interface ToolGuidanceVisualProps {
  tools: DbPersonaToolDefinition[];
  credentials: CredentialMetadata[];
  guidanceText: string;
  onGuidanceChange: (text: string) => void;
  readOnly?: boolean;
}

export function ToolGuidanceVisual({
  tools,
  credentials,
  guidanceText,
  onGuidanceChange,
  readOnly = false,
}: ToolGuidanceVisualProps) {
  const [isEditing, setIsEditing] = useState(false);
  const credentialTypes = new Set(credentials.map((c) => c.service_type));

  return (
    <div className="space-y-4">
      {/* Tool Cards */}
      {tools.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-mono text-muted-foreground/40 uppercase tracking-wider">
            Assigned Tools
          </h4>
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => {
              const needsCredential = !!tool.requires_credential_type;
              const hasCredential = needsCredential
                ? credentialTypes.has(tool.requires_credential_type!)
                : true;

              return (
                <div
                  key={tool.id}
                  className="flex items-center gap-2 px-3 py-2 bg-background/70 border border-border/40 rounded-xl text-sm"
                >
                  <Wrench className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="font-medium text-foreground/80">{tool.name}</span>
                  <span className="text-xs text-muted-foreground/40 px-1.5 py-0.5 bg-muted/30 rounded">
                    {tool.category}
                  </span>
                  {needsCredential && (
                    hasCredential ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground/40 py-4 text-center border border-dashed border-border/30 rounded-xl">
          No tools assigned. Go to the Tools tab to add some.
        </div>
      )}

      {/* Guidance Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono text-muted-foreground/40 uppercase tracking-wider">
            Tool Usage Guidance
          </h4>
          {readOnly && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground/60 hover:text-foreground/80 bg-secondary/30 hover:bg-secondary/50 border border-border/30 rounded-lg transition-colors"
            >
              {isEditing ? (
                'Done'
              ) : (
                <>
                  <Pencil className="w-3 h-3" />
                  Edit
                </>
              )}
            </button>
          )}
        </div>
        {readOnly && !isEditing ? (
          <div className="px-4 py-3 bg-background/50 border border-border/50 rounded-2xl min-h-[100px]">
            {guidanceText ? (
              <MarkdownRenderer content={guidanceText} />
            ) : (
              <p className="text-sm text-muted-foreground/30 italic">
                No tool guidance provided.
              </p>
            )}
          </div>
        ) : (
          <div className="relative">
            <textarea
              value={guidanceText}
              onChange={(e) => onGuidanceChange(e.target.value)}
              className="w-full min-h-[200px] px-4 py-3 bg-background/50 border border-border/50 rounded-2xl text-foreground font-sans text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder-muted-foreground/30"
              placeholder="Describe how this persona should use its tools, when to use each one, preferred order of operations..."
              spellCheck
            />
            <div className="absolute bottom-3 right-4 text-xs text-muted-foreground/30 font-mono pointer-events-none">
              {guidanceText.length.toLocaleString()} chars
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
