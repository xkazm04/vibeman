import React from 'react';
import { FileText, Loader2, StopCircle, Zap, Plus } from 'lucide-react';
import { Context } from '../../../../stores/contextStore';
import MarkdownViewer from '../../../../components/markdown/MarkdownViewer';
import { MonacoEditor } from '../../../../components/editor';

interface ContextModalContentProps {
  context: Context;
  loading: boolean;
  generating: boolean;
  generationStatus: string;
  generationError: string | null;
  backgroundProcessing: boolean;
  hasContextFile: boolean;
  isEditing: boolean;
  previewMode: 'edit' | 'preview';
  markdownContent: string;
  activeProject: any;
  onGenerateWithLLM: () => void;
  onBackgroundGeneration: () => void;
  onCreateContextFile: () => void;
  onCancelGeneration: () => void;
  onMarkdownContentChange: (content: string) => void;
}

export default function ContextModalContent({
  context,
  loading,
  generating,
  generationStatus,
  generationError,
  backgroundProcessing,
  hasContextFile,
  isEditing,
  previewMode,
  markdownContent,
  activeProject,
  onGenerateWithLLM,
  onBackgroundGeneration,
  onCreateContextFile,
  onCancelGeneration,
  onMarkdownContentChange
}: ContextModalContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading context file...</p>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <Loader2 className="w-16 h-16 mx-auto text-cyan-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gray-900 rounded-full"></div>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">
            Generating Context File
          </h3>
          <p className="text-gray-400 mb-4 leading-relaxed">
            {generationStatus || 'Analyzing your code files...'}
          </p>
          <div className="mb-6">
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div className="bg-cyan-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-500">
              This may take a few minutes depending on the complexity of your code
            </p>
          </div>
          <button
            onClick={onCancelGeneration}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-mono mx-auto"
          >
            <StopCircle className="w-4 h-4" />
            <span>Cancel Generation</span>
          </button>
        </div>
      </div>
    );
  }

  if (!hasContextFile && !isEditing) {
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

          {/* Generation Error Display */}
          {generationError && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{generationError}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* LLM Generation Button */}
            <button
              onClick={onGenerateWithLLM}
              disabled={context.filePaths.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              title={context.filePaths.length === 0 ? 'No files in context to analyze' : 'Generate documentation using AI'}
            >
              <Loader2 className="w-4 h-4" />
              <span>Generate with AI</span>
            </button>

            {/* Background Generation Button */}
            <button
              onClick={onBackgroundGeneration}
              disabled={backgroundProcessing || context.filePaths.length === 0 || !activeProject}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              title={context.filePaths.length === 0 ? 'No files in context to analyze' : !activeProject ? 'No active project selected' : 'Generate and save context file in background'}
            >
              <Zap className="w-4 h-4" />
              <span>{backgroundProcessing ? 'Processing...' : 'Generate in Background'}</span>
            </button>

            {/* Manual Creation Button */}
            <button
              onClick={onCreateContextFile}
              className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Create Manually</span>
            </button>
          </div>

          {context.filePaths.length === 0 && (
            <p className="text-xs text-gray-500 mt-3">
              Add files to this context to enable AI generation
            </p>
          )}

          {context.filePaths.length > 0 && (
            <div className="mt-4 text-xs text-gray-500">
              <p>AI will analyze {context.filePaths.length} file{context.filePaths.length !== 1 ? 's' : ''} in this context</p>
              <p className="mt-1">Requires Ollama running locally on port 11434</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (previewMode === 'preview') {
    return (
      <div className="h-full overflow-auto p-6">
        <MarkdownViewer
          content={markdownContent}
          theme="dark"
        />
      </div>
    );
  }

  // Edit mode
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