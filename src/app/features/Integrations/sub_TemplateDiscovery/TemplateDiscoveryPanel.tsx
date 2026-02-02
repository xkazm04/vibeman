/**
 * Template Discovery Panel
 * UI for scanning external projects and viewing discovered templates
 *
 * Progress indication (DISC-05): Uses scan status state ('idle' | 'scanning' | 'complete' | 'error')
 * to show operation progress. For the initial implementation scanning ~10 template files,
 * a simple status indicator is sufficient - the scan completes in <2 seconds.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { scanProject, getTemplates, type ScanResult } from './lib/discoveryApi';
import { generateRequirementFile } from './lib/fileGenerator';
import { TemplateVariableForm } from './TemplateVariableForm';
import { PromptPreviewModal } from './PromptPreviewModal';
import { GenerationHistoryPanel, type GenerationHistoryPanelRef } from './GenerationHistoryPanel';
import { toast } from '@/stores/toastStore';
import type { DbDiscoveredTemplate } from '../../../db/models/types';

// UI Components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import UnifiedButton from '@/components/ui/buttons/UnifiedButton';
import EmptyState from '@/components/DecisionPanel/EmptyState';
import { FolderSearch, Scan, Search, FileText, Calendar, CheckCircle } from 'lucide-react';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

export function TemplateDiscoveryPanel() {
  // Form state
  const [projectPath, setProjectPath] = useState('');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Templates list
  const [templates, setTemplates] = useState<DbDiscoveredTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Template selection and generation state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [targetProjectPath, setTargetProjectPath] = useState('');

  // Store pending generation params for confirm from modal
  const [pendingGeneration, setPendingGeneration] = useState<{
    query: string;
    content: string;
    templateId: string;
  } | null>(null);

  // Green flash state for generation success feedback
  const [flashSuccess, setFlashSuccess] = useState(false);

  // Ref to history panel for refreshing after generation
  const historyPanelRef = useRef<GenerationHistoryPanelRef>(null);

  // Load existing templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = useCallback(async () => {
    if (!projectPath.trim()) {
      setError('Please enter a project path');
      return;
    }

    setError(null);
    setScanStatus('scanning');
    setScanResult(null);

    try {
      const result = await scanProject(projectPath.trim());
      setScanResult(result);
      setScanStatus('complete');

      // Refresh templates list
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      setScanStatus('error');
    }
  }, [projectPath]);

  const getStatusBadge = (action: 'created' | 'updated' | 'unchanged') => {
    const styles = {
      created: 'bg-green-500/20 text-green-400 border border-green-500/30',
      updated: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      unchanged: 'bg-gray-500/20 text-gray-400 border border-white/10',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${styles[action]}`}>
        {action}
      </span>
    );
  };

  const handleTemplateClick = (templateId: string) => {
    setSelectedTemplateId(selectedTemplateId === templateId ? null : templateId);
  };

  const handlePreview = (content: string) => {
    setPreviewContent(content);
    setIsPreviewOpen(true);
  };

  /**
   * Handle successful generation: trigger green flash and record to history
   */
  const handleGenerationSuccess = async (
    templateId: string,
    query: string,
    filePath: string
  ) => {
    // Trigger green flash on Generate button
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 600);

    // Record to generation history
    try {
      await fetch('/api/generation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          query,
          file_path: filePath,
        }),
      });
      // Refresh history panel
      historyPanelRef.current?.refresh();
    } catch (err) {
      console.error('Failed to record generation history:', err);
    }

    setSelectedTemplateId(null);
  };

  const handleGenerate = async (params: { query: string; content: string }) => {
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) {
      toast.error('Template not found');
      return;
    }

    if (!targetProjectPath.trim()) {
      toast.error('Please enter a target project path');
      return;
    }

    const result = generateRequirementFile({
      targetProjectPath: targetProjectPath.trim(),
      templateId: template.template_id,
      query: params.query,
      content: params.content,
      overwrite: false,
    });

    if (result.exists) {
      // File exists, ask for overwrite confirmation
      const confirmOverwrite = confirm(
        `File already exists at ${result.filePath || 'target location'}. Overwrite?`
      );
      if (confirmOverwrite) {
        const overwriteResult = generateRequirementFile({
          targetProjectPath: targetProjectPath.trim(),
          templateId: template.template_id,
          query: params.query,
          content: params.content,
          overwrite: true,
        });

        if (overwriteResult.success) {
          await handleGenerationSuccess(
            template.template_id,
            params.query,
            overwriteResult.filePath || ''
          );
        } else {
          toast.error('Failed to create file', overwriteResult.error);
        }
      }
      return;
    }

    if (result.success) {
      await handleGenerationSuccess(
        template.template_id,
        params.query,
        result.filePath || ''
      );
    } else {
      toast.error('Failed to create file', result.error);
    }
  };

  const handleConfirmGenerateFromModal = () => {
    if (pendingGeneration) {
      handleGenerate({
        query: pendingGeneration.query,
        content: pendingGeneration.content,
      });
      setPendingGeneration(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-100">
          Template Discovery
        </h2>
        <p className="text-sm text-gray-400">
          Scan external projects to discover TemplateConfig exports
        </p>
      </div>

      {/* Scanner Section - Elevated Card */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <FolderSearch className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle>Project Scanner</CardTitle>
              <CardDescription>
                Enter a project path to discover available templates
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="mt-4 space-y-4">
          {/* Input Row */}
          <div className="flex gap-3">
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="Enter project path (e.g., C:/Users/mkdol/dolla/res)"
              className="flex-1 px-4 py-2.5 bg-gray-800/40 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/30 transition-all duration-200"
              disabled={scanStatus === 'scanning'}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            />
            <UnifiedButton
              icon={Scan}
              colorScheme="cyan"
              variant="gradient"
              onClick={handleScan}
              disabled={scanStatus === 'scanning'}
              loading={scanStatus === 'scanning'}
            >
              {scanStatus === 'scanning' ? 'Scanning...' : 'Scan'}
            </UnifiedButton>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Scan progress indicator */}
          {scanStatus === 'scanning' && (
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-cyan-300">
                <span className="animate-pulse">Scanning project for templates...</span>
              </div>
            </div>
          )}

          {/* Scan result - Success Card */}
          {scanResult && (
            <Card variant="default" padding="md" className="border-green-500/30 bg-green-500/5">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Scan complete</span>
              </div>
              <div className="text-sm text-green-300/80 space-y-1">
                <p>Files scanned: {scanResult.filesScanned}</p>
                <p>
                  Results: {scanResult.results.created} created,{' '}
                  {scanResult.results.updated} updated,{' '}
                  {scanResult.results.unchanged} unchanged
                </p>
              </div>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Recent scan templates */}
      {scanResult && scanResult.templates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-100">
            Scan Results
          </h3>
          <Card variant="default" padding="none">
            <div className="divide-y divide-white/5">
              {scanResult.templates.map((t) => (
                <div
                  key={t.templateId}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-100">
                      {t.templateName}
                    </div>
                    <div className="text-sm text-gray-400">
                      {t.templateId}
                    </div>
                  </div>
                  {getStatusBadge(t.action)}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Target Project Path */}
      <div className="space-y-2">
        <label htmlFor="target-project" className="block text-sm font-medium text-gray-200">
          Target Project Path
        </label>
        <input
          id="target-project"
          type="text"
          value={targetProjectPath}
          onChange={(e) => setTargetProjectPath(e.target.value)}
          placeholder="Enter target project path for generated files"
          className="w-full px-4 py-2.5 bg-gray-800/40 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/30 transition-all duration-200"
        />
        <p className="text-xs text-gray-500">
          Generated requirement files will be placed in this project&apos;s .claude/commands/ directory
        </p>
      </div>

      {/* All discovered templates - Responsive Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-100">
          Discovered Templates ({templates.length})
        </h3>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-pulse">Loading templates...</div>
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={Search}
            headline="No templates discovered"
            subtext="Scan a project to discover TemplateConfig exports"
            height="h-48"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div key={t.id}>
                <Card
                  variant="glass"
                  padding="md"
                  hover
                  clickable
                  onClick={() => handleTemplateClick(t.id)}
                  className={selectedTemplateId === t.id ? 'ring-2 ring-cyan-500/40' : ''}
                >
                  <CardHeader
                    actions={
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(t.discovered_at).toLocaleDateString()}
                      </div>
                    }
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <CardTitle className="truncate">{t.template_name}</CardTitle>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{t.template_id}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="mt-3">
                    {t.description && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                        {t.description}
                      </p>
                    )}

                    {/* Search angles preview - parse from config_json */}
                    {(() => {
                      try {
                        const config = JSON.parse(t.config_json || '{}');
                        const angles = config.searchAngles as string[] | undefined;
                        if (angles && angles.length > 0) {
                          return (
                            <div className="flex flex-wrap gap-1">
                              {angles.slice(0, 3).map((angle, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 text-xs bg-gray-700/50 text-gray-400 rounded-full border border-white/5 truncate max-w-[100px]"
                                  title={angle}
                                >
                                  {angle}
                                </span>
                              ))}
                              {angles.length > 3 && (
                                <span className="px-2 py-0.5 text-xs text-gray-500">
                                  +{angles.length - 3}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      } catch {
                        return null;
                      }
                    })()}

                    <p className="mt-2 text-xs text-gray-500 truncate" title={t.source_project_path}>
                      {t.source_project_path}
                    </p>
                  </CardContent>
                </Card>

                {/* Inline Form Expansion */}
                {selectedTemplateId === t.id && (
                  <div className="mt-2">
                    <TemplateVariableForm
                      template={t}
                      flashSuccess={flashSuccess}
                      onPreview={(content) => {
                        handlePreview(content);
                      }}
                      onGenerate={handleGenerate}
                      onCancel={() => setSelectedTemplateId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generation History Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-100">
          Generation History
        </h3>
        <Card variant="default" padding="none">
          <GenerationHistoryPanel ref={historyPanelRef} />
        </Card>
      </div>

      {/* Preview Modal */}
      <PromptPreviewModal
        isOpen={isPreviewOpen}
        content={previewContent || ''}
        onClose={() => {
          setIsPreviewOpen(false);
          setPendingGeneration(null);
        }}
        onConfirmGenerate={handleConfirmGenerateFromModal}
      />
    </div>
  );
}
