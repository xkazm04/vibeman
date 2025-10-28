import React from 'react';
import { Loader2, StopCircle, Zap, Plus } from 'lucide-react';
import MarkdownViewer from '../markdown/MarkdownViewer';
import { MonacoEditor } from '../editor';

interface ModalContentProps {
  loading?: boolean;
  generating?: boolean;
  generationStatus?: string;
  generationError?: string | null;
  backgroundProcessing?: boolean;
  hasContent?: boolean;
  isEditing?: boolean;
  previewMode?: 'edit' | 'preview';
  markdownContent?: string;

  // Content states
  loadingMessage?: string;
  generatingTitle?: string;
  noContentTitle?: string;
  noContentDescription?: string;

  // Generation buttons
  showGenerateButton?: boolean;
  showBackgroundButton?: boolean;
  showManualButton?: boolean;
  generateButtonText?: string;
  backgroundButtonText?: string;
  manualButtonText?: string;

  // Callbacks
  onGenerateWithLLM?: () => void;
  onBackgroundGeneration?: () => void;
  onCreateManually?: () => void;
  onCancelGeneration?: () => void;
  onMarkdownContentChange?: (content: string) => void;

  // Conditions for button states
  canGenerate?: boolean;
  canBackgroundGenerate?: boolean;
  generateDisabledReason?: string;
  backgroundDisabledReason?: string;

  // Additional info
  additionalInfo?: React.ReactNode;
}

export default function ModalContent({
  loading = false,
  generating = false,
  generationStatus = '',
  generationError = null,
  backgroundProcessing = false,
  hasContent = false,
  isEditing = false,
  previewMode = 'preview',
  markdownContent = '',

  loadingMessage = 'Loading...',
  generatingTitle = 'Generating Content',
  noContentTitle = 'No Content Available',
  noContentDescription = 'Create content to get started.',

  showGenerateButton = false,
  showBackgroundButton = false,
  showManualButton = false,
  generateButtonText = 'Generate with AI',
  backgroundButtonText = 'Generate in Background',
  manualButtonText = 'Create Manually',

  onGenerateWithLLM,
  onBackgroundGeneration,
  onCreateManually,
  onCancelGeneration,
  onMarkdownContentChange,

  canGenerate = true,
  canBackgroundGenerate = true,
  generateDisabledReason = '',
  backgroundDisabledReason = '',

  additionalInfo
}: ModalContentProps) {

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">{loadingMessage}</p>
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
            {generatingTitle}
          </h3>
          <p className="text-gray-400 mb-4 leading-relaxed">
            {generationStatus || 'Processing your request...'}
          </p>
          <div className="mb-6">
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div className="bg-cyan-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-sm text-gray-500">
              This may take a few minutes depending on the complexity
            </p>
          </div>
          {onCancelGeneration && (
            <button
              onClick={onCancelGeneration}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-mono mx-auto"
            >
              <StopCircle className="w-4 h-4" />
              <span>Cancel Generation</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!hasContent && !isEditing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-lg">
          <div className="w-16 h-16 mx-auto mb-6 text-gray-600">
            <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">
            {noContentTitle}
          </h3>
          <p className="text-gray-400 mb-6 leading-relaxed">
            {noContentDescription}
          </p>

          {/* Generation Error Display */}
          {generationError && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{generationError}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Generate Button */}
            {showGenerateButton && onGenerateWithLLM && (
              <button
                onClick={onGenerateWithLLM}
                disabled={!canGenerate}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canGenerate ? generateDisabledReason : 'Generate content using AI'}
              >
                <Loader2 className="w-4 h-4" />
                <span>{generateButtonText}</span>
              </button>
            )}

            {/* Background Generation Button */}
            {showBackgroundButton && onBackgroundGeneration && (
              <button
                onClick={onBackgroundGeneration}
                disabled={backgroundProcessing || !canBackgroundGenerate}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canBackgroundGenerate ? backgroundDisabledReason : 'Generate content in background'}
              >
                <Zap className="w-4 h-4" />
                <span>{backgroundProcessing ? 'Processing...' : backgroundButtonText}</span>
              </button>
            )}

            {/* Manual Creation Button */}
            {showManualButton && onCreateManually && (
              <button
                onClick={onCreateManually}
                className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-mono"
              >
                <Plus className="w-4 h-4" />
                <span>{manualButtonText}</span>
              </button>
            )}
          </div>

          {additionalInfo && (
            <div className="mt-4">
              {additionalInfo}
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