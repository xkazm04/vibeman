import { readFile } from 'fs/promises';
import { join } from 'path';
import { goalDb } from '../../../lib/database';
import { generateWithLLM, DefaultProviderStorage, AnthropicClient, OpenAIClient, GeminiClient, OllamaClient } from '../../../lib/llm';
import { LLMRequest, LLMResponse, SupportedProvider } from '../../../lib/llm/types';



// Helper function to read AI docs if available
async function readAIDocs(projectPath: string): Promise<string | null> {
  try {
    const aiDocsPath = join(projectPath, 'context', 'high.md');
    const aiDocsContent = await readFile(aiDocsPath, 'utf-8');
    return aiDocsContent;
  } catch (error) {
    console.log('AI docs not found at context/high.md, proceeding without them');
    return null;
  }
}

// Generate strategic goals
export async function generateGoals(projectName: string, projectId: string, analysis: any, projectPath?: string, provider?: string): Promise<string> {
  // Get existing goals to prevent duplicates
  const existingGoals = goalDb.getGoalsByProject(projectId);
  
  // Try to read AI docs if project path is provided
  let aiDocsContent: string | null = null;
  if (projectPath) {
    aiDocsContent = await readAIDocs(projectPath);
  }
  
  let promptTemplate = '';
  try {
    // Try multiple possible paths
    const possiblePaths = [
      join(process.cwd(), 'vibeman', 'src', 'app', 'projects', 'templates', 'project-goals.md'),
      join(process.cwd(), 'src', 'app', 'projects', 'templates', 'project-goals.md'),
      join(__dirname, '..', '..', 'templates', 'project-goals.md'),
      join(__dirname, '..', '..', '..', 'templates', 'project-goals.md')
    ];
    
    for (const templatePath of possiblePaths) {
      try {
        console.log(`Attempting to read project-goals template from: ${templatePath}`);
        promptTemplate = await readFile(templatePath, 'utf-8');
        console.log(`Successfully read project-goals.md template (${promptTemplate.length} characters)`);
        break;
      } catch (pathError) {
        console.log(`Path ${templatePath} failed:`, pathError.message);
        continue;
      }
    }
    
    if (!promptTemplate) {
      throw new Error('Could not find project-goals.md in any of the expected locations');
    }
  } catch (error) {
    console.warn('Could not read project-goals.md template, using fallback. Error:', error);
    promptTemplate = `Based on the repository analysis above, generate exactly 3 high-level strategic directions that would transform this application into a high-quality, market-competitive product. Focus on user-centric value creation and market differentiation rather than just technical improvements.

**CRITICAL: Avoid duplicating any existing goals that have already been generated for this project.**

Return the directions in strict JSON format following this schema:

\`\`\`json
[
  {
    "title": "string (2-5 words)",
    "description": [
      "Strategic initiative or capability to develop",
      "Key implementation milestone",
      "Additional strategic steps as needed"
    ],
    "type": "Business|Technical",
    "reason": "string (1-2 sentences explaining the market opportunity or competitive advantage)"
  }
]
\`\`\`

Selection criteria for strategic directions:
- Business Impact: Prioritize initiatives that could significantly expand user base, revenue potential, or market position
- User Value: Focus on transformative features that solve real user problems or create new opportunities
- Differentiation: Consider what would make this product stand out from competitors
- Scalability: Choose directions that enable growth and expansion
- Monetization: Include at least one direction that could improve revenue generation

Each direction should be:
- Ambitious but achievable within 3-6 months
- Aligned with modern market expectations and trends
- Focused on outcomes rather than just outputs
- Clear enough to guide multiple feature developments

Ensure the JSON is valid and parseable. Mark as "Business" if primarily about user experience, market positioning, or revenue. Mark as "Technical" if about platform capabilities, performance, or infrastructure that enables business goals.`;
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
    
    // Add documentation files if available
    if (analysis?.codebase?.documentationFiles?.length > 0) {
      section += `**Documentation Files**:\n`;
      section += analysis.codebase.documentationFiles.map((f: any) => 
        `\n### ${f.path}\n\`\`\`markdown\n${(f.content || 'Content not available').slice(0, 2000)}\n\`\`\``
      ).join('\n');
      section += '\n\n';
    }
    
    return section;
  };

  // Build existing goals section for duplicate prevention
  const buildExistingGoalsSection = () => {
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
  };

  // Build AI docs section if available
  const buildAIDocsSection = () => {
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
  };

  const prompt = `You are an expert product strategist and business analyst. ${promptTemplate}

---

${buildAIDocsSection()}

${buildAnalysisSection()}

${buildExistingGoalsSection()}

---

Please analyze this project data and generate exactly 3 NEW strategic directions that DO NOT duplicate any existing goals listed above. Focus on transformative business opportunities and competitive advantages that complement the existing strategic work.

${aiDocsContent ? 'IMPORTANT: Pay special attention to the AI-generated documentation above, which provides comprehensive insights into the application\'s current state, improvement opportunities, and technical assessment. Use these insights to create strategic goals that address the most impactful opportunities identified in the analysis.' : ''}`;

  const result = await generateWithLLM(prompt, {
    provider: (provider as any) || DefaultProviderStorage.getDefaultProvider(),
    projectId,
    taskType: 'strategic_goals',
    taskDescription: `Generate strategic goals for ${projectName}`,
    maxTokens: 2000,
    temperature: 0.8
  });

  if (!result.success || !result.response) {
    throw new Error(result.error || 'Failed to generate goals');
  }

  return result.response;
}