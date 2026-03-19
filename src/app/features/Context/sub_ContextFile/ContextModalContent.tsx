import React from 'react';
import { FileText } from 'lucide-react';
import { SimpleSpinner } from '@/components/ui';
import { Context } from '../../../../stores/contextStore';
import MarkdownViewer from '../../../../components/markdown/MarkdownViewer';
import { MonacoEditor } from '../../../../components/editor';
import EmptyState from '@/components/ui/EmptyState';

interface ContextModalContentProps {
  context: Context;
  loading: boolean;
  generationError: string | null;
  hasContextFile: boolean;
  isEditing: boolean;
  previewMode: 'edit' | 'preview';
  markdownContent: string;
  onMarkdownContentChange: (content: string) => void;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <SimpleSpinner size="lg" color="cyan" className="mx-auto mb-4" />
        <p className="text-gray-400">Loading context file...</p>
      </div>
    </div>
  );
}

function ContextFileEmptyState({ context, generationError }: { context: Context; generationError: string | null }) {
  const fileCount = context.filePaths.length;
  let description = 'Context files provide detailed business descriptions and documentation for your feature sets. They help team members understand the purpose, architecture, and implementation details.';
  if (fileCount === 0) {
    description += ' Add files to this context to enable AI generation.';
  } else {
    description += ` AI will analyze ${fileCount} file${fileCount !== 1 ? 's' : ''} in this context. Requires Ollama running locally on port 11434.`;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div>
        <EmptyState
          icon={FileText}
          title="No Context File Created"
          description={description}
          className="py-8"
        />
        {generationError && (
          <div className="mx-auto max-w-md mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm text-center">{generationError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewMode({ markdownContent }: { markdownContent: string }) {
  return (
    <div className="h-full overflow-auto p-6">
      <MarkdownViewer
        content={markdownContent}
      />
    </div>
  );
}

function EditMode({ markdownContent, onMarkdownContentChange }: { markdownContent: string; onMarkdownContentChange: (content: string) => void }) {
  return (
    <div className="h-full">
      <MonacoEditor
        value={markdownContent}
        onChange={onMarkdownContentChange}
        language="markdown"
        theme="vs-dark"
        options={{
          wordWrap: 'on',
          minimap: { enabled: false },
          lineNumbers: 'on',
          folding: true,
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
        }}
      />
    </div>
  );
}

export default function ContextModalContent({
  context,
  loading,
  generationError,
  hasContextFile,
  isEditing,
  previewMode,
  markdownContent,
  onMarkdownContentChange
}: ContextModalContentProps) {
  if (loading) {
    return <LoadingState />;
  }

  if (!hasContextFile && !isEditing) {
    return <ContextFileEmptyState context={context} generationError={generationError} />;
  }

  if (previewMode === 'preview') {
    return <PreviewMode markdownContent={markdownContent} />;
  }

  return <EditMode markdownContent={markdownContent} onMarkdownContentChange={onMarkdownContentChange} />;
}