import { useState, useCallback } from 'react';

interface GenerateAIDocsParams {
  projectName: string;
  projectPath: string;
  analysis?: any;
  projectId?: string;
  provider?: string;
}

interface GenerateAIDocsResult {
  success: boolean;
  review?: string;
  error?: string;
}

export function useGenerateAIDocs() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDocs = useCallback(async (params: GenerateAIDocsParams): Promise<GenerateAIDocsResult> => {
    console.log('[useGenerateAIDocs] Setting isGenerating to true');
    setIsGenerating(true);
    setError(null);

    try {
      console.log('[useGenerateAIDocs] Calling API with params:', { ...params, analysis: 'omitted' });
      const response = await fetch('/api/projects/ai-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      console.log('[useGenerateAIDocs] API response:', { success: result.success, hasReview: !!result.review });

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate AI documentation');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[useGenerateAIDocs] Error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      console.log('[useGenerateAIDocs] Setting isGenerating to false');
      setIsGenerating(false);
    }
  }, []);

  return {
    generateDocs,
    isGenerating,
    error,
  };
}