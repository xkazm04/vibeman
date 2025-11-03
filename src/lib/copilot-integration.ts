import { CopilotTask } from '@/types/copilot';

export class CopilotIntegration {
  private n8nWebhookUrl: string;

  constructor(webhookUrl: string) {
    this.n8nWebhookUrl = webhookUrl;
  }

  private handleError(error: unknown): { success: false; error: string } {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  async createCopilotTask(task: CopilotTask): Promise<{
    success: boolean;
    issueNumber?: number;
    issueUrl?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        issueNumber: result.taskMetadata?.issueNumber,
        issueUrl: result.taskMetadata?.trackingUrl,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Batch create tasks
  async createMultipleTasks(tasks: CopilotTask[]): Promise<Array<{
    task: CopilotTask;
    result: Awaited<ReturnType<CopilotIntegration['createCopilotTask']>>;
  }>> {
    const results = [];
    
    // Process tasks sequentially to avoid overwhelming the API
    for (const task of tasks) {
      const result = await this.createCopilotTask(task);
      results.push({ task, result });
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  }
} 