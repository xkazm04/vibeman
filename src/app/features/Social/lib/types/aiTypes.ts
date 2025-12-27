// AI Processing Types for Feedback Analysis

import { z } from 'zod';

// Feedback classification type
export type FeedbackClassification = 'bug' | 'feature' | 'clarification';

// Analysis stage type
export type AnalysisStage = 'classification' | 'requirement';

// Development team enum
export const DEV_TEAMS = [
  'frontend',
  'backend',
  'mobile',
  'platform',
  'data',
  'payments',
  'search',
  'notifications',
  'security',
  'localization',
  'customer-success',
  'growth',
] as const;

export type DevTeam = typeof DEV_TEAMS[number];

// Team icon mapping
export const TEAM_ICONS: Record<DevTeam, string> = {
  frontend: 'Monitor',
  backend: 'Server',
  mobile: 'Smartphone',
  platform: 'Cloud',
  data: 'Database',
  payments: 'CreditCard',
  search: 'Search',
  notifications: 'Bell',
  security: 'Shield',
  localization: 'Globe',
  'customer-success': 'Headphones',
  growth: 'TrendingUp',
};

// Team colors for UI
export const TEAM_COLORS: Record<DevTeam, string> = {
  frontend: 'text-blue-400 bg-blue-500/20',
  backend: 'text-green-400 bg-green-500/20',
  mobile: 'text-purple-400 bg-purple-500/20',
  platform: 'text-cyan-400 bg-cyan-500/20',
  data: 'text-orange-400 bg-orange-500/20',
  payments: 'text-emerald-400 bg-emerald-500/20',
  search: 'text-yellow-400 bg-yellow-500/20',
  notifications: 'text-pink-400 bg-pink-500/20',
  security: 'text-red-400 bg-red-500/20',
  localization: 'text-indigo-400 bg-indigo-500/20',
  'customer-success': 'text-teal-400 bg-teal-500/20',
  growth: 'text-lime-400 bg-lime-500/20',
};

// ============================================================================
// STAGE 1: Classification Analysis (New -> Analyzed)
// ============================================================================

// Jira ticket structure schema
export const JiraTicketSchema = z.object({
  summary: z.string().describe('Brief summary of the issue (max 100 chars)'),
  description: z.string().describe('Detailed description of the issue'),
  area: z.enum(['frontend', 'backend', 'mobile', 'api', 'ux', 'localization', 'accessibility', 'performance', 'other']).describe('Technical area affected'),
  severity: z.enum(['critical', 'major', 'minor', 'trivial']).describe('Severity level'),
  effort: z.enum(['xs', 's', 'm', 'l', 'xl']).describe('Estimated effort to fix'),
});

export type JiraTicketData = z.infer<typeof JiraTicketSchema>;

// Customer response schema
export const CustomerResponseSchema = z.object({
  tone: z.enum(['apologetic', 'informative', 'grateful', 'empathetic']).describe('Tone of the response'),
  message: z.string().describe('Response message to send to customer'),
  followUpRequired: z.boolean().describe('Whether follow-up is needed'),
});

export type CustomerResponseData = z.infer<typeof CustomerResponseSchema>;

// Single feedback analysis result
export const FeedbackAnalysisResultSchema = z.object({
  feedbackId: z.string().describe('ID of the feedback item'),
  title: z.string().describe('Short 3-6 word title summarizing the issue'),
  classification: z.enum(['bug', 'feature', 'clarification']).describe('Type of feedback'),
  confidence: z.number().min(0).max(1).describe('Confidence score'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).describe('SLA priority'),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional().describe('Customer sentiment'),
  customerResponse: CustomerResponseSchema,
  jiraTicket: JiraTicketSchema.optional().describe('Jira ticket data (only for bugs and features)'),
  tags: z.array(z.string()).describe('Relevant tags'),
  suggestedPipeline: z.enum(['manual', 'automatic']).describe('Suggested processing pipeline'),
  assignedTeam: z.enum(['frontend', 'backend', 'mobile', 'platform', 'data', 'payments', 'search', 'notifications', 'security', 'localization', 'customer-success', 'growth']).describe('Development team responsible'),
  reasoning: z.string().describe('Brief explanation of the analysis'),
});

export type FeedbackAnalysisResult = z.infer<typeof FeedbackAnalysisResultSchema>;

// Batch processing response
export const BatchAnalysisResponseSchema = z.object({
  results: z.array(FeedbackAnalysisResultSchema),
  summary: z.object({
    totalProcessed: z.number(),
    bugs: z.number(),
    features: z.number(),
    clarifications: z.number(),
    avgConfidence: z.number(),
  }),
});

export type BatchAnalysisResponse = z.infer<typeof BatchAnalysisResponseSchema>;

// ============================================================================
// STAGE 2: Requirement Analysis (Analyzed -> Manual/Automatic)
// ============================================================================

// GitHub Issue Schema
export const GitHubIssueSchema = z.object({
  title: z.string().max(80).describe('GitHub issue title'),
  labels: z.array(z.string()).describe('GitHub labels'),
  assignees: z.array(z.string()).optional().describe('Suggested assignees'),
  milestone: z.string().optional().describe('Target milestone'),
  body: z.object({
    summary: z.string().describe('Brief summary of the issue'),
    context: z.string().describe('Background context and user impact'),
    technicalAnalysis: z.string().describe('Root cause analysis'),
    proposedSolution: z.string().describe('Detailed solution description'),
    implementationSteps: z.array(z.object({
      step: z.number(),
      description: z.string(),
      file: z.string().optional(),
      codeHint: z.string().optional(),
    })).describe('Step-by-step implementation guide'),
    filesAffected: z.array(z.object({
      path: z.string(),
      action: z.enum(['modify', 'create', 'delete']),
      changes: z.string(),
    })).describe('Files that need to be changed'),
    testingGuidance: z.string().describe('How to test the fix'),
    additionalNotes: z.string().optional().describe('Additional notes'),
  }),
  codeChanges: z.array(z.object({
    file: z.string().describe('File path'),
    lineStart: z.number().optional().describe('Starting line number'),
    lineEnd: z.number().optional().describe('Ending line number'),
    currentCode: z.string().optional().describe('Current code snippet'),
    proposedCode: z.string().describe('Proposed code change'),
    explanation: z.string().describe('Explanation of the change'),
  })).optional().describe('Specific code changes'),
});

export type GitHubIssueData = z.infer<typeof GitHubIssueSchema>;

// Requirement Analysis Result
export const RequirementAnalysisResultSchema = z.object({
  feedbackId: z.string().describe('ID of the feedback item'),
  originalClassification: z.enum(['bug', 'feature', 'clarification']).describe('Original classification'),
  analysisOutcome: z.enum(['manual', 'automatic']).describe('Determined pipeline'),
  confidence: z.number().min(0).max(1).describe('Confidence in the analysis'),
  codeFileAnalyzed: z.string().describe('Path of the code file analyzed'),
  automaticIssue: GitHubIssueSchema.optional().describe('GitHub issue data (if automatic)'),
  reasoning: z.string().describe('Explanation of the outcome'),
  rootCauseIdentified: z.boolean().describe('Whether root cause was identified'),
  relatedBugReference: z.string().optional().describe('Reference to known bug'),
});

export type RequirementAnalysisResult = z.infer<typeof RequirementAnalysisResultSchema>;

// Batch Requirement Analysis Response
export const BatchRequirementAnalysisResponseSchema = z.object({
  results: z.array(RequirementAnalysisResultSchema),
  summary: z.object({
    totalProcessed: z.number(),
    movedToManual: z.number(),
    movedToAutomatic: z.number(),
    avgConfidence: z.number(),
    rootCausesFound: z.number(),
  }),
});

export type BatchRequirementAnalysisResponse = z.infer<typeof BatchRequirementAnalysisResponseSchema>;

// ============================================================================
// Common Types
// ============================================================================

// Processing status
export type AIProcessingStatus = 'idle' | 'processing' | 'success' | 'error';

// AI Provider type
export type AIProvider = 'gemini' | 'claude';

// AI Processing state
export interface AIProcessingState {
  status: AIProcessingStatus;
  provider: AIProvider;
  selectedIds: Set<string>;
  results: Map<string, FeedbackAnalysisResult>;
  error?: string;
  progress?: {
    current: number;
    total: number;
  };
}

// Extended feedback item with AI analysis
export interface ProcessedFeedbackItem {
  id: string;
  originalFeedbackId: string;
  classification: FeedbackClassification;
  customerResponse: CustomerResponseData;
  jiraTicket?: JiraTicketData;
  processedAt: string;
  processedBy: AIProvider;
  confidence: number;
  tags: string[];
}

// Feedback item for UI (transformed from dataset)
export interface UIFeedbackItem {
  id: string;
  channel: string;
  timestamp: string;
  author: {
    name: string;
    handle?: string;
    email?: string;
    locale?: string;
    device?: string;
    followers?: number;
  };
  content: {
    subject?: string;
    body: string;
    excerpt?: string;
  };
  conversation?: Array<{
    role: 'customer' | 'agent';
    message: string;
  }>;
  rating?: number;
  bugReference: string;
  sentiment: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  engagement?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
  isSelected?: boolean;
  aiResult?: FeedbackAnalysisResult;
  requirementResult?: RequirementAnalysisResult;
  processingStatus?: AIProcessingStatus;
}

// ============================================================================
// Markdown Generation Helpers
// ============================================================================

/**
 * Generate GitHub Issue markdown body from GitHubIssueData
 */
export function generateGitHubIssueMarkdown(issue: GitHubIssueData): string {
  const { body, codeChanges } = issue;

  let md = `# ${issue.title}\n\n`;

  if (issue.labels.length > 0) {
    md += `**Labels:** ${issue.labels.map(l => `\`${l}\``).join(', ')}\n\n`;
  }

  md += `## Summary\n\n${body.summary}\n\n`;
  md += `## Context\n\n${body.context}\n\n`;
  md += `## Technical Analysis\n\n${body.technicalAnalysis}\n\n`;
  md += `## Proposed Solution\n\n${body.proposedSolution}\n\n`;

  md += `## Implementation Steps\n\n`;
  for (const step of body.implementationSteps) {
    md += `${step.step}. ${step.description}`;
    if (step.file) md += ` (\`${step.file}\`)`;
    md += '\n';
    if (step.codeHint) {
      md += `   > Hint: ${step.codeHint}\n`;
    }
  }
  md += '\n';

  md += `## Files Affected\n\n`;
  for (const file of body.filesAffected) {
    const actionIcon = file.action === 'modify' ? '~' : file.action === 'create' ? '+' : '-';
    md += `- \`${actionIcon}\` \`${file.path}\` - ${file.changes}\n`;
  }
  md += '\n';

  if (codeChanges && codeChanges.length > 0) {
    md += `## Code Changes\n\n`;
    for (const change of codeChanges) {
      md += `### \`${change.file}\``;
      if (change.lineStart) {
        md += ` (L${change.lineStart}${change.lineEnd ? `-${change.lineEnd}` : ''})`;
      }
      md += '\n\n';

      if (change.currentCode) {
        md += `**Current:**\n\`\`\`tsx\n${change.currentCode}\n\`\`\`\n\n`;
      }
      md += `**Proposed:**\n\`\`\`tsx\n${change.proposedCode}\n\`\`\`\n\n`;
      md += `*${change.explanation}*\n\n`;
    }
  }

  md += `## Testing\n\n${body.testingGuidance}\n\n`;

  if (body.additionalNotes) {
    md += `## Notes\n\n${body.additionalNotes}\n`;
  }

  return md;
}
