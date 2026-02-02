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
      created: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      unchanged: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Template Discovery
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Scan external projects to discover TemplateConfig exports
        </p>
      </div>

      {/* Scan Form */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="Enter project path (e.g., C:/Users/mkdol/dolla/res)"
            className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            disabled={scanStatus === 'scanning'}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          />
          <button
            onClick={handleScan}
            disabled={scanStatus === 'scanning'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {scanStatus === 'scanning' ? (
              <>
                <span className="animate-spin">&#8987;</span>
                Scanning...
              </>
            ) : (
              'Scan'
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Scan progress indicator */}
        {scanStatus === 'scanning' && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <span className="animate-pulse">Scanning project for templates...</span>
            </div>
          </div>
        )}

        {/* Scan result */}
        {scanResult && (
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-md space-y-2">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <span>&#10003;</span>
              <span className="font-medium">Scan complete</span>
            </div>
            <div className="text-sm text-green-600 dark:text-green-400 space-y-1">
              <p>Files scanned: {scanResult.filesScanned}</p>
              <p>
                Results: {scanResult.results.created} created,{' '}
                {scanResult.results.updated} updated,{' '}
                {scanResult.results.unchanged} unchanged
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent scan templates */}
      {scanResult && scanResult.templates.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Scan Results
          </h3>
          <div className="border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
            {scanResult.templates.map((t) => (
              <div
                key={t.templateId}
                className="p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {t.templateName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t.templateId}
                  </div>
                </div>
                {getStatusBadge(t.action)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Project Path */}
      <div className="space-y-2">
        <label htmlFor="target-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Target Project Path
        </label>
        <input
          id="target-project"
          type="text"
          value={targetProjectPath}
          onChange={(e) => setTargetProjectPath(e.target.value)}
          placeholder="Enter target project path for generated files"
          className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Generated requirement files will be placed in this project&apos;s .claude/commands/ directory
        </p>
      </div>

      {/* All discovered templates */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          All Discovered Templates ({templates.length})
        </h3>
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg">
            No templates discovered yet. Scan a project to get started.
          </div>
        ) : (
          <div className="border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
            {templates.map((t) => (
              <div key={t.id}>
                <div
                  onClick={() => handleTemplateClick(t.id)}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedTemplateId === t.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {t.template_name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t.template_id}
                      </div>
                      {t.description && (
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                          {t.description}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(t.discovered_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 truncate">
                    {t.source_project_path}
                  </div>
                </div>

                {/* Inline Form Expansion */}
                {selectedTemplateId === t.id && (
                  <TemplateVariableForm
                    template={t}
                    flashSuccess={flashSuccess}
                    onPreview={(content) => {
                      // We need to track query for generate from modal
                      // The form will call onGenerate directly for the normal flow
                      handlePreview(content);
                    }}
                    onGenerate={handleGenerate}
                    onCancel={() => setSelectedTemplateId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generation History Section */}
      <div className="space-y-3 mt-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Generation History
        </h3>
        <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
          <GenerationHistoryPanel ref={historyPanelRef} />
        </div>
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
