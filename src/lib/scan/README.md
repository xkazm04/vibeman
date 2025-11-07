# ScanStrategy Plugin Architecture

This directory contains the plugin-based architecture for multi-technology stack scanning in the RefactorWizard.

## Overview

The ScanStrategy system decouples technology-specific scanning logic from the RefactorWizard UI, enabling seamless support for multiple tech stacks without modifying core wizard code.

## Architecture

### Core Components

1. **ScanStrategy.ts** - Interface and base class
   - `ScanStrategy` interface defines the contract for all strategies
   - `BaseScanStrategy` abstract class provides common functionality
   - `ProjectType` type defines supported tech stacks

2. **ScanStrategyFactory.ts** - Factory and registry
   - Auto-detects project type based on file system markers
   - Manages strategy instances and registration
   - Provides convenience functions for strategy access

3. **strategies/** - Concrete implementations
   - `NextJSScanStrategy` - Next.js applications (App Router, Pages Router)
   - `FastAPIScanStrategy` - FastAPI Python applications
   - `ExpressScanStrategy` - Express.js Node.js applications
   - `ReactNativeScanStrategy` - React Native mobile applications

## Usage

### Basic Usage

```typescript
import { getScanStrategy } from '@/lib/scan';

// Auto-detect and get strategy
const strategy = await getScanStrategy(projectPath);

// Or specify explicit project type
const strategy = await getScanStrategy(projectPath, 'nextjs');

// Scan files
const files = await strategy.scanProjectFiles(projectPath);

// Detect opportunities
const opportunities = strategy.detectOpportunities(files);
```

### Creating a Custom Strategy

```typescript
import { BaseScanStrategy } from '@/lib/scan';
import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';

export class VueJSScanStrategy extends BaseScanStrategy {
  readonly name = 'Vue.js Scanner';
  readonly techStack = 'vue' as const;

  getScanPatterns(): string[] {
    return ['**/*.vue', '**/*.js', '**/*.ts'];
  }

  getIgnorePatterns(): string[] {
    return ['**/node_modules/**', '**/dist/**'];
  }

  detectOpportunities(files: FileAnalysis[]): RefactorOpportunity[] {
    // Implement Vue-specific detection logic
    return [];
  }

  getRecommendedTechniqueGroups(): string[] {
    return ['code-quality', 'vue-specific'];
  }

  async canHandle(projectPath: string, projectType?: string): Promise<boolean> {
    // Implement detection logic (check for package.json with vue dependency)
    return projectType === 'vue';
  }
}
```

### Registering a Custom Strategy

```typescript
import { registerScanStrategy } from '@/lib/scan';
import { VueJSScanStrategy } from './strategies/VueJSScanStrategy';

registerScanStrategy({
  name: 'Vue.js Scanner',
  techStack: 'vue',
  description: 'Scanner for Vue.js applications',
  strategyClass: VueJSScanStrategy,
});
```

## Strategy Lifecycle

1. **Detection Phase**
   - Factory calls `canHandle()` on each registered strategy
   - Strategies check for tech-specific markers (config files, dependencies)
   - First matching strategy is selected

2. **Scanning Phase**
   - Strategy provides scan patterns and ignore patterns
   - `scanProjectFiles()` discovers and reads relevant files
   - Returns array of `FileAnalysis` objects

3. **Analysis Phase**
   - `detectOpportunities()` applies tech-specific pattern detection
   - Returns array of `RefactorOpportunity` objects
   - Opportunities include severity, impact, effort estimates

## Adding Support for New Technologies

To add support for a new technology stack:

1. Create a new strategy file in `strategies/` directory
2. Extend `BaseScanStrategy` or implement `ScanStrategy`
3. Implement all required methods:
   - `getScanPatterns()` - File patterns to scan
   - `getIgnorePatterns()` - Directories/files to skip
   - `detectOpportunities()` - Tech-specific analysis
   - `getRecommendedTechniqueGroups()` - Relevant scan groups
   - `canHandle()` - Auto-detection logic
4. Register the strategy in `ScanStrategyFactory.ts`
5. Export from `index.ts`

## Integration Points

### RefactorWizard

The RefactorWizard automatically uses the appropriate strategy:

```typescript
// In refactorAnalyzer.ts
export async function analyzeProject(
  projectPath: string,
  useAI: boolean,
  provider?: string,
  model?: string,
  selectedGroups?: string[],
  projectType?: ProjectType
): Promise<AnalysisResult> {
  const strategy = await getScanStrategy(projectPath, projectType);
  const files = await strategy.scanProjectFiles(projectPath);
  const opportunities = strategy.detectOpportunities(files);
  // ... combine with AI analysis
}
```

### API Route

The API route accepts an optional `projectType` parameter:

```typescript
POST /api/refactor/analyze
{
  "projectPath": "/path/to/project",
  "projectType": "nextjs", // optional
  "useAI": true,
  "provider": "gemini",
  "selectedGroups": ["code-quality"]
}
```

## Benefits

1. **Isolation** - Tech-specific logic is isolated in strategy modules
2. **Extensibility** - New tech stacks can be added without modifying core code
3. **Maintainability** - Each strategy is self-contained and testable
4. **Auto-detection** - Projects are automatically identified by their markers
5. **Flexibility** - Strategies can be registered, replaced, or extended at runtime

## Tech-Specific Features

### Next.js Strategy
- Client/Server component mixing detection
- Image optimization recommendations
- Dynamic import suggestions
- Metadata API migration hints
- Server Actions opportunities

### FastAPI Strategy
- Dependency injection patterns
- Async endpoint recommendations
- Pydantic model usage
- Error handling checks
- CORS configuration review

### Express Strategy
- Error handling middleware
- Async error handling
- Security middleware (Helmet, rate limiting)
- Input validation
- CORS configuration

### React Native Strategy
- FlatList optimization
- Image optimization
- Memory leak detection
- Platform-specific code patterns
- Accessibility checks

## Future Enhancements

Potential improvements to the system:

- Strategy composition (combine multiple strategies)
- Strategy priority/weighting system
- Per-strategy configuration options
- Dynamic strategy loading from plugins
- Strategy performance metrics
- Custom pattern detector plugins
