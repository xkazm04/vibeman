import React from 'react';
import { FileText } from 'lucide-react';
import { Context } from '../../../../stores/contextStore';
import MarkdownViewer from '../../../../components/markdown/MarkdownViewer';
import { MonacoEditor } from '../../../../components/editor';

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
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading context file...</p>
      </div>
    </div>
  );
}

function EmptyState({ context, generationError }: { context: Context; generationError: string | null }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-lg">
        <FileText className="w-16 h-16 mx-auto mb-6 text-gray-600" />
        <h3 className="text-xl font-semibold text-white mb-3">
          No Context File Created
        </h3>
        <p className="text-gray-400 mb-6 leading-relaxed">
          Context files provide detailed business descriptions and documentation
          for your feature sets. They help team members understand the purpose,
          architecture, and implementation details.
        </p>

        {generationError && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{generationError}</p>
          </div>
        )}

        {context.filePaths.length === 0 && (
          <p className="text-sm text-gray-500 mt-3">
            Add files to this context to enable AI generation
          </p>
        )}

        {context.filePaths.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            <p>AI will analyze {context.filePaths.length} file{context.filePaths.length !== 1 ? 's' : ''} in this context</p>
            <p className="mt-1">Requires Ollama running locally on port 11434</p>
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
        theme="dark"
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
    return <EmptyState context={context} generationError={generationError} />;
  }

  if (previewMode === 'preview') {
    return <PreviewMode markdownContent={markdownContent} />;
  }

  return <EditMode markdownContent={markdownContent} onMarkdownContentChange={onMarkdownContentChange} />;
}