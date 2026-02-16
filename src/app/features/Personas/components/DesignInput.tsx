'use client';

import { useState, useRef, useCallback } from 'react';
import { Paperclip, Link, X, FileText, Database, Settings, File } from 'lucide-react';
import type { DesignFileType } from '@/app/db/models/persona.types';

// ============================================================================
// Types
// ============================================================================

interface DesignFile {
  name: string;
  content: string;
  type: DesignFileType;
}

interface DesignContextData {
  files: DesignFile[];
  references: string[];
}

interface DesignInputProps {
  instruction: string;
  onInstructionChange: (value: string) => void;
  designContext: DesignContextData;
  onDesignContextChange: (ctx: DesignContextData) => void;
  disabled?: boolean;
  onSubmit?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

const FILE_TYPE_ICONS: Record<DesignFileType, typeof FileText> = {
  'api-spec': FileText,
  'schema': Database,
  'mcp-config': Settings,
  'other': File,
};

const FILE_TYPE_LABELS: Record<DesignFileType, string> = {
  'api-spec': 'API Definition',
  'schema': 'Database Schema',
  'mcp-config': 'MCP Config',
  'other': 'Other',
};

const ACCEPTED_EXTENSIONS = '.json,.yaml,.yml,.graphql,.sql,.prisma,.txt,.md';

function detectFileType(fileName: string, content: string): DesignFileType {
  if (fileName.endsWith('.json') && content.includes('mcpServers')) return 'mcp-config';
  if (fileName.match(/\.(json|yaml|yml|graphql)$/)) return 'api-spec';
  if (fileName.match(/\.(sql|prisma)$/)) return 'schema';
  return 'other';
}

// ============================================================================
// Component
// ============================================================================

export function DesignInput({
  instruction,
  onInstructionChange,
  designContext,
  onDesignContextChange,
  disabled = false,
  onSubmit,
}: DesignInputProps) {
  const [showReferences, setShowReferences] = useState(designContext.references.length > 0);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  const handleTextareaInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInstructionChange(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.max(200, el.scrollHeight)}px`;
  }, [onInstructionChange]);

  // File handling
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const autoType = detectFileType(file.name, content);

      // If auto-detected with high confidence, skip selector
      if (autoType !== 'other') {
        onDesignContextChange({
          ...designContext,
          files: [...designContext.files, { name: file.name, content, type: autoType }],
        });
      } else {
        // Show type selector for ambiguous files
        setPendingFile({ name: file.name, content });
        setShowTypeSelector(true);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset for re-upload
  }, [designContext, onDesignContextChange]);

  const handleTypeConfirm = useCallback((type: DesignFileType) => {
    if (!pendingFile) return;
    onDesignContextChange({
      ...designContext,
      files: [...designContext.files, { name: pendingFile.name, content: pendingFile.content, type }],
    });
    setPendingFile(null);
    setShowTypeSelector(false);
  }, [pendingFile, designContext, onDesignContextChange]);

  const handleRemoveFile = useCallback((index: number) => {
    onDesignContextChange({
      ...designContext,
      files: designContext.files.filter((_, i) => i !== index),
    });
  }, [designContext, onDesignContextChange]);

  const handleReferencesChange = useCallback((value: string) => {
    const refs = value.split('\n').filter((line) => line.trim());
    onDesignContextChange({
      ...designContext,
      references: refs,
    });
  }, [designContext, onDesignContextChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  }, [onSubmit]);

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Main textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={instruction}
          onChange={handleTextareaInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={`Describe what this persona should do...\n\nExamples:\n  - Monitor my Gmail for invoices and extract amounts into a spreadsheet\n  - Watch GitHub webhooks and post summaries to Slack\n  - Analyze our API logs daily and flag anomalies`}
          className="w-full min-h-[200px] bg-background/50 border border-primary/15 rounded-2xl p-4 pb-12 text-sm text-foreground font-sans resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder-muted-foreground/30"
          spellCheck
          style={{ overflow: 'hidden' }}
        />

        {/* Action bar - positioned at bottom of textarea */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 px-2">
          {/* Attach File */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground/60 hover:text-foreground/70 hover:bg-secondary/50 transition-colors"
            title="Attach file (API spec, schema, MCP config)"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attach</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Add References toggle */}
          <button
            type="button"
            onClick={() => setShowReferences(!showReferences)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
              showReferences
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-muted-foreground/60 hover:text-foreground/70 hover:bg-secondary/50'
            }`}
            title="Add reference URLs or connection strings"
          >
            <Link className="w-3.5 h-3.5" />
            <span>References</span>
          </button>

          {/* File count badge */}
          {designContext.files.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground/40">
              {designContext.files.length} file{designContext.files.length !== 1 ? 's' : ''} attached
            </span>
          )}
        </div>
      </div>

      {/* Type selector modal (for ambiguous file types) */}
      {showTypeSelector && pendingFile && (
        <div className="bg-secondary/60 backdrop-blur-sm border border-primary/15 rounded-xl p-3 space-y-2">
          <p className="text-xs text-muted-foreground/60">
            Classify <span className="font-medium text-foreground/70">{pendingFile.name}</span>:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FILE_TYPE_LABELS) as DesignFileType[]).map((type) => {
              const Icon = FILE_TYPE_ICONS[type];
              return (
                <button
                  key={type}
                  onClick={() => handleTypeConfirm(type)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-background/50 border border-primary/15 rounded-lg text-xs text-foreground/70 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <Icon className="w-3 h-3" />
                  {FILE_TYPE_LABELS[type]}
                </button>
              );
            })}
            <button
              onClick={() => { setPendingFile(null); setShowTypeSelector(false); }}
              className="px-2.5 py-1 text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Attached files row */}
      {designContext.files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {designContext.files.map((file, index) => {
            const Icon = FILE_TYPE_ICONS[file.type] || File;
            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-1.5 bg-secondary/50 border border-primary/10 rounded-full px-3 py-1 text-xs group"
              >
                <Icon className="w-3 h-3 text-muted-foreground/50" />
                <span className="text-foreground/70 max-w-[120px] truncate">{file.name}</span>
                <span className="text-muted-foreground/30">{FILE_TYPE_LABELS[file.type]}</span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="ml-0.5 text-muted-foreground/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* References textarea (collapsible) */}
      {showReferences && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground/50 px-1">References</label>
          <textarea
            value={designContext.references.join('\n')}
            onChange={(e) => handleReferencesChange(e.target.value)}
            disabled={disabled}
            placeholder="Paste URLs, connection strings, API keys, or any reference info (one per line)"
            rows={3}
            className="w-full bg-background/50 border border-primary/15 rounded-xl px-3 py-2 text-xs text-foreground font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder-muted-foreground/30"
          />
        </div>
      )}
    </div>
  );
}
