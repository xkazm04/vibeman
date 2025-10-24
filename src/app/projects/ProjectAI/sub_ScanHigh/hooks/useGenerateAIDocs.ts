import { useState, useCallback } from 'react';

interface GenerateAIDocsParams {
  projectName: string;
  analysis: any;
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
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/projects/ai-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate AI documentation');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateDocs,
    isGenerating,
    error,
  };
}