'use client';

import { Check, Clock, Webhook, Play, Wrench, Zap } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { DesignAnalysisResult, SuggestedTrigger } from '@/app/features/Personas/lib/designTypes';
import type { DbPersonaToolDefinition, CredentialMetadata } from '@/app/features/Personas/lib/types';

interface DesignResultPreviewProps {
  result: DesignAnalysisResult;
  allToolDefs: DbPersonaToolDefinition[];
  currentToolNames: string[];
  credentials: CredentialMetadata[];
  selectedTools: Set<string>;
  selectedTriggerIndices: Set<number>;
  onToolToggle: (toolName: string) => void;
  onTriggerToggle: (index: number) => void;
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

export function DesignResultPreview({
  result,
  allToolDefs,
  currentToolNames,
  credentials,
  selectedTools,
  selectedTriggerIndices,
  onToolToggle,
  onTriggerToggle,
}: DesignResultPreviewProps) {
  const credentialTypes = new Set(credentials.map((c) => c.service_type));

  return (
    <div className="space-y-6">
      {/* Summary Badge */}
      <div className="flex items-start gap-2">
        <Zap className="w-4 h-4 text-primary/70 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-foreground/70 bg-secondary/30 border border-border/20 rounded-xl px-4 py-2 leading-relaxed">
          {result.summary}
        </p>
      </div>

      {/* Full Prompt Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-mono text-muted-foreground/40 uppercase tracking-wider">
          Full Prompt
        </h4>
        <div className="max-h-[500px] overflow-y-auto bg-secondary/20 border border-border/30 rounded-2xl p-6">
          <MarkdownRenderer content={result.full_prompt_markdown} />
        </div>
      </div>

      {/* Suggested Tools */}
      {result.suggested_tools.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-muted-foreground/40 uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5" />
            Suggested Tools
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.suggested_tools.map((toolName) => {
              const toolDef = allToolDefs.find((t) => t.name === toolName);
              const isAlreadyAssigned = currentToolNames.includes(toolName);
              const isSelected = selectedTools.has(toolName);
              const needsCredential = toolDef?.requires_credential_type;
              const hasCredential = needsCredential
                ? credentialTypes.has(needsCredential)
                : true;

              return (
                <label
                  key={toolName}
                  className={`flex items-center gap-3 p-3 bg-secondary/40 backdrop-blur-sm border rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/30 hover:border-border/50'
                  } ${isAlreadyAssigned ? 'opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected || isAlreadyAssigned}
                    disabled={isAlreadyAssigned}
                    onChange={() => onToolToggle(toolName)}
                    className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary/30 accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground/80 truncate">
                        {toolDef?.name || toolName}
                      </span>
                      {toolDef?.category && (
                        <span className="text-xs text-muted-foreground/40 px-1.5 py-0.5 bg-muted/30 rounded flex-shrink-0">
                          {toolDef.category}
                        </span>
                      )}
                    </div>
                    {toolDef?.description && (
                      <p className="text-xs text-muted-foreground/50 mt-0.5 truncate">
                        {toolDef.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {isAlreadyAssigned && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400/80">
                          <Check className="w-3 h-3" />
                          Already assigned
                        </span>
                      )}
                      {needsCredential && (
                        <span
                          className={`text-xs ${
                            hasCredential ? 'text-emerald-400/70' : 'text-amber-400/70'
                          }`}
                        >
                          {hasCredential ? 'Credential ready' : 'Credential needed'}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested Triggers */}
      {result.suggested_triggers.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-muted-foreground/40 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Suggested Triggers
          </h4>
          <div className="space-y-2">
            {result.suggested_triggers.map((trigger, index) => {
              const isSelected = selectedTriggerIndices.has(index);

              return (
                <label
                  key={index}
                  className={`flex items-center gap-3 p-3 bg-secondary/40 backdrop-blur-sm border rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/30 hover:border-border/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onTriggerToggle(index)}
                    className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary/30 accent-primary"
                  />
                  <div className="flex-shrink-0">{triggerIcon(trigger.trigger_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground/80 capitalize">
                        {trigger.trigger_type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">
                      {trigger.description}
                    </p>
                    {Object.keys(trigger.config).length > 0 && (
                      <p className="text-xs text-muted-foreground/30 font-mono mt-1">
                        {Object.entries(trigger.config)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
