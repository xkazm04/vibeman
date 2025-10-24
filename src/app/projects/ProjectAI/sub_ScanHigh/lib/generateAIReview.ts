// This file has been moved to server-side API routes
// Client-side components should use the useGenerateAIDocs hook instead

export function generateAIReview() {
  throw new Error('generateAIReview has been moved to server-side API. Use useGenerateAIDocs hook instead.');
}

    
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
    promptTemplate = getStructuredPromptTemplate();
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

Please analyze this project data and provide your comprehensive review following the EXACT structure outlined above. Focus on actionable insights and be specific in your recommendations. Ensure your response follows the standardized format for easy parsing and evaluation by other AI systems.`;

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

/**
 * Structured prompt template for consistent AI documentation generation
 * This template ensures standardized output format for easy parsing and evaluation
 */
function getStructuredPromptTemplate(): string {
  return `Please conduct a thorough analysis of this repository and provide detailed insights following this EXACT structure:

# PROJECT ANALYSIS REPORT

## 🎯 APPLICATION OVERVIEW
**Purpose & Domain**: [Primary business purpose and domain]
**Target Users**: [Who uses this application]
**Core Value**: [Main value proposition]
**Architecture Pattern**: [Monolithic/Microservices/Serverless/etc.]

## 🛠️ TECHNICAL STACK
### Frontend
- **Framework**: [React/Vue/Angular/Next.js/etc.]
- **UI Library**: [Material-UI/Tailwind/Bootstrap/etc.]
- **State Management**: [Redux/Zustand/Context/etc.]
- **Styling**: [CSS/SCSS/Styled-components/etc.]

### Backend
- **Language**: [TypeScript/Python/Java/etc.]
- **Framework**: [Express/FastAPI/Spring/etc.]
- **API Pattern**: [REST/GraphQL/tRPC/etc.]

### Database & Storage
- **Database**: [PostgreSQL/MongoDB/MySQL/etc.]
- **ORM/Query**: [Prisma/TypeORM/Mongoose/etc.]
- **Caching**: [Redis/Memcached/etc.]

### Infrastructure & DevOps
- **Deployment**: [Vercel/AWS/Docker/etc.]
- **CI/CD**: [GitHub Actions/Jenkins/etc.]
- **Monitoring**: [Sentry/Analytics/etc.]

### Development Tools
- **Build Tools**: [Webpack/Vite/Next.js/etc.]
- **Testing**: [Jest/Cypress/Playwright/etc.]
- **Code Quality**: [ESLint/Prettier/TypeScript/etc.]

## 📋 FEATURE INVENTORY
### [Domain/Module Name 1]
- **Feature**: [Feature name] - [Brief description]
  - *Implementation*: [Technical approach]
  - *Dependencies*: [Other modules/services]
  - *Complexity*: [Low/Medium/High]

### [Domain/Module Name 2]
- **Feature**: [Feature name] - [Brief description]
  - *Implementation*: [Technical approach]
  - *Dependencies*: [Other modules/services]
  - *Complexity*: [Low/Medium/High]

[Continue for all major domains/modules]

## 🔍 CODE QUALITY ASSESSMENT
### Design Patterns
- [List observed patterns: MVC, Repository, Factory, etc.]

### Architecture & Organization
- **Structure**: [How code is organized]
- **Modularity**: [Level of module separation]
- **Reusability**: [Component/function reusability]

### Testing Strategy
- **Unit Tests**: [Coverage and approach]
- **Integration Tests**: [API/component testing]
- **E2E Tests**: [User flow testing]

### Security Considerations
- **Authentication**: [Method and implementation]
- **Authorization**: [Access control approach]
- **Data Protection**: [Input validation, sanitization]

### Error Handling
- **Strategy**: [Global/local error handling approach]
- **Logging**: [Error tracking and logging setup]

## 🚀 PERFORMANCE & SCALABILITY
### Current Performance
- **Bundle Size**: [Frontend optimization status]
- **API Response**: [Backend performance indicators]
- **Database**: [Query optimization status]

### Scalability Considerations
- **Horizontal Scaling**: [Multi-instance capability]
- **Vertical Scaling**: [Resource utilization efficiency]
- **Bottlenecks**: [Identified performance limitations]

## 📈 RECOMMENDATIONS
### Strengths
- [List 3-5 well-implemented aspects]

### Improvement Areas
- [List 3-5 potential improvements with specific suggestions]

### Missing Features
- [Common features for this app type that are missing]

### Technical Debt
- [Areas needing refactoring or modernization]

---
*This analysis provides a structured overview for technical decision-making and project planning.*`;
}