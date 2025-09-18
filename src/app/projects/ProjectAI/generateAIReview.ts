import { readFile } from 'fs/promises';
import { join } from 'path';
import { generateWithLLM, DefaultProviderStorage, AnthropicClient, OpenAIClient, GeminiClient, OllamaClient } from '../../../lib/llm';
import { LLMRequest, LLMResponse, SupportedProvider } from '../../../lib/llm/types';



// Generate AI documentation review
export async function generateAIReview(projectName: string, analysis: any, projectId?: string, provider?: string): Promise<string> {
  // Read the project prompt template
  let promptTemplate = '';
  try {
    // Try multiple possible paths
    const possiblePaths = [
      join(process.cwd(), 'vibeman', 'src', 'app', 'projects', 'templates', 'project-prompt.md'),
      join(process.cwd(), 'src', 'app', 'projects', 'templates', 'project-prompt.md'),
      join(__dirname, '..', '..', 'templates', 'project-prompt.md'),
      join(__dirname, '..', '..', '..', 'templates', 'project-prompt.md')
    ];
    
    for (const templatePath of possiblePaths) {
      try {
        console.log(`Attempting to read project-prompt template from: ${templatePath}`);
        promptTemplate = await readFile(templatePath, 'utf-8');
        console.log(`Successfully read project-prompt.md template (${promptTemplate.length} characters)`);
        break;
      } catch (pathError) {
        console.log(`Path ${templatePath} failed:`, pathError.message);
        continue;
      }
    }
    
    if (!promptTemplate) {
      throw new Error('Could not find project-prompt.md in any of the expected locations');
    }
  } catch (error) {
    console.warn('Could not read project-prompt.md template, using fallback. Error:', error);
    promptTemplate = `Please conduct a thorough analysis of this repository and provide detailed insights on:

## 1. Application Overview
- Primary purpose and business domain
- Target users and use cases
- Core value proposition
- Architecture pattern (monolithic, microservices, etc.)

## 2. Technical Stack Analysis
- **Frontend**: Frameworks, UI libraries, state management, styling approach
- **Backend**: Language, framework, API design pattern (REST/GraphQL/etc.)
- **Database**: Type, ORM/query builders used
- **Infrastructure**: Deployment setup, CI/CD configuration
- **Third-party services**: External APIs, authentication providers, cloud services
- **Development tools**: Build tools, testing frameworks, linting/formatting

## 3. Feature Inventory by Domain
Group features into logical business domains or modules, for each include:
- Feature name and brief description
- Technical implementation approach
- Dependencies on other modules
- Apparent complexity level

## 4. Code Quality Assessment
- Design patterns observed
- Code organization and structure
- Testing coverage (unit, integration, e2e)
- Documentation quality
- Error handling approaches
- Security considerations visible in code

## 5. Improvement Opportunities
For each opportunity, specify:
- **Issue**: What needs improvement
- **Impact**: Why it matters (performance, maintainability, security, UX)
- **Suggestion**: Specific recommendation
- **Priority**: High/Medium/Low based on effort vs. benefit

## 6. Notable Observations
- Particularly well-implemented aspects
- Potential technical debt
- Scalability considerations
- Missing common features for this type of application

Please structure your response with clear headings and bullet points for readability.`;
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

  const prompt = `You are an expert software architect and code reviewer. ${promptTemplate}

---

${buildAnalysisSection()}

---

Please analyze this project data and provide your comprehensive review following the structure outlined above. Focus on actionable insights and be specific in your recommendations.`;

  const result = await generateWithLLM(prompt, {
    provider: (provider as any) || DefaultProviderStorage.getDefaultProvider(),
    projectId,
    taskType: 'ai_review',
    taskDescription: `Generate AI review for ${projectName}`,
    maxTokens: 4000,
    temperature: 0.7
  });

  if (!result.success || !result.response) {
    throw new Error(result.error || 'Failed to generate AI review');
  }

  return result.response;
}