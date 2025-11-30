'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  FileJson,
  Code2,
  AlertTriangle,
  CheckCircle,
  Copy,
  Download,
  FileCode,
  FolderOpen,
  Loader2,
  Search,
  RefreshCw,
} from 'lucide-react';
import { CyberCard } from '@/components/ui/wizard';
import { RefactorSpec, ValidationError } from '../../lib/dslTypes';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface PreviewPanelProps {
  spec: RefactorSpec;
  errors: ValidationError[];
}

type PreviewTab = 'summary' | 'files' | 'yaml' | 'json' | 'errors';

interface MatchedFile {
  path: string;
  relativePath: string;
  size: number;
  matches?: number;
}

/**
 * PreviewPanel - Preview the spec before execution
 */
export default function PreviewPanel({ spec, errors }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('summary');
  const [copied, setCopied] = useState(false);
  const [matchedFiles, setMatchedFiles] = useState<MatchedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [fileSearchError, setFileSearchError] = useState<string | null>(null);

  const activeProject = useActiveProjectStore(state => state.activeProject);

  // Fetch matched files when scope changes
  const fetchMatchedFiles = useCallback(async () => {
    if (!activeProject?.path || spec.scope.include.length === 0) {
      setMatchedFiles([]);
      return;
    }

    setIsLoadingFiles(true);
    setFileSearchError(null);

    try {
      const response = await fetch('/api/disk/glob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: activeProject.path,
          patterns: spec.scope.include,
          excludePatterns: spec.scope.exclude || [],
          fileTypes: spec.scope.fileTypes,
          limit: 100,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch matched files');
      }

      const data = await response.json();
      setMatchedFiles(data.files || []);
    } catch (error) {
      console.error('Failed to fetch matched files:', error);
      setFileSearchError(error instanceof Error ? error.message : 'Unknown error');
      setMatchedFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [activeProject?.path, spec.scope.include, spec.scope.exclude, spec.scope.fileTypes]);

  // Fetch files when switching to files tab or when scope changes
  useEffect(() => {
    if (activeTab === 'files') {
      fetchMatchedFiles();
    }
  }, [activeTab, fetchMatchedFiles]);

  // Generate YAML-like representation (simplified)
  const yamlContent = useMemo(() => {
    return `version: "${spec.version}"
name: "${spec.name}"
description: "${spec.description || ''}"

scope:
  include:
${spec.scope.include.map(p => `    - "${p}"`).join('\n')}
${spec.scope.exclude?.length ? `  exclude:\n${spec.scope.exclude.map(p => `    - "${p}"`).join('\n')}` : ''}
${spec.scope.fileTypes?.length ? `  fileTypes: [${spec.scope.fileTypes.join(', ')}]` : ''}

transformations:
${spec.transformations.map((rule, i) => `  - id: "${rule.id}"
    name: "${rule.name}"
    type: ${rule.type}
    pattern:
      type: ${rule.pattern.type}
      match: "${rule.pattern.match}"
    ${rule.replacement?.template ? `replacement:\n      template: "${rule.replacement.template}"` : ''}`).join('\n\n')}

execution:
  mode: ${spec.execution?.mode || 'preview'}
  runTestsAfterEach: ${spec.execution?.runTestsAfterEach || false}
  commitAfterEach: ${spec.execution?.commitAfterEach || false}
  typeCheck: ${spec.execution?.typeCheck || true}
  stopOnError: ${spec.execution?.stopOnError || true}

validation:
  runTests: ${spec.validation?.runTests || false}
  runTypeCheck: ${spec.validation?.runTypeCheck || true}
  runLint: ${spec.validation?.runLint || true}`;
  }, [spec]);

  // Generate JSON
  const jsonContent = useMemo(() => {
    return JSON.stringify(spec, null, 2);
  }, [spec]);

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: PreviewTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'summary', label: 'Summary', icon: Eye },
    { id: 'files', label: `Files (${matchedFiles.length})`, icon: FolderOpen },
    { id: 'yaml', label: 'YAML', icon: FileCode },
    { id: 'json', label: 'JSON', icon: FileJson },
    { id: 'errors', label: `Errors (${errors.length})`, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex items-center gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasErrors = tab.id === 'errors' && errors.length > 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : hasErrors
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              data-testid={`preview-tab-${tab.id}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'summary' && (
          <CyberCard variant="dark" data-testid="preview-summary">
            <div className="space-y-4">
              <h4 className="text-white font-medium">Specification Summary</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-black/30 rounded-lg">
                  <p className="text-gray-400 text-xs mb-1">Name</p>
                  <p className="text-white font-medium">{spec.name}</p>
                </div>
                <div className="p-3 bg-black/30 rounded-lg">
                  <p className="text-gray-400 text-xs mb-1">Transformations</p>
                  <p className="text-white font-medium">{spec.transformations.length} rules</p>
                </div>
                <div className="p-3 bg-black/30 rounded-lg">
                  <p className="text-gray-400 text-xs mb-1">Execution Mode</p>
                  <p className="text-white font-medium capitalize">{spec.execution?.mode || 'preview'}</p>
                </div>
                <div className="p-3 bg-black/30 rounded-lg">
                  <p className="text-gray-400 text-xs mb-1">Status</p>
                  <p className={`font-medium flex items-center gap-1 ${errors.filter(e => e.severity === 'error').length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {errors.filter(e => e.severity === 'error').length > 0 ? (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        Has errors
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Valid
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Rules summary */}
              <div>
                <h5 className="text-gray-400 text-sm mb-2">Transformation Rules</h5>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {spec.transformations.map((rule, index) => (
                    <div
                      key={rule.id}
                      className="flex items-center gap-3 p-2 bg-black/20 rounded-lg"
                    >
                      <span className="text-cyan-400 font-mono text-xs w-6">#{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{rule.name}</p>
                        <p className="text-gray-500 text-xs">{rule.type}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        rule.enabled === false
                          ? 'bg-gray-500/20 text-gray-400'
                          : 'bg-green-500/10 text-green-400'
                      }`}>
                        {rule.enabled === false ? 'Disabled' : 'Enabled'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scope summary */}
              <div>
                <h5 className="text-gray-400 text-sm mb-2">Scope</h5>
                <div className="flex flex-wrap gap-2">
                  {spec.scope.include.map((pattern, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 rounded font-mono">
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CyberCard>
        )}

        {activeTab === 'files' && (
          <CyberCard variant="dark" data-testid="preview-files">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">Matched Files</h4>
                <button
                  onClick={fetchMatchedFiles}
                  disabled={isLoadingFiles}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  data-testid="refresh-files-btn"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <p className="text-sm text-gray-400">
                Files matching your include/exclude patterns that will be processed
              </p>

              {isLoadingFiles ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : fileSearchError ? (
                <div className="text-center py-8 text-red-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Failed to search files</p>
                  <p className="text-sm text-red-400/70">{fileSearchError}</p>
                </div>
              ) : matchedFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No files matched</p>
                  <p className="text-sm text-gray-500">
                    Check your include/exclude patterns
                  </p>
                </div>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
                  {matchedFiles.map((file, index) => (
                    <motion.div
                      key={file.path}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-center gap-2 p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
                    >
                      <FileCode className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="flex-1 text-sm text-gray-300 font-mono truncate">
                        {file.relativePath}
                      </span>
                      {file.size && (
                        <span className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)}KB
                        </span>
                      )}
                    </motion.div>
                  ))}
                  {matchedFiles.length >= 100 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      Showing first 100 files. More files may be affected.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 pt-2 border-t border-white/10 text-sm">
                <span className="text-gray-400">
                  Total: <span className="text-white font-medium">{matchedFiles.length}</span> files
                </span>
                {spec.transformations.length > 0 && (
                  <span className="text-gray-400">
                    Rules: <span className="text-cyan-400 font-medium">{spec.transformations.filter(r => r.enabled !== false).length}</span> enabled
                  </span>
                )}
              </div>
            </div>
          </CyberCard>
        )}

        {activeTab === 'yaml' && (
          <CyberCard variant="dark" data-testid="preview-yaml">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">YAML Representation</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(yamlContent)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                    data-testid="copy-yaml-btn"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => handleDownload(yamlContent, `${spec.name.toLowerCase().replace(/\s/g, '-')}.yaml`)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                    data-testid="download-yaml-btn"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
              <pre className="p-4 bg-black/50 rounded-lg overflow-auto max-h-96 text-sm font-mono text-gray-300">
                {yamlContent}
              </pre>
            </div>
          </CyberCard>
        )}

        {activeTab === 'json' && (
          <CyberCard variant="dark" data-testid="preview-json">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">JSON Representation</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(jsonContent)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                    data-testid="copy-json-btn"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => handleDownload(jsonContent, `${spec.name.toLowerCase().replace(/\s/g, '-')}.json`)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                    data-testid="download-json-btn"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
              <pre className="p-4 bg-black/50 rounded-lg overflow-auto max-h-96 text-sm font-mono text-gray-300">
                {jsonContent}
              </pre>
            </div>
          </CyberCard>
        )}

        {activeTab === 'errors' && (
          <CyberCard variant="dark" data-testid="preview-errors">
            <div className="space-y-3">
              <h4 className="text-white font-medium">Validation Issues</h4>

              {errors.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-50" />
                  <p>No validation issues found</p>
                  <p className="text-sm text-gray-500">Your specification is valid</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {errors.map((error, index) => (
                    <motion.div
                      key={`${error.path}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-lg border ${
                        error.severity === 'error'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-yellow-500/10 border-yellow-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          error.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            error.severity === 'error' ? 'text-red-300' : 'text-yellow-300'
                          }`}>
                            {error.message}
                          </p>
                          {error.path && (
                            <p className="text-xs text-gray-500 font-mono mt-1">
                              Path: {error.path}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          error.severity === 'error'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {error.severity}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </CyberCard>
        )}
      </motion.div>
    </div>
  );
}
