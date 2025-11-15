/**
 * AI Test Scenario Analyzer
 * Analyzes component trees and generates realistic test scenarios
 */

import type { ComponentNode, UserFlowStep } from '@/app/db';
import { generateWithLLM } from '@/lib/llm';
import fs from 'fs/promises';
import path from 'path';

/**
 * Extract component information from a file
 */
export async function analyzeComponentFile(filePath: string): Promise<ComponentNode | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Extract component name from file
    const fileName = path.basename(filePath, path.extname(filePath));

    // Use AI to analyze the component
    const prompt = `Analyze this React/TypeScript component and extract its structure:

\`\`\`typescript
${content}
\`\`\`

Return a JSON object with this structure:
{
  "name": "ComponentName",
  "filePath": "${filePath}",
  "props": ["prop1", "prop2"],
  "hasInteractiveElements": true/false,
  "dataTestIds": ["testid-1", "testid-2"],
  "children": []
}

Focus on:
- Interactive elements (buttons, inputs, forms, links)
- Existing data-testid attributes
- Props that affect behavior
- Child components

Return ONLY the JSON object, no explanation.`;

    const response = await generateWithLLM({
      prompt,
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      temperature: 0.3
    });

    // Parse the JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from AI response');
      return null;
    }

    const componentData = JSON.parse(jsonMatch[0]);
    return {
      name: componentData.name || fileName,
      filePath,
      props: componentData.props || [],
      hasInteractiveElements: componentData.hasInteractiveElements || false,
      dataTestIds: componentData.dataTestIds || [],
      children: componentData.children || []
    };
  } catch (error) {
    console.error(`Error analyzing component ${filePath}:`, error);
    return null;
  }
}

/**
 * Build component tree from multiple files
 */
export async function buildComponentTree(filePaths: string[]): Promise<ComponentNode[]> {
  const components = await Promise.all(
    filePaths.map(filePath => analyzeComponentFile(filePath))
  );

  return components.filter((comp): comp is ComponentNode => comp !== null);
}

/**
 * Generate test scenarios from component tree
 */
export async function generateTestScenarios(
  componentTree: ComponentNode[],
  contextDescription?: string
): Promise<{
  name: string;
  description: string;
  userFlows: UserFlowStep[];
  dataTestIds: string[];
  confidenceScore: number;
}[]> {
  const prompt = `You are an expert QA engineer. Analyze this component structure and generate realistic end-to-end test scenarios.

Component Tree:
\`\`\`json
${JSON.stringify(componentTree, null, 2)}
\`\`\`

${contextDescription ? `Context: ${contextDescription}\n` : ''}

Generate 3-5 test scenarios that cover:
1. Common user workflows (happy paths)
2. Edge cases and error handling
3. Critical user interactions

For each scenario, provide:
- name: Short descriptive name
- description: What the test validates
- userFlows: Array of steps with actions (click, type, scroll, etc.) and selectors
- dataTestIds: Required data-testid attributes (generate meaningful names)
- confidenceScore: 0-100 score of how confident you are this scenario is valuable

Return a JSON array of scenarios. Example format:
[
  {
    "name": "User Login Flow",
    "description": "Validates successful user authentication",
    "userFlows": [
      {
        "step": 1,
        "action": "type",
        "selector": "[data-testid='email-input']",
        "value": "user@example.com",
        "description": "Enter email address",
        "expectedOutcome": "Email field populated"
      },
      {
        "step": 2,
        "action": "click",
        "selector": "[data-testid='submit-btn']",
        "description": "Submit login form",
        "expectedOutcome": "Redirect to dashboard"
      }
    ],
    "dataTestIds": ["email-input", "password-input", "submit-btn"],
    "confidenceScore": 95
  }
]

Return ONLY the JSON array, no explanation or markdown.`;

  try {
    const response = await generateWithLLM({
      prompt,
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      temperature: 0.4
    });

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON array from AI response');
    }

    const scenarios = JSON.parse(jsonMatch[0]);
    return scenarios;
  } catch (error) {
    console.error('Error generating test scenarios:', error);
    throw error;
  }
}

/**
 * Analyze and suggest missing data-testid attributes
 */
export async function suggestMissingTestIds(
  filePath: string,
  existingTestIds: string[]
): Promise<{
  filePath: string;
  suggestions: Array<{
    line: number;
    element: string;
    suggestedTestId: string;
    reason: string;
  }>;
}> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    const prompt = `Analyze this React component and suggest data-testid attributes for interactive elements that don't have them.

File: ${filePath}
Existing test IDs: ${existingTestIds.join(', ')}

\`\`\`typescript
${content}
\`\`\`

Return a JSON object:
{
  "filePath": "${filePath}",
  "suggestions": [
    {
      "line": 42,
      "element": "button",
      "suggestedTestId": "submit-form-btn",
      "reason": "Primary form submission button"
    }
  ]
}

Focus on:
- Buttons, inputs, forms, links, modals
- Elements that trigger state changes
- Navigation elements
- Use kebab-case for test IDs
- Make IDs descriptive and unique

Return ONLY the JSON object.`;

    const response = await generateWithLLM({
      prompt,
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      temperature: 0.3
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error(`Error suggesting test IDs for ${filePath}:`, error);
    throw error;
  }
}

/**
 * Extract all data-testid attributes from a file
 */
export async function extractExistingTestIds(filePath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const regex = /data-testid=["']([^"']+)["']/g;
    const testIds: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      testIds.push(match[1]);
    }

    return testIds;
  } catch (error) {
    console.error(`Error extracting test IDs from ${filePath}:`, error);
    return [];
  }
}
