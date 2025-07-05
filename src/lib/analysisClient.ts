interface AnalysisRequest {
  repository: string;
  goal: string;
  branch?: string;
  projectId?: string;
}

interface AnalysisResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export class AnalysisClient {
  private static readonly WEBHOOK_URL = 'http://localhost:5678/webhook-test/business-analyst';
  
  static async triggerAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
    try {
      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Analysis started successfully',
      };
    } catch (error) {
      console.error('Analysis trigger failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export default AnalysisClient; 