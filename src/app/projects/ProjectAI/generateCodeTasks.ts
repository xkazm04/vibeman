import { readFile } from 'fs/promises';
import { join } from 'path';
import { backlogDb } from '../../../lib/database';
import { generateWithLLM, DefaultProviderStorage } from '../../../lib/llm';

// Generate code optimization tasks
export async function generateCodeTasks(projectName: string, projectId: string, analysis: any, provider?: string): Promise<string> {
  // Get existing tasks to prevent duplicates
  const existingTasks = backlogDb.getBacklogItemsByProject(projectId);
  
  let promptTemplate = '';
  try {
    // Try multiple possible paths
    const possiblePaths = [
      join(process.cwd(), 'vibeman', 'src', 'app', 'projects', 'templates', 'code-optimization-tasks.md'),
      join(process.cwd(), 'src', 'app', 'projects', 'templates', 'code-optimization-tasks.md'),
      join(__dirname, '..', '..', 'templates', 'code-optimization-tasks.md'),
      join(__dirname, '..', '..', '..', 'templates', 'code-optimization-tasks.md')
    ];
    
    for (const templatePath of possiblePaths) {
      try {
        console.log(`Attempting to read code optimization template from: ${templatePath}`);
        promptTemplate = await readFile(templatePath, 'utf-8');
        console.log(`Successfully read code-optimization-tasks.md template (${promptTemplate.length} characters)`);
        break;
      } catch (pathError) {
        console.log(`Path ${templatePath} failed:`, pathError.message);
        continue;
      }
    }
    
    if (!promptTemplate) {
      throw new Error('Could not find code-optimization-tasks.md in any of the expected locations');
    }
  } catch (error) {
    console.warn('Could not read code-optimization-tasks.md template, using fallback. Error:', error);
    promptTemplate = `Based on the repository analysis above, generate exactly 5 code optimization tasks that focus on improving code structure, reducing file complexity, and enhancing maintainability.

**CRITICAL: Avoid duplicating any existing tasks that have already been generated for this project.**

Return the tasks in strict JSON format following this schema:

\`\`\`json
[
  {
    "title": "string (2-5 words)",
    "description": [
      "Step or component to refactor/optimize",
      "Another optimization step",
      "Additional steps as needed"
    ],
    "type": "Optimization",
    "reason": "string (1-2 sentences explaining the technical value and maintainability benefits)"
  }
]
\`\`\`

Selection criteria for code optimization tasks:
- Identify large files (>300 lines) that could be split into smaller modules
- Look for duplicate code patterns that could be extracted into reusable utilities
- Find complex functions with high cyclomatic complexity that need refactoring
- Identify files handling multiple responsibilities that should be separated
- Focus on performance optimizations and maintainability enhancements

Ensure the JSON is valid and parseable. Each description should provide clear, specific steps for refactoring that will measurably improve code organization and reduce complexity.`;
  }

  // Build the analysis data section with focus on code structure
  const buildAnalysisSection = () => {
    let section = `## Project Analysis Data\n\n**Project Name**: ${projectName}\n\n`;
    
    // Add project structure if available
    if (analysis?.structure) {
      section += `**Project Structure**:\n\`\`\`\n${JSON.stringify(analysis.structure, null, 2)}\n\`\`\`\n\n`;
    }
    
    // Add technologies if available
    if (analysis?.stats?.technologies?.length > 0) {
      section += `**Technologies Detected**: ${analysis.stats.technologies.join(', ')}\n\n`;
    }
    
    // Add main implementation files with focus on file size and complexity
    if (analysis?.codebase?.mainFiles?.length > 0) {
      section += `**Main Implementation Files** (analyze for refactoring opportunities):\n`;
      section += analysis.codebase.mainFiles.slice(0, 20).map((f: any) => {
        const content = f.content || '';
        const lineCount = content.split('\n').length;
        const complexity = content.includes('useEffect') || content.includes('useState') || content.includes('class ') ? 'High' : 'Medium';
        
        return `\n### ${f.path} (${lineCount} lines, ${complexity} complexity)\n\`\`\`${f.type || 'text'}\n${content.slice(0, 1500)}\n\`\`\``;
      }).join('\n');
      section += '\n\n';
    }
    
    return section;
  };

  // Build existing tasks section for duplicate prevention
  const buildExistingTasksSection = () => {
    if (existingTasks.length === 0) {
      return '**Existing Tasks**: None\n\n';
    }
    
    let section = `**Existing Tasks** (DO NOT DUPLICATE):\n`;
    existingTasks.forEach((task, index) => {
      section += `\n${index + 1}. **${task.title}** (${task.type})\n`;
      section += `   - Status: ${task.status}\n`;
      section += `   - Description: ${task.description}\n`;
      section += `   - Agent: ${task.agent}\n`;
    });
    section += '\n';
    
    return section;
  };

  const prompt = `You are an expert software architect and code quality specialist. ${promptTemplate}

---

${buildAnalysisSection()}

${buildExistingTasksSection()}

---

Please analyze this project's code structure and generate exactly 5 NEW code optimization tasks that DO NOT duplicate any existing tasks listed above. Focus on specific refactoring opportunities that will improve maintainability, reduce complexity, and enhance code organization.

Pay special attention to:
1. Files with high line counts that could be split
2. Repeated code patterns that could be extracted
3. Complex components that mix multiple concerns
4. Performance optimization opportunities
5. Code structure improvements that enhance readability`;

  const result = await generateWithLLM(prompt, {
    provider: (provider as any) || DefaultProviderStorage.getDefaultProvider(),
    projectId,
    taskType: 'code_optimization_tasks',
    taskDescription: `Generate code optimization tasks for ${projectName}`,
    maxTokens: 2000,
    temperature: 0.7
  });

  if (!result.success || !result.response) {
    throw new Error(result.error || 'Failed to generate code tasks');
  }

  return result.response;
}