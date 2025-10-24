import { readFile } from 'fs/promises';
import { join } from 'path';
import { generateWithLLM, DefaultProviderStorage } from '../../../lib/llm';

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
    promptTemplate = `You are an expert software architect and technical reviewer. Analyze this repository and provide a comprehensive technical documentation following this EXACT structure:

# 📋 Application Overview

## Purpose & Domain
- **Primary Function**: [What does this application do?]
- **Business Domain**: [Industry/sector this serves]
- **Target Users**: [Who uses this application?]
- **Core Value**: [Main benefit/problem it solves]

## Architecture
- **Pattern**: [Monolithic/Microservices/Serverless/etc.]
- **Scale**: [Single user/Multi-tenant/Enterprise/etc.]
- **Deployment**: [Client-side/Server-side/Full-stack/etc.]

# 🛠️ Technical Stack

## Frontend Technologies
- **Framework**: [React/Vue/Angular/Next.js/etc.]
- **UI Library**: [Material-UI/Tailwind/Bootstrap/etc.]
- **State Management**: [Redux/Zustand/Context/etc.]
- **Styling**: [CSS-in-JS/SCSS/Tailwind/etc.]

## Backend Technologies  
- **Language**: [TypeScript/Python/Java/etc.]
- **Framework**: [Express/FastAPI/Spring/etc.]
- **API Pattern**: [REST/GraphQL/tRPC/etc.]
- **Authentication**: [JWT/OAuth/Session/etc.]

## Data Layer
- **Database**: [PostgreSQL/MongoDB/SQLite/etc.]
- **ORM/ODM**: [Prisma/Sequelize/Mongoose/etc.]
- **Caching**: [Redis/Memcached/In-memory/etc.]

## Infrastructure & DevOps
- **Hosting**: [Vercel/AWS/Docker/etc.]
- **CI/CD**: [GitHub Actions/Jenkins/etc.]
- **Monitoring**: [Sentry/LogRocket/etc.]

## Development Tools
- **Build**: [Webpack/Vite/Turbo/etc.]
- **Testing**: [Jest/Cypress/Playwright/etc.]
- **Linting**: [ESLint/Prettier/etc.]

# 🏗️ Features by Domain

## [Domain Name 1] (e.g., User Management)
- **[Feature Name]**: Brief description
  - *Implementation*: Technical approach used
  - *Dependencies*: What it relies on
  - *Complexity*: Low/Medium/High

## [Domain Name 2] (e.g., Content Management)  
- **[Feature Name]**: Brief description
  - *Implementation*: Technical approach used
  - *Dependencies*: What it relies on
  - *Complexity*: Low/Medium/High

# 📊 Code Quality Assessment

## Design Patterns
- **Patterns Used**: [MVC/MVVM/Repository/etc.]
- **Code Organization**: [Feature-based/Layer-based/etc.]
- **Separation of Concerns**: [Well/Partially/Poorly separated]

## Testing & Documentation
- **Test Coverage**: [Comprehensive/Partial/Minimal/None]
- **Test Types**: [Unit/Integration/E2E coverage]
- **Documentation**: [Excellent/Good/Basic/Missing]

## Code Health
- **Error Handling**: [Comprehensive/Basic/Inconsistent]
- **Security**: [Security measures observed]
- **Performance**: [Optimization techniques used]

# 🎯 Notable Observations

## Strengths
- [What is particularly well implemented?]
- [What follows best practices?]
- [What shows good architecture decisions?]

## Areas for Improvement
- [Technical debt identified]
- [Missing best practices]
- [Scalability concerns]

## Recommendations
- [Specific suggestions for improvement]
- [Missing features for this app type]
- [Performance optimization opportunities]

---
*Analysis complete. This structure ensures consistent, scannable technical documentation.*`;
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

  const prompt = `${promptTemplate}

---

${buildAnalysisSection()}

---

IMPORTANT: Follow the EXACT structure above with all headings and subheadings. Replace bracketed placeholders [like this] with actual information. Use bullet points and clear formatting. Be specific and actionable in your recommendations.`;

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