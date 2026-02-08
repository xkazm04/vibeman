/**
 * Template Discovery Panel
 * Auto-discovers templates from the active project and generates Claude Code requirement files.
 *
 * Uses the active project from the SPA header - no manual path input needed.
 * Templates are auto-scanned on render when a project is selected.
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { scanProject, getTemplates, type ScanResult } from './lib/discoveryApi';
import { TemplateVariableForm } from './TemplateVariableForm';
import { PromptPreviewModal } from './PromptPreviewModal';
import { GenerationHistoryPanel, type GenerationHistoryPanelRef } from './GenerationHistoryPanel';
import TemplateColumn from './TemplateColumn';
import { toast } from '@/stores/toastStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import type { DbDiscoveredTemplate } from '../../../db/models/types';

// UI Components
import { Card } from '@/components/ui/Card';
import UnifiedButton from '@/components/ui/buttons/UnifiedButton';
import EmptyState from '@/components/DecisionPanel/EmptyState';
import { FolderSearch, Search, CheckCircle, RefreshCw } from 'lucide-react';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

export function TemplateDiscoveryPanel() {
  // Get active project from store
  const { activeProject } = useActiveProjectStore();
  const projectPath = activeProject?.path || '';

  // Scan state
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoScanned, setHasAutoScanned] = useState(false);

  // Templates list
  const [templates, setTemplates] = useState<DbDiscoveredTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Template selection and generation state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  // Track last scanned project to detect changes
  const lastScannedProjectRef = useRef<string | null>(null);

  // Load templates callback
  const loadTemplates = useCallback(async () => {
    if (!projectPath) {
      setTemplates([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Filter by current project path
      const data = await getTemplates(projectPath.replace(/\\/g, '/'));
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  const handleScan = useCallback(async () => {
    if (!projectPath) {
      setError('No project selected. Please select a project from the header.');
      return;
    }

    setError(null);
    setScanStatus('scanning');
    setScanResult(null);

    try {
      const result = await scanProject(projectPath);
      setScanResult(result);
      setScanStatus('complete');
      setHasAutoScanned(true);

      // Refresh templates list
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      setScanStatus('error');
    }
  }, [projectPath, loadTemplates]);

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

  const generateRequirementViaApi = async (params: {
    targetProjectPath: string;
    templateId: string;
    query: string;
    content: string;
    overwrite: boolean;
  }) => {
    const response = await fetch('/api/template-discovery/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  };

  const handleGenerate = async (params: { query: string; content: string }) => {
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) {
      toast.error('Template not found');
      return;
    }

    if (!projectPath) {
      toast.error('No project selected');
      return;
    }

    const result = await generateRequirementViaApi({
      targetProjectPath: projectPath,
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
        const overwriteResult = await generateRequirementViaApi({
          targetProjectPath: projectPath,
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

  // Group templates by category for column display
  const groupedTemplates = useMemo(() => {
    const grouped: Record<string, DbDiscoveredTemplate[]> = {};

    for (const template of templates) {
      const category = template.category || 'general';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(template);
    }

    // Convert to array and sort by category name (but put 'general' last)
    return Object.entries(grouped)
      .sort(([a], [b]) => {
        if (a === 'general') return 1;
        if (b === 'general') return -1;
        return a.localeCompare(b);
      })
      .map(([category, templates]) => ({ category, templates }));
  }, [templates]);

  // Get currently selected template
  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Load existing templates when project changes
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Auto-scan when active project changes
  useEffect(() => {
    if (projectPath && projectPath !== lastScannedProjectRef.current) {
      lastScannedProjectRef.current = projectPath;
      handleScan();
    }
  }, [projectPath, handleScan]);

  // No project selected state
  if (!activeProject) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FolderSearch}
          headline="No Project Selected"
          subtext="Select a project from the header dropdown to discover templates"
          height="h-64"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-100">
            Template Discovery
          </h2>
          <p className="text-sm text-gray-400">
            Templates from <span className="text-cyan-400">{activeProject.name}</span>
          </p>
        </div>
        <UnifiedButton
          icon={RefreshCw}
          colorScheme="cyan"
          variant="outline"
          size="sm"
          onClick={handleScan}
          disabled={scanStatus === 'scanning'}
          loading={scanStatus === 'scanning'}
        >
          {scanStatus === 'scanning' ? 'Scanning...' : 'Rescan'}
        </UnifiedButton>
      </div>

      {/* Project Info Card */}
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <FolderSearch className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-200">{activeProject.name}</div>
            <div className="text-xs text-gray-500 truncate" title={projectPath}>
              {projectPath}
            </div>
          </div>
          {scanStatus === 'complete' && scanResult && (
            <div className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" />
              <span>{scanResult.results.created + scanResult.results.updated + scanResult.results.unchanged} templates</span>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Scan progress indicator */}
        {scanStatus === 'scanning' && (
          <div className="mt-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="animate-pulse">Scanning project for templates...</span>
            </div>
          </div>
        )}
      </Card>

      {/* Templates by Category - Column Layout */}
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
          <>
            {/* Category Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {groupedTemplates.map(({ category, templates: categoryTemplates }) => (
                  <TemplateColumn
                    key={category}
                    category={category}
                    templates={categoryTemplates}
                    selectedTemplateId={selectedTemplateId}
                    onTemplateClick={handleTemplateClick}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Selected Template Form - Below columns */}
            {selectedTemplate && (
              <div className="mt-4">
                <TemplateVariableForm
                  template={selectedTemplate}
                  flashSuccess={flashSuccess}
                  onPreview={handlePreview}
                  onGenerate={handleGenerate}
                  onCancel={() => setSelectedTemplateId(null)}
                />
              </div>
            )}
          </>
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
