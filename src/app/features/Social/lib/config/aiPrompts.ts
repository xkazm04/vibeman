// AI Provider Configuration
import type { AIProvider } from '../types/aiTypes';

// Model configurations
export const AI_MODELS = {
  claude: 'claude-haiku-4-5-20251001',
  gemini: 'gemini-2.5-flash',
} as const;

// System prompt for feedback analysis
export const FEEDBACK_ANALYSIS_SYSTEM_PROMPT = `You are an expert product feedback analyst. Your task is to analyze customer feedback, classify it, assign it to the appropriate development team, and generate a personalized response.

## Classification Rules:
1. **bug**: A technical issue, malfunction, or broken functionality
2. **feature**: A request for new functionality, enhancement, or improvement
3. **clarification**: User needs help, has questions, or is confused (not a bug)

## Pipeline Assignment Rules (CRITICAL):
- **ONLY bugs can go to "automatic"** pipeline (AI-assisted fix)
- **Features, clarifications, and unclear items MUST go to "manual"** pipeline
- Even bugs should go to "manual" if they are complex, security-related, or require architectural decisions

## PRIORITY Assignment Rules (SLA-aware):
Priority determines customer response SLA. Assign based on CUSTOMER IMPACT, not development effort:

**CRITICAL priority** (30min-2h SLA):
- Customer is currently blocked and losing money
- Active customer complaint requiring immediate de-escalation
- Security or data breach concerns

**HIGH priority** (2h-8h SLA):
- Customer has an urgent issue affecting their immediate use
- Strong emotional response (angry, frustrated sentiment)
- Public complaints on social media - reputation impact

**MEDIUM priority** (8h-48h SLA):
- Customer needs clarification or help with a general question
- Non-urgent bug reports that don't block the customer
- Feature suggestions with moderate sentiment

**LOW priority** (24h-72h SLA):
- Bug reports that are informational only
- Feature requests with constructive/neutral sentiment
- Technical feedback that helps improve but customer isn't waiting

## Team Assignment:
- **frontend**: UI bugs, styling issues, client-side errors
- **backend**: Server errors, API issues, database problems
- **mobile**: App crashes, mobile-specific bugs
- **platform**: Infrastructure, deployment, DevOps
- **data**: Analytics bugs, data inconsistencies
- **payments**: Billing errors, payment failures
- **search**: Search functionality, filters, sorting
- **notifications**: Email, push notifications, SMS
- **security**: Auth issues, privacy concerns
- **localization**: Translation issues, currency display
- **customer-success**: General complaints, feedback about support
- **growth**: Onboarding issues, conversion problems

## Customer Response Guidelines:
- **For bugs**: Apologetic, acknowledge the issue, promise investigation
- **For features**: Grateful for the suggestion, explain consideration
- **For clarifications**: Helpful, provide guidance
- Keep responses concise but warm (2-4 sentences)

## CRITICAL OUTPUT RULES:
- Output ONLY valid JSON - no markdown, no code blocks
- Start your response directly with { and end with }

Respond with valid JSON only.`;

// Generate the analysis prompt for a batch of feedback
export function generateAnalysisPrompt(feedbackItems: Array<{
  id: string;
  channel: string;
  content: string;
  sentiment: string;
  priority: string;
  tags: string[];
}>) {
  const feedbackList = feedbackItems.map((item, index) => {
    return `
### Feedback ${index + 1}
- ID: ${item.id}
- Channel: ${item.channel}
- Sentiment: ${item.sentiment}
- Priority: ${item.priority}
- Tags: ${item.tags.join(', ')}
- Content:
"""
${item.content}
"""
`;
  }).join('\n');

  return `Analyze the following ${feedbackItems.length} customer feedback item(s) and provide structured analysis for each.

${feedbackList}

For each feedback item, provide:
1. Classification (bug/feature/clarification)
2. Confidence score (0-1)
3. **Priority** - based on customer urgency
4. **Personalized customer response**
5. **Assigned team**
6. Jira ticket details (if bug or feature)
7. Suggested pipeline
8. Relevant tags
9. Brief reasoning

IMPORTANT: Output raw JSON only.

Respond with a JSON object in this exact format:
{
  "results": [
    {
      "feedbackId": "string",
      "title": "string (short 3-6 word title)",
      "classification": "bug" | "feature" | "clarification",
      "confidence": number (0-1),
      "priority": "low" | "medium" | "high" | "critical",
      "customerResponse": {
        "tone": "apologetic" | "informative" | "grateful" | "empathetic",
        "message": "string (personalized 2-4 sentence response)",
        "followUpRequired": boolean
      },
      "jiraTicket": {
        "summary": "string (max 100 chars)",
        "description": "string (detailed)",
        "area": "frontend" | "backend" | "mobile" | "api" | "ux" | "localization" | "accessibility" | "performance" | "other",
        "severity": "critical" | "major" | "minor" | "trivial",
        "effort": "xs" | "s" | "m" | "l" | "xl"
      },
      "tags": ["string"],
      "suggestedPipeline": "manual" | "automatic",
      "assignedTeam": "frontend" | "backend" | "mobile" | "platform" | "data" | "payments" | "search" | "notifications" | "security" | "localization" | "customer-success" | "growth",
      "reasoning": "string"
    }
  ],
  "summary": {
    "totalProcessed": number,
    "bugs": number,
    "features": number,
    "clarifications": number,
    "avgConfidence": number
  }
}`;
}

// System prompt for requirement analysis
export const REQUIREMENT_ANALYSIS_SYSTEM_PROMPT = `You are a senior software engineer specialized in analyzing bug reports and feature requests against source code.

Your task is to analyze customer feedback that has been pre-classified and determine if you can identify the root cause and propose a solution.

## Decision Framework

**Move to AUTOMATIC (GitHub Issue) if ALL of these are true:**
1. You can clearly identify the root cause in the provided code
2. You can propose specific code changes
3. The fix is well-defined and testable
4. No external dependencies or API changes needed

**Move to MANUAL if ANY of these are true:**
1. The issue cannot be traced to the provided code
2. More investigation is needed
3. The issue requires architectural decisions
4. Multiple valid solutions exist that require human decision
5. The code context is insufficient

## CRITICAL OUTPUT RULES:
- Output ONLY valid JSON - no markdown, no code blocks
- Start your response directly with { and end with }

Always respond with valid JSON only.`;

// Generate the requirement analysis prompt
export function generateRequirementAnalysisPrompt(
  feedbackItems: Array<{
    id: string;
    title: string;
    classification: 'bug' | 'feature' | 'clarification';
    channel: string;
    content: string;
    sentiment: string;
    priority: string;
    tags: string[];
    bugReference?: string;
  }>,
  codeContext: {
    filePath: string;
    code: string;
  }
) {
  const feedbackList = feedbackItems.map((item, index) => {
    return `
### Feedback ${index + 1}
- ID: ${item.id}
- Title: ${item.title}
- Classification: ${item.classification}
- Channel: ${item.channel}
- Sentiment: ${item.sentiment}
- Priority: ${item.priority}
- Tags: ${item.tags.join(', ')}
- Bug Reference: ${item.bugReference || 'Unknown'}
- Content:
"""
${item.content}
"""
`;
  }).join('\n');

  return `## Task: Requirement Analysis for Code Implementation

Analyze the following pre-classified feedback items against the provided source code.

## Customer Feedback to Analyze
${feedbackList}

## Source Code Context

**File:** ${codeContext.filePath}

\`\`\`tsx
${codeContext.code}
\`\`\`

## Instructions

For each feedback item:
1. Search the code for potential root causes
2. Determine if you have enough context to propose a solution
3. Generate either a GitHub Issue (automatic) or mark for manual review

## Response Format

IMPORTANT: Output raw JSON only.

Respond with a JSON object in this exact format:
{
  "results": [
    {
      "feedbackId": "string",
      "originalClassification": "bug" | "feature" | "clarification",
      "analysisOutcome": "manual" | "automatic",
      "confidence": number (0-1),
      "codeFileAnalyzed": "string (file path)",
      "rootCauseIdentified": boolean,
      "relatedBugReference": "string or null",
      "reasoning": "string",
      "automaticIssue": {
        "title": "string (max 80 chars)",
        "labels": ["string"],
        "body": {
          "summary": "string",
          "context": "string",
          "technicalAnalysis": "string",
          "proposedSolution": "string",
          "implementationSteps": [
            {
              "step": number,
              "description": "string",
              "file": "string (optional)",
              "codeHint": "string (optional)"
            }
          ],
          "filesAffected": [
            {
              "path": "string",
              "action": "modify" | "create" | "delete",
              "changes": "string"
            }
          ],
          "testingGuidance": "string",
          "additionalNotes": "string (optional)"
        },
        "codeChanges": [
          {
            "file": "string",
            "lineStart": number (optional),
            "lineEnd": number (optional),
            "currentCode": "string (optional)",
            "proposedCode": "string",
            "explanation": "string"
          }
        ] (optional)
      }
    }
  ],
  "summary": {
    "totalProcessed": number,
    "movedToManual": number,
    "movedToAutomatic": number,
    "avgConfidence": number,
    "rootCausesFound": number
  }
}`;
}
