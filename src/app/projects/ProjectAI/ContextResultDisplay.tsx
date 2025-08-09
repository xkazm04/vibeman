import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, CheckCircle, AlertCircle, Copy } from 'lucide-react';

interface ContextResultDisplayProps {
  contexts: Array<{ filename: string; content: string }>;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  activeProject: any;
}

export default function ContextResultDisplay({
  contexts,
  loading,
  error,
  onBack,
  activeProject
}: ContextResultDisplayProps) {
  const [copiedFile, setCopiedFile] = React.useState<string | null>(null);

  const handleCopyContent = async (filename: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(filename);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/30">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-white">Context Scanner</h2>
              <p className="text-sm text-gray-400">Analyzing codebase and generating feature contexts...</p>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-white mb-2">Scanning Codebase</h3>
            <p className="text-gray-400 max-w-md">
              Analyzing your project structure and grouping files into logical feature contexts...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/30">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-white">Context Scanner</h2>
              <p className="text-sm text-gray-400">Failed to generate context files</p>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Generation Failed</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700/30">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-white">Context Scanner Results</h2>
            <p className="text-sm text-gray-400">
              Generated {contexts.length} feature context files for {activeProject?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>Files saved to context/ directory</span>
        </div>
      </div>

      {/* Results Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <h3 className="text-lg font-medium text-green-400 mb-2">Context Generation Complete</h3>
            <p className="text-gray-300 text-sm">
              Successfully analyzed your codebase and created {contexts.length} feature context files. 
              These files document the structure, data flow, and business rules for each major feature in your application.
            </p>
          </div>

          {/* Context Files List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Generated Context Files</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contexts.map((context, index) => (
                <motion.div
                  key={context.filename}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-4 hover:bg-gray-800/70 transition-colors"
                >
                  {/* File Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-white text-sm truncate" title={context.filename}>
                          {context.filename.replace('_context.md', '').replace(/_/g, ' ')}
                        </h4>
                        <p className="text-xs text-gray-400 truncate">
                          context/{context.filename}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyContent(context.filename, context.content)}
                      className="p-1.5 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                      title="Copy content"
                    >
                      {copiedFile === context.filename ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Context Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Content Size</span>
                      <span className="text-gray-300">{(context.content.length / 1024).toFixed(1)}KB</span>
                    </div>
                    
                    {/* Extract file count from content if available */}
                    {(() => {
                      const locationMapMatch = context.content.match(/### Location Map[\s\S]*?```[\s\S]*?```/i);
                      const fileMatches = locationMapMatch ? 
                        (locationMapMatch[0].match(/\.[a-zA-Z0-9]+/g) || []).length : 0;
                      
                      if (fileMatches > 0) {
                        return (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Related Files</span>
                            <span className="text-blue-400 font-medium">{fileMatches} files</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Status</span>
                      <span className="text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Saved
                      </span>
                    </div>
                  </div>

                  {/* Feature Preview */}
                  <div className="mt-3 pt-3 border-t border-gray-700/30">
                    <div className="text-xs text-gray-400 mb-1">Feature Preview</div>
                    <div className="text-xs text-gray-300 line-clamp-2">
                      {(() => {
                        const functionalityMatch = context.content.match(/## Core Functionality\s*\n([^#]*)/i);
                        return functionalityMatch ? 
                          functionalityMatch[1].trim().split('\n')[0].slice(0, 120) + '...' :
                          'Context documentation generated';
                      })()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-400 mb-2">Next Steps</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Review the generated context files in your project's context/ directory</li>
              <li>• Update any placeholder information with project-specific details</li>
              <li>• Use these files as documentation for new team members</li>
              <li>• Reference them when making architectural decisions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}