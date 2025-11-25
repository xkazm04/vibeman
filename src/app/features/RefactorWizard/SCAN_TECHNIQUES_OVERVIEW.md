# RefactorWizard - Scan Techniques Overview

> **Technical Reference for Static Analysis Capabilities**
>
> This document provides detailed explanations of each scan technique used by the RefactorWizard module. Use this as a reference when fine-tuning or extending scan capabilities.

---

## Table of Contents

1. [Detection Architecture](#detection-architecture)
2. [Code Quality & Standards](#code-quality--standards)
3. [Code Maintainability](#code-maintainability)
4. [Security & Error Handling](#security--error-handling)
5. [React & Component Patterns](#react--component-patterns)
6. [Performance Optimization](#performance-optimization)
7. [Architecture & Design](#architecture--design)
8. [Testing & Coverage](#testing--coverage)
9. [Technology-Specific Enhancements](#technology-specific-enhancements)

---

## Detection Architecture

RefactorWizard employs a **hybrid detection approach** that combines three complementary strategies to maximize accuracy and coverage:

### 1. Pattern-Based Detection (`patternDetectors.ts`)
Pattern-based detection uses regex matching and heuristic algorithms to identify code smells through syntactic analysis. This approach scans file content line-by-line, looking for specific patterns such as console statements (`/console\.(log|warn|error)/`), TypeScript any types (`/:\s*any\b/`), or function signatures exceeding line count thresholds. The advantage of pattern-based detection is speed and deterministic behavior—it can process hundreds of files in seconds with zero API costs. However, it's limited to surface-level analysis and may produce false positives when context matters (e.g., flagging legitimate `any` types in type guards).

### 2. Strategy-Based Detection (`ScanStrategy.ts` + technology strategies)
Strategy-based detection implements a plugin architecture where each technology stack (Next.js, FastAPI, Express, React Native) has its own specialized scanner that understands framework-specific patterns and best practices. For example, the Next.js strategy (`NextJSScanStrategy.ts`) checks for App Router vs Pages Router patterns, detects mixing of 'use client' with server-only APIs, and identifies opportunities to use next/image instead of HTML `<img>` tags. Each strategy extends `BaseScanStrategy` and implements `detectOpportunities()`, which orchestrates checks across different concern areas (code quality, maintainability, performance, etc.) while respecting user-selected scan groups for filtering.

### 3. AI-Powered Analysis (`aiAnalyzer.ts`)
AI-powered analysis leverages large language models (default: Gemini 2.0 Flash) to perform deep semantic analysis that goes beyond syntactic patterns. The analyzer batches files into groups of 5, constructs prompts with project context (tech stack, priorities, conventions), and requests structured JSON responses identifying architectural issues, performance bottlenecks, security vulnerabilities, and maintainability concerns. The AI can understand complex code relationships like tight coupling, identify anti-patterns that pattern matching would miss, and provide nuanced recommendations. Results are deduplicated using a hash-based approach (category + files + description prefix) to remove redundant findings from overlapping pattern and AI detections.

---

## Code Quality & Standards

### 1. Console Statements
**Detector**: `detectConsoleStatements()` | **Category**: code-quality | **Priority**: 10

This technique scans files for debugging statements like `console.log()`, `console.warn()`, `console.error()`, `console.info()`, and `console.debug()` that were likely added during development but shouldn't exist in production code. The detector uses a simple regex pattern `/console\.(log|warn|error|info|debug)/` to match console method calls on any line, recording the line numbers where they occur. When found, it creates low-severity opportunities suggesting removal or replacement with proper logging infrastructure (like Winston, Pino, or structured application logging). This check is fast, deterministic, and typically auto-fixable through automated removal or replacement with a logging facade.

### 2. Any Types
**Detector**: `detectAnyTypes()` | **Category**: code-quality | **Priority**: 10

TypeScript's `any` type effectively disables type checking and defeats the purpose of using TypeScript in the first place. This detector searches for explicit `: any` type annotations using the regex pattern `/:\s*any\b/`, flagging each occurrence with its line number. It identifies cases where developers have opted out of type safety, either due to complexity, time constraints, or lack of proper type definitions. The detector creates medium-severity opportunities recommending proper type definitions, union types, generics, or `unknown` (which is type-safe unlike `any`). While not typically auto-fixable (requires understanding context to create proper types), these issues are critical for long-term code quality and catching bugs at compile time rather than runtime.

### 3. Unused Imports
**Detector**: `detectUnusedImports()` | **Category**: code-quality | **Priority**: 10

This heuristic-based detector identifies import statements where none of the imported identifiers appear to be used elsewhere in the file. It parses import statements (handling default imports, named imports, and namespace imports including "as" aliases), extracts the imported names, and checks whether each appears in subsequent lines using regex-based usage detection. If no usages are found for any import from a statement, that line is flagged. The detector handles complex syntax like `import { foo as bar }` by checking for the alias (`bar`) rather than the original name. While prone to false positives (e.g., imports used in type annotations only, or conditional imports), it effectively identifies obvious unused dependencies that bloat bundle sizes and create maintenance confusion. These issues are typically auto-fixable and categorized as low-severity with minimal time investment (10-15 minutes per file).

### 4. Missing Type Definitions
**Detector**: Various checks in strategies | **Category**: code-quality | **Priority**: 10

This technique identifies functions, methods, and variables that lack explicit TypeScript type annotations, particularly for return types and parameters. While TypeScript can infer types in many cases, explicit annotations improve code documentation, catch errors earlier, and make refactoring safer. The detection logic varies by strategy but generally looks for function declarations without `: ReturnType` annotations, arrow functions with inferred returns, and parameters without type constraints. The severity escalates for public APIs and exported functions where explicit contracts are crucial for consumers. Fixing these issues requires analyzing the actual runtime behavior and data flow to determine appropriate types, making automation challenging but not impossible with AI assistance.

---

## Code Maintainability

### 5. Large Files
**Detector**: `checkLargeFile()` in strategies | **Category**: maintainability | **Priority**: 9

Large files (typically >500 lines, critically >1000 lines) violate the Single Responsibility Principle and become difficult to navigate, understand, and maintain. This detector simply checks the line count of each file and flags those exceeding thresholds. The check is performed during the file scanning phase where line counts are already computed. Large files often indicate that multiple concerns are bundled together—for example, a single component file containing multiple sub-components, business logic, API calls, and utility functions. The recommended fix is to split the file into smaller, focused modules: extract sub-components, move utilities to separate files, separate concerns like data fetching from presentation. This refactoring requires significant effort (2-4 hours) and careful analysis to maintain functionality, but dramatically improves code organization and team productivity.

### 6. Code Duplication
**Detector**: `detectDuplication()` | **Category**: maintainability | **Priority**: 9

Duplicated code is a maintenance nightmare—bug fixes and feature changes must be applied in multiple places, leading to inconsistencies and errors. This detector finds duplication by analyzing consecutive 3-line blocks of code: it creates a sliding window through the file, extracts each 3-line block (trimmed), and stores them in a Map with their line positions. If the same block appears multiple times (and exceeds 30 characters to filter trivial matches), those lines are flagged. While this simple approach misses semantically similar code with minor syntactic differences and can't detect duplication across files, it's remarkably effective at finding copy-pasted code blocks. The recommended fix is to extract the duplicated logic into reusable functions, custom hooks (for React), or utility modules, which improves maintainability and creates opportunities for additional abstraction.

### 7. Long Functions
**Detector**: `detectLongFunctions()` | **Category**: maintainability | **Priority**: 9

Functions exceeding 50 lines typically do too much and should be broken into smaller, more focused functions. This detector identifies long functions by parsing the code for function declarations (including traditional `function` syntax, const/arrow functions, and method definitions), tracking brace depth to determine function boundaries, and calculating the line span between start and end. When a function exceeds 50 lines and its closing brace is detected (brace count returns to zero), the starting line is recorded. Long functions are harder to test (requiring complex setup and multiple test cases), difficult to understand (too much cognitive load), and often have hidden responsibilities that should be separated. Refactoring involves analyzing the function's logic, identifying distinct concerns or steps, and extracting them into well-named helper functions with clear inputs/outputs.

### 8. Complex Conditionals
**Detector**: `checkComplexConditionals()` (pattern-based) | **Category**: maintainability | **Priority**: 9

Deeply nested if-else statements create cognitive complexity and make code difficult to reason about—they force readers to mentally track multiple levels of conditional state simultaneously. This technique looks for nesting depth beyond reasonable levels (typically 3+ levels) and complex boolean expressions with multiple AND/OR operators. Detection involves tracking indentation levels, counting consecutive if-else chains, and analyzing conditional expressions for compound logic. Common anti-patterns include nested validation checks (should use guard clauses), complex state machines (should be extracted), and business rule evaluation (should use strategy patterns or lookup tables). Recommended fixes include early returns/guard clauses, extracting conditions into well-named boolean variables or functions, using polymorphism or strategy patterns, or simplifying logic through truth tables.

### 9. Magic Numbers
**Detector**: `checkMagicNumbers()` (pattern-based) | **Category**: maintainability | **Priority**: 9

Magic numbers are hardcoded numeric literals scattered throughout code without explanation of their meaning or purpose (e.g., `if (status === 200)` or `setTimeout(fn, 3600000)`). This detector uses regex patterns to find numeric literals that aren't obvious (0, 1, -1 are typically ignored) and aren't already assigned to named constants. Each occurrence is flagged with its line number and context. Magic numbers make code harder to understand (what does 3600000 mean?), difficult to maintain (changing a value requires finding all occurrences), and error-prone (typos or mismatches across files). The recommended fix is to extract numbers into named constants with descriptive names (`const ONE_HOUR_MS = 3600000`, `const HTTP_OK = 200`), preferably in a constants file or at the top of the module, which documents intent and centralizes configuration values.

---

## Security & Error Handling

### 10. Missing Error Handling
**Detector**: `checkMissingErrorHandling()` (pattern + AI) | **Category**: security | **Priority**: 10

Asynchronous functions without try-catch blocks or error handling can crash applications or leave them in inconsistent states when promises reject. This detector identifies async functions, async arrow functions, and functions returning promises, then checks whether their body contains try-catch blocks, .catch() chains, or error handling middleware. The analysis considers both explicit error handling (try-catch) and implicit handling (promise chaining with .catch()). Functions without any error handling mechanism are flagged as high-severity issues. Unhandled promise rejections can expose sensitive error information to users, cause silent failures in production, or crash Node.js processes (prior to more recent versions that warn but don't crash). The fix involves wrapping risky operations in try-catch blocks, using .catch() handlers on promise chains, or implementing error boundaries (in React) and global error handlers (in APIs).

### 11. Hardcoded Credentials
**Detector**: `checkHardcodedCredentials()` (pattern + AI) | **Category**: security | **Priority**: 10

Hardcoded secrets, API keys, passwords, and tokens in source code represent critical security vulnerabilities—they can be discovered through source code leaks, git history, or by attackers with read access to the repository. This detector uses pattern matching to find suspicious variable names (password, secret, apiKey, token, credential) combined with string assignment patterns, as well as common API key formats (AWS keys, JWT tokens, database connection strings with credentials). The AI-powered component can identify more subtle cases where secrets are constructed or obfuscated. Each finding is marked as critical severity because exposure could lead to unauthorized access, data breaches, or financial loss. The recommended fix is to move all secrets to environment variables (.env files), secret management systems (AWS Secrets Manager, HashiCorp Vault), or secure configuration services, and use gitignore to prevent accidental commits.

### 12. API Error Handling
**Detector**: `checkApiErrorHandling()` (strategy-specific) | **Category**: security | **Priority**: 10

API routes and endpoints without proper error handling can leak sensitive information through stack traces, expose internal system details, return inconsistent responses, or crash the server. This detector examines API route files (e.g., Next.js route handlers, Express routes, FastAPI endpoints) to verify that they implement comprehensive error handling: try-catch blocks around business logic, validation of inputs before processing, sanitization of error messages before returning to clients, appropriate HTTP status codes, and logging for debugging. Missing error handling in APIs is particularly dangerous because these endpoints are exposed to potentially malicious external traffic. The detector flags routes lacking these protections and recommends implementing centralized error handling middleware, consistent error response formats, proper status codes (4xx for client errors, 5xx for server errors), and error logging without exposing sensitive details.

### 13. Missing Input Validation
**Detector**: `checkMissingValidation()` (pattern + AI) | **Category**: security | **Priority**: 10

API endpoints that process user input without validation are vulnerable to injection attacks (SQL, NoSQL, command injection), type coercion bugs, and unexpected application behavior. This detector analyzes API routes to check whether they validate request parameters, body content, query strings, and headers before using them in business logic. It looks for validation libraries (Zod, Joi, Yup, class-validator), type guards, sanitization functions, or manual validation logic. Endpoints that directly use `req.body`, `req.query`, or `req.params` without any validation layer are flagged as critical vulnerabilities. The AI analysis can identify more subtle validation gaps, such as checking for field presence but not format/range/type. Proper validation should enforce type constraints, format requirements (email, UUID, etc.), range limits, required fields, and sanitize inputs to prevent injection attacks. Recommended solutions include using schema validation libraries, implementing validation middleware, and following the principle of "never trust user input."

---

## React & Component Patterns

### 14. React Hook Dependencies
**Detector**: `checkReactHookDeps()` (pattern + AI) | **Category**: code-quality | **Priority**: 8

React hooks like `useEffect`, `useCallback`, and `useMemo` require dependency arrays to specify which values they depend on—missing or incorrect dependencies can cause stale closures, infinite loops, or missed updates. This detector analyzes hook calls by parsing their dependency arrays and comparing them to variables referenced in the hook's callback function. It identifies missing dependencies (variables used but not listed), unnecessary dependencies (values listed but not used), and misuse of empty arrays when dependencies should exist. ESLint's `react-hooks/exhaustive-deps` rule also catches these, but this detector provides broader context and can run during the refactoring analysis phase. Missing dependencies cause bugs where the callback uses stale values from previous renders; extra dependencies cause unnecessary re-execution. The fix involves ensuring the dependency array accurately reflects all external values used within the callback, or reconsidering the hook's design if the dependencies are too complex.

### 15. Component Complexity
**Detector**: `checkComponentComplexity()` (strategy + AI) | **Category**: architecture | **Priority**: 8

React components that do too much violate the Single Responsibility Principle and become difficult to test, reuse, and maintain. This detector identifies complex components using multiple heuristics: line count (>300 lines), number of hooks (>10), number of props (>8), JSX depth/nesting levels, number of local state variables, and amount of business logic. The AI component can identify more subtle complexity markers like components that handle multiple user flows, mix concerns (data fetching + business logic + presentation), or contain multiple conditional rendering branches. Complex components are prime candidates for splitting: extract presentational sub-components, move business logic to custom hooks, lift state management to context or external stores, and separate data fetching from rendering. Reducing component complexity improves testability (simpler components = simpler tests), reusability (focused components can be used in multiple contexts), and team velocity (easier to understand and modify).

### 16. Prop Drilling
**Detector**: `checkPropDrilling()` (AI + pattern) | **Category**: architecture | **Priority**: 8

Prop drilling occurs when props are passed through multiple component layers where intermediate components don't use them—they only exist to pass data to deeply nested children. This detector identifies prop drilling by analyzing component trees and tracking props that are accepted but only used in prop spreads or passed to children unchanged. For example: `ParentComponent` passes `userId` to `MiddleComponent`, which passes it to `ChildComponent`, which passes it to `GrandchildComponent`—but only `GrandchildComponent` actually uses it. Prop drilling creates tight coupling, makes refactoring difficult (changing the prop requires updating every intermediate component), and clutters component interfaces. The recommended solutions are React Context (for application-wide state like theme or auth), component composition (passing components as children instead of data as props), or state management libraries (Redux, Zustand, Jotai) for complex shared state. The AI analyzer is particularly good at identifying prop drilling patterns by following data flow through component trees.

---

## Performance Optimization

### 17. Inefficient Renders
**Detector**: `checkInefficientRenders()` (AI + pattern) | **Category**: performance | **Priority**: 7

React components re-render when their props change, state updates, or parent re-renders—but unnecessary re-renders waste CPU cycles and can cause UI lag, especially in large component trees or on lower-powered devices. This detector identifies components likely to re-render unnecessarily using several signals: components without React.memo wrapping despite receiving stable props, components that create new object/array literals in render (causing shallow equality checks to fail), inline arrow function definitions in JSX props (creating new function references each render), and context consumers that don't select specific values (re-rendering when any context value changes). The AI component can analyze component relationships to identify render cascades where parent re-renders trigger child re-renders unnecessarily. Fixes include wrapping components with React.memo, using useCallback for function props, using useMemo for computed values, extracting static configuration outside render, and optimizing context with multiple contexts or selectors.

### 18. Missing Memoization
**Detector**: `checkMissingMemoization()` (pattern + AI) | **Category**: performance | **Priority**: 7

Expensive calculations performed on every render waste resources and can cause jank, especially for filtering large lists, complex computations, or data transformations. This detector identifies candidates for memoization by finding computationally expensive operations in component bodies: array methods like map/filter/reduce on large datasets, complex mathematical calculations, recursive functions, object transformations, and sorting operations. It checks whether these operations are wrapped in `useMemo` hooks with appropriate dependencies. When expensive operations lack memoization and run on every render (even when their inputs haven't changed), performance suffers. The detector also flags cases where memoization is present but dependencies are incorrect, causing either unnecessary recalculation or stale results. The fix is to wrap expensive calculations in `useMemo` with accurate dependency arrays, though over-memoization can also harm performance by adding overhead—the key is measuring and memoizing only operations that are actually expensive and frequently executed.

---

## Architecture & Design

### 19. Circular Dependencies
**Detector**: `checkCircularDependencies()` (dependency graph analysis) | **Category**: architecture | **Priority**: 6

Circular dependencies occur when module A imports module B, and module B (directly or indirectly) imports module A, creating a dependency cycle. This detector builds a dependency graph by parsing import/require statements in all files, then performs cycle detection using algorithms like depth-first search with a recursion stack. Cycles are problematic because they make code harder to understand (unclear which module is "primary"), complicate testing (can't test modules in isolation), cause initialization order issues (which module initializes first?), and can lead to runtime errors in some module systems. In JavaScript, circular dependencies sometimes "work" due to hoisting and how module resolution handles cycles, but they're a code smell indicating poor module boundaries and tight coupling. The fix involves analyzing the coupling between modules and refactoring to break cycles: extract shared code to a new module that both can import, merge tightly coupled modules, use dependency injection, or introduce interfaces/abstractions to invert dependencies.

---

## Testing & Coverage

### 20. Missing Test Coverage
**Detector**: `checkMissingTests()` (file structure analysis) | **Category**: testing | **Priority**: 5

Code without tests is brittle—refactoring becomes risky, bugs slip through, and confidence in changes decreases. This detector identifies files that should have tests but don't by scanning for source files (components, utilities, services, API routes) and checking for corresponding test files using common naming conventions (.test.ts, .spec.ts, __tests__ directory). For example, if `components/Button.tsx` exists but `components/Button.test.tsx` and `components/__tests__/Button.test.tsx` don't, it's flagged. The detector can also integrate with coverage reports (if available) to identify files below coverage thresholds. While not every file needs tests (some configuration files or simple type definitions are fine without tests), critical business logic, components, and API endpoints should have comprehensive test coverage. The recommended fix is to write unit tests for utilities and functions, component tests for React components (using React Testing Library), and integration tests for API endpoints, prioritizing high-value code paths first.

---

## Technology-Specific Enhancements

### Next.js Strategy Enhancements

The Next.js scan strategy (`NextJSScanStrategy.ts`) includes several framework-specific checks beyond the generic techniques:

**Client/Server Mixing Detection**: Identifies files with `'use client'` directive that also import server-only APIs like `cookies()`, `headers()`, or `draftMode()`. This mixing causes runtime errors because client components can't access server-only APIs. The fix is to split the file into separate server and client components.

**Image Optimization Detection**: Finds HTML `<img>` tags in component files and recommends migrating to Next.js `<Image>` component for automatic optimization (lazy loading, responsive images, modern formats like WebP/AVIF). The detector counts `<img>` occurrences and checks whether `next/image` is already imported.

**Dynamic Import Opportunities**: Identifies large client components (>300 lines) or components using heavy libraries (Chart.js, Three.js, rich text editors) that could benefit from code splitting using `next/dynamic`. This reduces initial bundle size by loading these components only when needed.

**Metadata API Migration**: Detects usage of the legacy `next/head` component in App Router files and suggests migrating to the modern Metadata API or `generateMetadata()` function for improved SEO and better integration with App Router features.

### Strategy-Specific Patterns

Other technology strategies (FastAPI, Express, React Native) implement similar framework-specific checks. For example:
- **FastAPI**: Checks for proper async/await usage, Pydantic model validation, dependency injection patterns
- **Express**: Validates middleware order, error handling middleware presence, security headers
- **React Native**: Identifies performance anti-patterns (non-virtualized lists), accessibility issues, platform-specific code without proper checks

---

## Fine-Tuning Recommendations

When fine-tuning these scan techniques, consider:

1. **Threshold Adjustment**: Line count limits (50 for long functions, 500 for large files) may need adjustment based on team conventions and codebase characteristics

2. **False Positive Reduction**: Pattern-based detectors can be refined with more sophisticated regex or AST parsing to reduce false positives (e.g., unused imports that are actually type-only imports)

3. **Priority Calibration**: Severity and effort estimates should be calibrated based on your team's velocity and actual time spent on similar refactorings

4. **Context Enhancement**: AI-powered analysis benefits from richer project context (architecture documentation, coding standards, recent tech debt items) provided in the prompt

5. **Technique Composition**: Some issues are better detected through combinations of techniques (e.g., prop drilling + component complexity often appear together)

6. **Incremental Rollout**: When introducing new techniques, start with higher-severity, lower-effort checks to build confidence before tackling complex architectural issues

7. **Feedback Loops**: Track which opportunities teams actually implement vs. ignore to identify techniques that provide the most value vs. noise

---

**Last Updated**: 2025-11-21
**Module Version**: RefactorWizard v2.0
**Maintained By**: Vibeman Development Team
