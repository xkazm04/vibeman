/**
 * Section builder functions for goals generation prompts
 * Constructs different sections of the LLM prompt from project data
 */

import { DbGoal } from '../../../../../lib/database';

/**
 * Build the project analysis data section
 */
export function buildAnalysisSection(projectName: string, analysis: any): string {
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

  // Add documentation files if available
  if (analysis?.codebase?.documentationFiles?.length > 0) {
    section += `**Documentation Files**:\n`;
    section += analysis.codebase.documentationFiles.map((f: any) =>
      `\n### ${f.path}\n\`\`\`markdown\n${(f.content || 'Content not available').slice(0, 2000)}\n\`\`\``
    ).join('\n');
    section += '\n\n';
  }

  return section;
}

/**
 * Build the existing goals section for duplicate prevention
 */
export function buildExistingGoalsSection(existingGoals: DbGoal[]): string {
  if (existingGoals.length === 0) {
    return '**Existing Goals**: None\n\n';
  }

  let section = `**Existing Goals** (DO NOT DUPLICATE):\n`;
  existingGoals.forEach((goal, index) => {
    section += `\n${index + 1}. **${goal.title}** (${goal.status})\n`;
    section += `   - Description: ${goal.description || 'No description'}\n`;
    section += `   - Created: ${new Date(goal.created_at).toLocaleDateString()}\n`;
  });
  section += '\n';

  return section;
}

/**
 * Build the AI documentation section if available
 */
export function buildAIDocsSection(aiDocsContent: string | null): string {
  if (!aiDocsContent) {
    return '';
  }

  return `## AI-Generated Project Documentation

The following comprehensive analysis was previously generated for this project and contains valuable insights about:
- Application overview and business domain
- Technical stack analysis and architecture
- Feature inventory by domain
- Code quality assessment
- Improvement opportunities and recommendations
- Notable observations and technical debt

**AI Documentation Content:**
\`\`\`markdown
${aiDocsContent.slice(0, 8000)} ${aiDocsContent.length > 8000 ? '... [truncated for length]' : ''}
\`\`\`

This documentation provides deep context about the current state of the application, its strengths, weaknesses, and potential areas for strategic improvement. Use this information to inform your strategic goal recommendations.

---

`;
}
