/**
 * Production Quality Scan Prompt Builder
 *
 * Builds the prompt for checking production readiness issues:
 * - Hardcoded URLs, credentials, secrets
 * - Unhandled exceptions that could crash the server
 * - Security vulnerabilities (XSS, injection, CSRF)
 * - Missing error boundaries and fallbacks
 * - Development-only code left in production
 * - Resource leaks and memory issues
 * - Missing input validation
 *
 * Uses shared baseScanPrompt infrastructure for consistent Direction generation.
 */

import {
  buildBaseScanPrompt,
  parseBaseScanSummary,
  categorizeFiles,
  detectPatterns,
  type BaseScanPromptOptions,
  type ScanSpecificContent,
  type ContextGroupInfo,
} from './baseScanPrompt';

export interface ProductionScanPromptOptions {
  groupName: string;
  groupId: string;
  projectId: string;
  projectPath: string;
  filePaths: string[];
  autoFix?: boolean;
  apiBaseUrl?: string;
  contextGroupInfo?: ContextGroupInfo;
}

/**
 * Build the production quality scan prompt for Claude Code CLI
 * Uses shared base infrastructure for consistent Direction generation
 */
export function buildProductionScanPrompt({
  groupName,
  groupId,
  projectId,
  projectPath,
  filePaths,
  autoFix = true,
  apiBaseUrl = 'http://localhost:3000',
  contextGroupInfo,
}: ProductionScanPromptOptions): string {
  // Build context group info from file paths if not provided
  const effectiveContextGroupInfo: ContextGroupInfo = contextGroupInfo || {
    filesByCategory: categorizeFiles(filePaths),
    detectedPatterns: detectPatterns(filePaths),
  };

  const baseOptions: BaseScanPromptOptions = {
    scanType: 'production',
    groupName,
    groupId,
    projectId,
    projectPath,
    filePaths,
    apiBaseUrl,
    contextGroupInfo: effectiveContextGroupInfo,
  };

  const immediateActionsSection = `
## CRITICAL: You MUST use the Edit tool to fix production issues

For each file, you MUST:
1. Read the file using the Read tool
2. Identify production quality issues
3. USE THE EDIT TOOL to fix each issue immediately
4. Move to the next file

### Issue Categories - FIX THESE NOW

${autoFix ? `
#### 1. Hardcoded URLs and Endpoints → USE EDIT TOOL TO FIX
When you find hardcoded URLs, API endpoints, or base URLs:
- Replace with environment variables or config references
- For Next.js: use \`process.env.NEXT_PUBLIC_*\` for client, \`process.env.*\` for server
- For API base URLs: extract to constants file or env var

**Example fix:**
\`\`\`
OLD: fetch('http://localhost:3000/api/users')
NEW: fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/api/users\`)

OLD: const API_URL = 'https://api.production.com';
NEW: const API_URL = process.env.API_BASE_URL || 'http://localhost:3000';
\`\`\`

#### 2. Exposed Secrets and Credentials → USE EDIT TOOL TO REMOVE/REPLACE
When you find hardcoded secrets, API keys, passwords, or tokens:
- IMMEDIATELY replace with environment variable references
- Remove any commented-out credentials
- Flag for security review

**Example fix:**
\`\`\`
OLD: const API_KEY = 'sk-abc123secretkey';
NEW: const API_KEY = process.env.API_KEY!;

OLD: // password: 'admin123'
NEW: // [REMOVED - security]
\`\`\`

#### 3. Unhandled Promise Rejections → USE EDIT TOOL TO ADD TRY/CATCH
When you find async operations without error handling:
- Wrap in try/catch blocks
- Add appropriate error logging
- Ensure graceful degradation

**Example fix:**
\`\`\`
OLD:
const data = await fetch(url);
return data.json();

NEW:
try {
  const data = await fetch(url);
  return data.json();
} catch (error) {
  console.error('Failed to fetch data:', error);
  throw error; // or return fallback
}
\`\`\`

#### 4. Missing Input Validation → USE EDIT TOOL TO ADD VALIDATION
When you find user input used directly without validation:
- Add type checking
- Add sanitization for strings
- Add bounds checking for numbers

**Example fix:**
\`\`\`
OLD:
export async function POST(req) {
  const { email } = await req.json();
  await sendEmail(email);
}

NEW:
export async function POST(req) {
  const { email } = await req.json();
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  await sendEmail(email);
}
\`\`\`

#### 5. Development Code in Production → USE EDIT TOOL TO REMOVE
When you find development-only code that shouldn't be in production:
- Remove or wrap in development-only conditionals
- Remove test data and mocks
- Remove debug endpoints

**Example fix:**
\`\`\`
OLD:
// TODO: remove before production
console.log('DEBUG USER:', user);
if (true) { // bypass auth for testing
  return user;
}

NEW:
// Auth check
if (!isAuthenticated(user)) {
  throw new Error('Unauthorized');
}
return user;
\`\`\`

#### 6. Resource Leaks → USE EDIT TOOL TO ADD CLEANUP
When you find resources that aren't properly cleaned up:
- Add cleanup in useEffect return
- Close connections and streams
- Clear intervals and timeouts

**Example fix:**
\`\`\`
OLD:
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
}, []);

NEW:
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);
}, []);
\`\`\`

#### 7. XSS Vulnerabilities → USE EDIT TOOL TO SANITIZE
When you find dangerouslySetInnerHTML or unsanitized user content:
- Use DOMPurify or similar sanitization
- Prefer text content over HTML injection
- Escape special characters

**Example fix:**
\`\`\`
OLD:
<div dangerouslySetInnerHTML={{ __html: userContent }} />

NEW:
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
// Or better: <div>{userContent}</div>
\`\`\`
` : `
**AUTO-FIX IS DISABLED** - Only analyze and report issues.
`}

#### 8. Error Boundaries Missing (REPORT ONLY)
- Note React components without error boundaries for the summary

#### 9. Rate Limiting Missing (REPORT ONLY)
- Note API routes without rate limiting for the summary

#### 10. Logging Sensitive Data (REPORT ONLY)
- Note where sensitive data might be logged for the summary

### Execution Flow

1. **For each file in the list:**
   - Read the file
   - Scan for production quality issues
   - FIX EACH ISSUE IMMEDIATELY using the Edit tool
   - Count what you found and fixed

2. **Track your progress:**
   - Count issues found per category
   - Count issues fixed per category
   - Note any that require manual review

3. **After all files are processed:**
   - Generate strategic Directions if opportunities found
   - Output the final JSON summary`;

  const content: ScanSpecificContent = {
    title: 'Production Quality Scan',
    missionPart1: 'Immediate Fixes: Fix production issues (hardcoded URLs, secrets, unhandled errors, XSS)',
    missionPart2: 'Strategic Directions: Identify security and reliability improvements needing dedicated sessions',
    immediateActionsSection,
    directionCategories: [
      { name: 'Security Hardening', description: 'Systematic improvements to authentication, authorization, input validation, and data protection' },
      { name: 'Error Handling Architecture', description: 'Comprehensive error boundary system, fallback UI, error reporting, and graceful degradation' },
      { name: 'Environment Configuration', description: 'Proper environment-based configuration, feature flags, and deployment-specific settings' },
      { name: 'API Security', description: 'Rate limiting, CORS configuration, request validation, and API authentication improvements' },
      { name: 'Data Protection', description: 'Encryption at rest/transit, PII handling, audit logging, and compliance requirements' },
      { name: 'Observability', description: 'Structured logging, metrics, tracing, and health checks for production monitoring' },
    ],
    excellentDirections: [
      'Implement centralized environment configuration with validation and type safety',
      'Build comprehensive API security layer with rate limiting, CORS, and request validation',
      'Create error handling architecture with boundaries, reporting, and user-friendly fallbacks',
      'Implement secrets management integration (Vault, AWS Secrets Manager, etc.)',
      'Build observability infrastructure with structured logging, metrics, and alerting',
    ],
    badDirections: [
      'Add error handling (too vague)',
      'Fix security issue (not specific)',
      'Improve validation (needs context)',
      'Add logging (too small scope)',
    ],
    whenToGenerateCriteria: [
      'Multiple hardcoded values that need centralized configuration',
      'Repeated error handling patterns that need standardization',
      'Missing security layer that affects multiple endpoints',
      'Observability gaps that prevent effective production monitoring',
      'Compliance requirements that need systematic implementation',
    ],
    maxDirections: '0-3',
    directionMarkdownSections: `## Vision
What this production improvement achieves and why it matters for reliability/security.

## Risk Addressed
- What could go wrong without this
- Impact on users and business

## Scope
What's included and what's explicitly out of scope.

## Components to Implement
1. Component 1 - what it does
2. Component 2 - what it does

## Technical Approach
Step-by-step implementation strategy.

## Files to Modify
- \`path/to/file1.ts\` - change description
- \`path/to/file2.tsx\` - change description

## Testing Strategy
How to verify the improvements work correctly.

## Rollout Plan
How to safely deploy these changes.

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2`,
    summaryJsonExample: `{
  "filesScanned": <number>,
  "filesFixed": <number>,
  "issues": {
    "hardcodedUrls": { "found": <n>, "fixed": <n> },
    "exposedSecrets": { "found": <n>, "fixed": <n> },
    "unhandledErrors": { "found": <n>, "fixed": <n> },
    "missingValidation": { "found": <n>, "fixed": <n> },
    "devCodeInProd": { "found": <n>, "fixed": <n> },
    "resourceLeaks": { "found": <n>, "fixed": <n> },
    "xssVulnerabilities": { "found": <n>, "fixed": <n> },
    "missingErrorBoundaries": { "found": <n>, "fixed": <n> },
    "missingRateLimiting": { "found": <n>, "fixed": <n> },
    "sensitiveDataLogging": { "found": <n>, "fixed": <n> }
  },
  "directionsGenerated": <number>
}`,
  };

  return buildBaseScanPrompt(baseOptions, content);
}

/**
 * Production scan summary structure
 */
export interface ProductionScanSummary {
  filesScanned: number;
  filesFixed: number;
  issues: {
    hardcodedUrls: { found: number; fixed: number };
    exposedSecrets: { found: number; fixed: number };
    unhandledErrors: { found: number; fixed: number };
    missingValidation: { found: number; fixed: number };
    devCodeInProd: { found: number; fixed: number };
    resourceLeaks: { found: number; fixed: number };
    xssVulnerabilities: { found: number; fixed: number };
    missingErrorBoundaries: { found: number; fixed: number };
    missingRateLimiting: { found: number; fixed: number };
    sensitiveDataLogging: { found: number; fixed: number };
  };
  directionsGenerated: number;
}

/**
 * Parse production scan output to extract summary
 */
export function parseProductionScanSummary(output: string): ProductionScanSummary | null {
  return parseBaseScanSummary<ProductionScanSummary>(output);
}
