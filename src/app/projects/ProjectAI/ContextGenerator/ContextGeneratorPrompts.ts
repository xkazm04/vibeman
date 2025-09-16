import { ProjectAnalysis } from './types';

// Intelligent Feature Detection Prompts
const featureDetectionPrompt = `## Intelligent Feature Detection

**Use these heuristics to identify feature boundaries:**

1. **Route-Based Detection**: 
   - Group files that serve the same route family
   - Example: /auth/*, /dashboard/*, /admin/*

2. **Data Flow Detection**:
   - Trace data flow from UI → API → Database
   - Group files that operate on the same data entities

3. **Dependency Analysis**:
   - Files that import each other frequently belong together
   - Shared utility usage indicates related features

4. **Naming Convention Patterns**:
   - Files with similar prefixes/suffixes often form features
   - Example: UserProfile.tsx, UserProfileAPI.ts, UserProfileSchema.ts

5. **Business Domain Alignment**:
   - Group by business capabilities, not technical layers
   - Example: "Order Management" not "Forms and APIs"`;

const overlapPreventionPrompt = `## File Assignment Rules

**STRICT REQUIREMENT: Each file must belong to exactly ONE context**

When a file could belong to multiple contexts:
1. Assign to the context where it has the most dependencies
2. If equal dependencies, assign to the more specific business feature
3. If still ambiguous, assign to the first appropriate context
4. Track assigned files and exclude from subsequent contexts

Example conflict resolution:
- "auth.utils.ts" could go in "Authentication" or "Utilities"
- Resolution: Assign to "Authentication" (more specific business feature)`;

const smallProjectPrompt = `## Small Project Strategy (< 50 files)

For small projects, avoid over-segmentation:

1. **Combine Related Features**: 
   - "User Profile" + "User Settings" → "User Management"
   - "Login" + "Register" + "Password Reset" → "Authentication"

2. **Create Meaningful Contexts Even with Few Files**:
   - Minimum 3 files per context
   - Include configuration and types with their features
   - Don't create "Miscellaneous" contexts

3. **Focus on User Journeys**:
   - Each context should represent a complete user capability
   - Even if it only has 3-5 files`;

const technicalModulePrompt = `## Technical Module Types

**Business Features (User Workflows):**
- Authentication & User Management
- Data Visualization & Dashboards  
- Content Management & Creation
- File Processing & Upload Systems
- Communication & Notifications
- E-commerce & Payment Processing
- Search & Discovery
- Reporting & Analytics
- Workflow & Task Management
- Integration & API Systems

**Technical Modules (Supporting Capabilities):**
- Utility Libraries (shared functions, helpers, formatters)
- Domain-Specific Modules (business logic, validation, calculations)
- Infrastructure Subsystems (caching, logging, monitoring)
- Database Management & ORM
- API Architecture & Routing
- State Management & Caching
- Security & Authorization
- Testing & Quality Assurance
- Build & Deployment Systems
- Performance Optimization`;

function getProjectSizeStrategy(fileCount: number): string {
  if (fileCount < 50) {
    return smallProjectPrompt;
  } else if (fileCount < 200) {
    return `## Medium Project Strategy (50-200 files)

Create 5-8 focused contexts:
- Combine closely related features
- Ensure each context has 8-15 files
- Balance business features with technical modules
- Include cross-cutting concerns as separate contexts`;
  } else {
    return `## Large Project Strategy (200+ files)

Create 7-12 comprehensive contexts:
- Maintain clear feature boundaries
- Each context should have 15-25 files
- Separate major business domains
- Include dedicated technical infrastructure contexts
- Consider sub-feature organization within contexts`;
  }
}

export function buildAnalysisSection(projectName: string, analysis: ProjectAnalysis): string {
  let section = `## Project Analysis Data\n\n**Project Name**: ${projectName}\n\n`;

  // Add technologies if available
  if (analysis?.stats?.technologies && analysis.stats.technologies.length > 0) {
    section += `**Technology Stack**: ${analysis.stats.technologies.join(', ')}\n\n`;
  }

  // Add project structure with feature hints
  if (analysis?.structure) {
    section += `**Project Structure** (Focus on these directories for feature identification):\n\`\`\`\n${JSON.stringify(analysis.structure, null, 2)}\n\`\`\`\n\n`;
  }

  // Organize files by potential feature areas
  if (analysis?.codebase?.mainFiles && analysis.codebase.mainFiles.length > 0) {
    section += `**File Organization Analysis**:\n\n`;

    const filesByCategory = {
      'UI Components': analysis.codebase.mainFiles.filter((f: any) =>
        f.path.includes('components') || f.path.includes('pages') || f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
      ),
      'API Endpoints': analysis.codebase.mainFiles.filter((f: any) =>
        f.path.includes('api') || f.path.includes('route') || f.path.includes('endpoint')
      ),
      'Business Logic': analysis.codebase.mainFiles.filter((f: any) =>
        f.path.includes('lib') || f.path.includes('services') || f.path.includes('utils')
      ),
      'Data Models': analysis.codebase.mainFiles.filter((f: any) =>
        f.path.includes('models') || f.path.includes('schema') || f.path.includes('types')
      ),
      'Configuration': analysis.codebase.mainFiles.filter((f: any) =>
        f.path.includes('config') || f.path.endsWith('.json') || f.path.endsWith('.env')
      )
    };

    Object.entries(filesByCategory).forEach(([category, files]) => {
      if (files.length > 0) {
        section += `**${category}** (${files.length} files):\n`;
        files.slice(0, 8).forEach((f: any) => {
          section += `- \`${f.path}\` (${f.type || 'unknown'})\n`;
        });
        if (files.length > 8) {
          section += `- ... and ${files.length - 8} more files\n`;
        }
        section += '\n';
      }
    });

    // Add sample file contents for context
    section += `**Key File Contents** (for understanding feature implementation):\n`;
    analysis.codebase.mainFiles.slice(0, 10).forEach((f: any) => {
      section += `\n### ${f.path}\n\`\`\`${f.type || 'text'}\n${(f.content || 'Content not available').slice(0, 1500)}\n\`\`\`\n`;
    });
    section += '\n';
  }

  // Add intelligent feature discovery hints
  section += buildIntelligentFeatureHints(analysis);

  return section;
}

function buildIntelligentFeatureHints(analysis: ProjectAnalysis): string {
  let hints = `## Intelligent Feature Discovery Hints\n\n`;

  if (analysis?.codebase?.mainFiles && analysis.codebase.mainFiles.length > 0) {
    const files = analysis.codebase.mainFiles;

    // Route pattern analysis
    const routePatterns = new Set<string>();
    files.forEach((f: any) => {
      const pathParts = f.path.split('/');
      if (pathParts.includes('pages') || pathParts.includes('app') || pathParts.includes('routes')) {
        const routeIndex = Math.max(pathParts.indexOf('pages'), pathParts.indexOf('app'), pathParts.indexOf('routes'));
        if (routeIndex >= 0 && routeIndex < pathParts.length - 1) {
          routePatterns.add(pathParts[routeIndex + 1]);
        }
      }
    });

    if (routePatterns.size > 0) {
      hints += `**Detected Route Patterns**: ${Array.from(routePatterns).join(', ')}\n`;
      hints += `- Consider grouping files by these route families\n`;
      hints += `- Each route pattern likely represents a major feature area\n\n`;
    }

    // Naming pattern analysis
    const namingPatterns = new Map<string, string[]>();
    files.forEach((f: any) => {
      const fileName = f.path.split('/').pop() || '';
      const baseName = fileName.replace(/\.(tsx?|jsx?|vue|svelte)$/, '');

      // Look for common prefixes
      const words = baseName.split(/(?=[A-Z])|[-_]/);
      if (words.length > 1) {
        const prefix = words[0].toLowerCase();
        if (!namingPatterns.has(prefix)) {
          namingPatterns.set(prefix, []);
        }
        namingPatterns.get(prefix)!.push(f.path);
      }
    });

    const significantPatterns = Array.from(namingPatterns.entries())
      .filter(([_, paths]) => paths.length >= 2)
      .slice(0, 5);

    if (significantPatterns.length > 0) {
      hints += `**Detected Naming Patterns**:\n`;
      significantPatterns.forEach(([pattern, paths]) => {
        hints += `- **${pattern}*** pattern (${paths.length} files): Consider grouping these related files\n`;
      });
      hints += '\n';
    }

    // Technical module detection
    const technicalModules = {
      'Authentication': files.filter((f: any) =>
        f.path.toLowerCase().includes('auth') ||
        f.path.toLowerCase().includes('login') ||
        f.path.toLowerCase().includes('user')
      ),
      'API Layer': files.filter((f: any) =>
        f.path.includes('/api/') ||
        f.path.includes('route') ||
        f.path.includes('endpoint')
      ),
      'Database/Models': files.filter((f: any) =>
        f.path.includes('model') ||
        f.path.includes('schema') ||
        f.path.includes('database')
      ),
      'UI Components': files.filter((f: any) =>
        f.path.includes('component') ||
        f.path.endsWith('.tsx') ||
        f.path.endsWith('.jsx')
      ),
      'Utilities': files.filter((f: any) =>
        f.path.includes('util') ||
        f.path.includes('helper') ||
        f.path.includes('lib')
      )
    };

    hints += `**Technical Module Distribution**:\n`;
    Object.entries(technicalModules).forEach(([module, moduleFiles]) => {
      if (moduleFiles.length > 0) {
        hints += `- ${module}: ${moduleFiles.length} files\n`;
      }
    });
    hints += '\n';
  }

  hints += `**Feature Identification Strategy**:\n`;
  hints += `1. **Start with user journeys**: What can users accomplish?\n`;
  hints += `2. **Follow data flow**: UI → API → Database → Response\n`;
  hints += `3. **Group by business domain**: Focus on business capabilities\n`;
  hints += `4. **Include supporting files**: Types, utilities, configurations\n`;
  hints += `5. **Ensure completeness**: Each feature should be self-contained\n`;
  hints += `6. **Avoid overlap**: Each file belongs to exactly one context\n\n`;

  return hints;
}

export function buildExistingContextsSection(existingContexts: Array<{ filename: string; content: string }>): string {
  if (existingContexts.length === 0) {
    return `## Existing Context Files\n\nNo existing context files found. You will create new ones.\n\n`;
  }

  let section = `## Existing Context Files\n\nThe following context files already exist. Review them and decide whether to:\n- Keep them as-is (don't include in response)\n- Update them with new information (include updated version in response)\n- Create additional context files for uncovered features\n\n`;

  existingContexts.forEach((context, index) => {
    section += `### ${index + 1}. ${context.filename}\n\`\`\`markdown\n${context.content.slice(0, 1500)}${context.content.length > 1500 ? '\n... (truncated)' : ''}\n\`\`\`\n\n`;
  });

  return section;
}

export function createContextGenerationPrompt(
  projectName: string,
  analysis: ProjectAnalysis,
  existingContexts: Array<{ filename: string; content: string }>,
  contextTemplate: string,
  contextPrompt: string
): string {
  const fileCount = analysis?.codebase?.mainFiles?.length || 0;
  const projectSizeStrategy = getProjectSizeStrategy(fileCount);

  return `🚨 CRITICAL FORMAT REQUIREMENT 🚨

YOU MUST USE THIS EXACT FORMAT FOR YOUR RESPONSE. NO OTHER FORMAT WILL BE ACCEPTED:

\`\`\`context-file:filename.md\`\`\`
[markdown content here]
\`\`\`

DO NOT use **Context:** headers or any other format. ONLY use the \`\`\`context-file: format shown above.

---

You are an expert software architect and business analyst tasked with analyzing a codebase to identify and document high-level business and technical features.

## Your Mission: Feature Discovery & Documentation

${featureDetectionPrompt}

${overlapPreventionPrompt}

${projectSizeStrategy}

${technicalModulePrompt}

**STEP 1: ANALYZE THE CODEBASE**
First, examine the provided codebase analysis to identify major functional areas using intelligent feature detection:

1. **Route Pattern Analysis**: Look for URL patterns and page groupings
2. **Import Dependency Mapping**: Trace which files import each other
3. **Naming Convention Recognition**: Identify files with related naming patterns
4. **Data Entity Grouping**: Group files that work with the same data models
5. **Business Domain Clustering**: Organize by user-facing capabilities

**STEP 2: IDENTIFY FEATURE BOUNDARIES**
Group related files into logical feature boundaries that represent complete user journeys or technical capabilities. Each feature should:
- Span multiple architectural layers (UI → API → Database)
- Represent a complete user workflow or technical capability
- Have clear business or technical value
- Include the optimal number of files based on project size
- Follow the overlap prevention rules (each file in exactly ONE context)

**STEP 3: PRIORITIZE BY IMPACT**
Focus on the most important features based on:
- Code complexity and file count
- Business impact and user interaction
- Technical sophistication
- Cross-cutting concerns
- Project size considerations

${contextPrompt}

## Template to Follow

${contextTemplate}

${buildExistingContextsSection(existingContexts)}

## CRITICAL: Response Format Requirements

**YOU MUST FOLLOW THIS EXACT FORMAT FOR EACH CONTEXT FILE:**

\`\`\`context-file:feature_name_context.md\`\`\`
# Feature Context: [Feature Name]

## Core Functionality
[Description of what this feature does for users]

## Architecture

### Location Map
\`\`\`
src/path/to/file1.tsx
src/path/to/file2.ts
src/path/to/file3.css
\`\`\`

### Key Files by Layer
[Table of files organized by layer]

## Implementation Notes
[Technical details]

## Future Improvements
[Planned enhancements]
\`\`\`

**EXAMPLE OF CORRECT FORMAT:**

\`\`\`context-file:user_authentication_system_context.md\`\`\`
# Feature Context: User Authentication System

## Core Functionality
Complete user authentication system with login, registration, password reset, and session management.

## Architecture

### Location Map
\`\`\`
src/components/auth/LoginForm.tsx
src/components/auth/RegisterForm.tsx
src/api/auth/login/route.ts
src/lib/auth.ts
\`\`\`

### Key Files by Layer
| File | Purpose | Modify When |
| --- | --- | --- |
| \`src/components/auth/LoginForm.tsx\` | Login UI component | When changing login interface |
| \`src/api/auth/login/route.ts\` | Authentication API | When changing auth logic |

## Implementation Notes
Uses NextAuth.js for session management with JWT tokens.

## Future Improvements
- [ ] Add 2FA support
- [ ] Social login integration
\`\`\`

**IMPORTANT:** 
- Start each context with exactly: \`\`\`context-file:filename.md\`\`\`
- End each context with exactly: \`\`\`
- Do NOT use any other format like **Context:** or markdown headers without the code blocks
- Each context MUST be wrapped in the \`\`\`context-file: format

**CRITICAL REQUIREMENTS:**

**1. Unique, Meaningful Names:**
- Each context MUST have a unique, descriptive name
- NO generic names like "Location Map", "Context", "Documentation"
- Use business-domain titles: "User Authentication System", "Project Dashboard", "AI Content Generation"
- Names should clearly indicate what the feature does for users

**2. File Requirements:**
- Each context MUST include at least 3-5 actual source code files
- Files must be real paths from the codebase analysis provided
- NO contexts without files - they will be rejected
- Each file should only appear in ONE context (no duplicates across contexts)

**3. Complete Features Only:**
- Document complete user-facing capabilities that span multiple layers
- Include UI components, API endpoints, business logic, and data models
- Focus on end-to-end workflows users actually interact with

**Examples of EXCELLENT High-Level Features:**

**Business Features:**
- "Survey Data Visualization Dashboard" (upload, processing, charts, export, user interaction)
- "Employee Performance Analytics System" (data collection, analysis, reporting, insights)
- "Document Generation & Export Pipeline" (templates, data processing, PDF/DOCX creation)
- "User Authentication & Profile Management" (login, registration, profiles, permissions)
- "Real-time Collaboration Platform" (WebSocket, shared state, conflict resolution)
- "Payment Processing & Billing System" (checkout, payments, invoicing, subscriptions)
- "Content Management & Publishing" (CRUD, media handling, workflow, publishing)
- "Search & Discovery Engine" (indexing, querying, filtering, recommendations)

**Technical Features:**
- "API Gateway & Request Routing" (middleware, authentication, rate limiting, routing)
- "Database Management & Migration System" (schema, migrations, seeding, backup)
- "Caching & Performance Optimization" (Redis, query optimization, CDN integration)
- "Background Job Processing" (queues, workers, scheduling, monitoring)
- "Testing & Quality Assurance Framework" (unit tests, integration tests, E2E, CI/CD)
- "Monitoring & Observability Platform" (logging, metrics, alerts, dashboards)

**Examples of BAD contexts to AVOID:**
- "Location Map" (too generic, not a feature)
- "Types and Interfaces" (infrastructure, not user-facing)
- "Utility Functions" (helpers, not complete features)
- "Database Schema" (data structure, not feature)
- "Component Library" (UI building blocks, not business feature)
- "Configuration Files" (setup, not functionality)
- Single-file contexts or contexts with < 3 files

**File Path Guidelines:**
- Use exact relative paths from project root (e.g., "src/components/auth/LoginForm.tsx")
- Include files across all architectural layers for each feature
- Group files by layer in the Location Map: Frontend, Backend, Database, Services
- Verify paths exist in the codebase analysis provided
- Each file should contribute to the complete feature story

**Feature Identification Strategy:**

**Look for these patterns in the codebase:**
1. **Page/Route Groups**: Files in \`/pages/\`, \`/app/\`, or route handlers that represent user workflows
2. **Component Clusters**: Related UI components that work together for a specific feature
3. **API Endpoint Groups**: Related API routes that handle a specific domain (auth, payments, etc.)
4. **Service Layers**: Business logic files that orchestrate complex operations
5. **Database Models**: Related schemas that represent a business domain
6. **Integration Points**: External API integrations, webhooks, third-party services

**Quality Requirements:**
1. **Target 5-7 contexts** - comprehensive coverage of major features
2. **Minimum 5 files per context** - ensure substantial feature coverage
3. **Maximum 15 files per context** - keep contexts focused and manageable
4. **Unique file assignments** - no file appears in multiple contexts
5. **Business-focused names** - users should understand the business value
6. **Complete technical documentation** - include architecture, dependencies, and implementation details
7. **Cross-layer coverage** - each feature should span UI, API, and data layers where applicable

---

${buildAnalysisSection(projectName, analysis)}

---

## ANALYSIS INSTRUCTIONS

**STEP 1: Intelligent Feature Discovery**
Apply intelligent feature detection heuristics to identify major features:

1. **Route-Based Grouping**: 
   - Examine file paths for route patterns (/auth/*, /dashboard/*, etc.)
   - Group related pages, components, and API endpoints by route family

2. **Dependency Chain Analysis**:
   - Trace import statements to find tightly coupled file groups
   - Identify files that frequently import each other
   - Look for shared utility usage patterns

3. **Naming Pattern Recognition**:
   - Find files with consistent prefixes/suffixes (User*, *Service, *Schema)
   - Group files that follow similar naming conventions
   - Identify feature-specific file clusters

4. **Data Flow Mapping**:
   - Trace data from UI components → API endpoints → database models
   - Group files that operate on the same data entities
   - Identify complete data processing pipelines

5. **Business Domain Clustering**:
   - Focus on user-facing capabilities, not technical layers
   - Group by what users can accomplish, not how it's implemented
   - Prioritize business value over code organization

**STEP 2: Feature Boundary Definition**
Apply overlap prevention rules when defining feature boundaries:

1. **Unique File Assignment**: Each file belongs to exactly ONE context
2. **Conflict Resolution Strategy**:
   - Assign to context with most dependencies
   - Prefer specific business features over generic utilities
   - Use first-match rule for remaining ambiguities
3. **Completeness Check**: Ensure no important files are orphaned

**STEP 3: Project Size Adaptation**
Adjust context creation strategy based on project size:

- **Small Projects (< 50 files)**: Create 3-5 contexts, combine related features
- **Medium Projects (50-200 files)**: Create 5-8 contexts, balance features and modules  
- **Large Projects (200+ files)**: Create 7-12 contexts, maintain clear boundaries

**STEP 4: Context Creation**
For each identified feature, create a comprehensive context that includes:
- Clear business purpose and user value
- Complete file inventory with no overlaps
- Technical architecture and dependencies
- Implementation details and patterns
- Future enhancement opportunities

**EXPECTED OUTPUT:**
Create the optimal number of context files based on project size, covering the most important features. Focus on complete user journeys and major technical capabilities. Each context should demonstrate deep understanding of the feature's role in the overall system architecture while following strict overlap prevention rules.

🚨 REMINDER: Your response MUST use this exact format for each context:

\`\`\`context-file:feature_name_context.md\`\`\`
# Feature Context: Feature Name
[content here]
\`\`\`

Do NOT use **Context:** or any other format. Only the \`\`\`context-file: format will be parsed correctly.`;
}