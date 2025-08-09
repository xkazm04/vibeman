import { readFile } from 'fs/promises';
import { join } from 'path';

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

// Generate AI documentation review
export async function generateAIReview(projectName: string, analysis: any): Promise<string> {
  // Read the project prompt template
  let promptTemplate = '';
  try {
    const templatePath = join(process.cwd(), 'vibeman', 'src', 'app', 'projects', 'templates', 'project-prompt.md');
    promptTemplate = await readFile(templatePath, 'utf-8');
  } catch (error) {
    console.warn('Could not read project-prompt.md template, using fallback');
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
    let section = `## Project Analysis Data\\n\\n**Project Name**: ${projectName}\\n\\n`;
    
    // Add project structure if available
    if (analysis?.structure) {
      section += `**Project Structure**:\\n\\`\\`\\`\\n${JSON.stringify(analysis.structure, null, 2)}\\n\\`\\`\\`\\n\\n`;
    }
    
    // Add technologies if available
    if (analysis?.stats?.technologies?.length > 0) {
      section += `**Technologies Detected**: ${analysis.stats.technologies.join(', ')}\\n\\n`;
    }
    
    // Add configuration files if available
    if (analysis?.codebase?.configFiles?.length > 0) {
      section += `**Key Configuration Files**:\\n`;
      section += analysis.codebase.configFiles.map((f: any) => 
        `\\n### ${f.path}\\n\\`\\`\\`${f.type || 'text'}\\n${f.content || 'Content not available'}\\n\\`\\`\\``
      ).join('\\n');
      section += '\\n\\n';
    }
    
    // Add main implementation files if available
    if (analysis?.codebase?.mainFiles?.length > 0) {
      section += `**Main Implementation Files** (sample):\\n`;
      section += analysis.codebase.mainFiles.slice(0, 8).map((f: any) => 
        `\\n### ${f.path}\\n\\`\\`\\`${f.type || 'text'}\\n${(f.content || 'Content not available').slice(0, 1500)}\\n\\`\\`\\``
      ).join('\\n');
      section += '\\n\\n';
    }
    
    // Add documentation files if available
    if (analysis?.codebase?.documentationFiles?.length > 0) {
      section += `**Documentation Files**:\\n`;
      section += analysis.codebase.documentationFiles.map((f: any) => 
        `\\n### ${f.path}\\n\\`\\`\\`markdown\\n${(f.content || 'Content not available').slice(0, 2000)}\\n\\`\\`\\``
      ).join('\\n');
      section += '\\n\\n';
    }
    
    return section;
  };

  const prompt = `You are an expert software architect and code reviewer. ${promptTemplate}

---

${buildAnalysisSection()}

---

Please analyze this project data and provide your comprehensive review following the structure outlined above. Focus on actionable insights and be specific in your recommendations.`;

  return await callOllamaAPI(prompt);
}