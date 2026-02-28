import { useState, useCallback } from 'react';
import { SupportedProvider, DefaultProviderStorage } from '@/lib/llm';

interface UseHighLevelDocsParams {
  projectPath?: string;
  projectName?: string;
  projectId?: string;
}

interface GenerateDocsParams {
  analysis?: any;
  provider?: SupportedProvider;
  vision?: string;
}

export function useHighLevelDocs({ projectPath, projectName, projectId }: UseHighLevelDocsParams = {}) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingDocs, setHasExistingDocs] = useState(false);

  /**
   * Load existing docs from context/high.md
   */
  const loadDocs = useCallback(async () => {
    if (!projectPath) {
      setError('Project path is required');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/disk/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'read',
          filePath: `${projectPath}/context/high.md`
        })
      });

      if (response.ok) {
        const data = await response.json();
        setContent(data.content || '');
        setHasExistingDocs(true);
        return true;
      } else {
        setHasExistingDocs(false);
        setContent('');
        return false;
      }
    } catch (err) {      setError(err instanceof Error ? err.message : 'Failed to load documentation');
      setHasExistingDocs(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  /**
   * Generate new docs using AI
   */
  const generateDocs = useCallback(async ({ analysis, provider, vision }: GenerateDocsParams = {}) => {
    if (!projectName || !projectPath) {
      setError('Project name and path are required for generation');
      return false;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // First, gather codebase resources
      const resourceResponse = await fetch('/api/projects/ai-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          projectPath,
          analysis: analysis || {},
          projectId,
          provider: provider || DefaultProviderStorage.getDefaultProvider(),
          vision: vision || undefined
        })
      });

      if (!resourceResponse.ok) {
        throw new Error('Failed to gather codebase resources');
      }

      const resourceData = await resourceResponse.json();

      if (!resourceData.success || !resourceData.review) {
        throw new Error(resourceData.error || 'Failed to generate documentation');
      }

      setContent(resourceData.review);

      // Auto-save to context/high.md
      const saved = await saveDocs(resourceData.review);
      if (saved) {
        setHasExistingDocs(true);
      }

      return true;
    } catch (err) {      setError(err instanceof Error ? err.message : 'Failed to generate documentation');
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [projectName, projectPath, projectId]);

  /**
   * Save docs to context/high.md
   */
  const saveDocs = useCallback(async (contentToSave?: string) => {
    if (!projectPath) {
      setError('Project path is required for saving');
      return false;
    }

    const saveContent = contentToSave || content;
    if (!saveContent.trim()) {
      setError('Cannot save empty content');
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/disk/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write',
          filePath: projectPath + '/context/high.md',
          content: saveContent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save documentation');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save documentation');
      }

      setHasExistingDocs(true);
      return true;
    } catch (err) {      setError(err instanceof Error ? err.message : 'Failed to save documentation');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [projectPath, content]);

  /**
   * Update content (for editing)
   */
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setContent('');
    setError(null);
    setHasExistingDocs(false);
  }, []);

  return {
    // State
    content,
    isLoading,
    isGenerating,
    isSaving,
    error,
    hasExistingDocs,

    // Actions
    loadDocs,
    generateDocs,
    saveDocs,
    updateContent,
    clearError,
    reset,
  };
}
