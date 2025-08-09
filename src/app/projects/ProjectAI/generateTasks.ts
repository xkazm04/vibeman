import { readFile } from 'fs/promises';
import { join } from 'path';
import { backlogDb } from '../../../lib/database';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'gpt-oss:20b';

async function callOllamaAPI(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result.response;
  } catch (error) {
    console.error('Failed to call Ollama API:', error);
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate implementation tasks
export async function generateTasks(projectName: string, projectId: string, analysis: any): Promise<string> {
  // Get existing tasks to prevent duplicates
  const existingTasks = backlogDb.getBacklogItemsByProject(projectId);
  
  let promptTemplate = '';
  try {
    // Try multiple possible paths
    const possiblePaths = [
      join(process.cwd(), 'vibeman', 'src', 'app', 'projects', 'templates', 'project-tasks.md'),
      join(process.cwd(), 'src', 'app', 'projects', 'templates', 'project-tasks.md'),
      join(__dirname, '..', '..', 'templates', 'project-tasks.md'),
      join(__dirname, '..', '..', '..', 'templates', 'project-tasks.md')
    ];
    
    for (const templatePath of possiblePaths) {
      try {
        console.log(`Attempting to read project-tasks template from: ${templatePath}`);
        promptTemplate = await readFile(templatePath, 'utf-8');
        console.log(`Successfully read project-tasks.md template (${promptTemplate.length} characters)`);
        break;
      } catch (pathError) {
        console.log(`Path ${templatePath} failed:`, pathError.message);
        continue;
      }
    }
    
    if (!promptTemplate) {
      throw new Error('Could not find project-tasks.md in any of the expected locations');
    }
  } catch (error) {
    console.warn('Could not read project-tasks.md template, using fallback. Error:', error);
    promptTemplate = `Based on the repository analysis above, generate exactly 5 implementation tasks that would provide the most value to this application. Consider the identified improvement opportunities, missing features, and technical debt.

**CRITICAL: Avoid duplicating any existing tasks that have already been generated for this project.**

Return the tasks in strict JSON format following this schema:

\`\`\`json
[
  {
    "title": "string (2-5 words)",
    "description": [
      "Step or component to implement",
      "Another implementation step",
      "Additional steps as needed"
    ],
    "type": "Feature|Optimization",
    "reason": "string (1-2 sentences explaining the business or technical value)"
  }
]
\`\`\`

Selection criteria for tasks:
- Prioritize high-impact improvements that address critical issues
- Balance between new features and optimizations
- Consider implementation feasibility and dependencies
- Focus on tasks that improve user experience, performance, or maintainability
- Avoid breaking changes unless absolutely necessary

Ensure the JSON is valid and parseable. Include a mix of task types if possible. Each description should have 3-5 concrete implementation points that a developer could follow.`;
  }

  // Build the analysis data section with safe fallbacks
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
    
    // Add configuration files if available
    if (analysis?.codebase?.configFiles?.length > 0) {
      section += `**Key Configuration Files**:\n`;
      section += analysis.codebase.configFiles.map((f: any) => 
        `\n### ${f.path}\n\`\`\`${f.type || 'text'}\n${f.content || 'Content not available'}\n\`\`\``
      ).join('\n');
      section += '\n\n';
    }
    
    // Add main implementation files if available
    if (analysis?.codebase?.mainFiles?.length > 0) {
      section += `**Main Implementation Files** (sample):\n`;
      section += analysis.codebase.mainFiles.slice(0, 8).map((f: any) => 
        `\n### ${f.path}\n\`\`\`${f.type || 'text'}\n${(f.content || 'Content not available').slice(0, 1500)}\n\`\`\``
      ).join('\n');
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

  const prompt = `You are an expert software architect and project manager. ${promptTemplate}

---

${buildAnalysisSection()}

${buildExistingTasksSection()}

---

Please analyze this project data and generate exactly 5 NEW implementation tasks that DO NOT duplicate any existing tasks listed above. Focus on actionable, high-value improvements that complement the existing work.`;

  return await callOllamaAPI(prompt);
}