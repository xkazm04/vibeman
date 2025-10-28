import { generateWithLLM, DefaultProviderStorage } from '../../../lib/llm';
import { buildHighLevelDocsPrompt } from './lib/promptBuilder';

// Generate AI documentation review
export async function generateAIReview(projectName: string, analysis: any, projectId?: string, provider?: string, userVision?: string): Promise<string> {
  // Use the standardized high-level docs prompt
  const promptResult = buildHighLevelDocsPrompt(projectName, analysis, userVision);
  const prompt = promptResult.fullPrompt;

  /*
  // LEGACY PROMPT - Kept for reference
  // Old approach was too technical and implementation-focused
  const promptTemplate = `You are an expert software architect and technical reviewer. Analyze this repository and provide a comprehensive technical documentation following this EXACT structure:

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
  */

  // Use standardized LLM config from the prompt template
  const result = await generateWithLLM(prompt, {
    provider: (provider as any) || DefaultProviderStorage.getDefaultProvider(),
    projectId,
    taskType: 'ai_review',
    taskDescription: `Generate AI review for ${projectName}`,
    maxTokens: promptResult.llmConfig.maxTokens || 4000,
    temperature: promptResult.llmConfig.temperature || 0.7
  });

  if (!result.success || !result.response) {
    throw new Error(result.error || 'Failed to generate AI review');
  }

  return result.response;
}