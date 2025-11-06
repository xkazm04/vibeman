# Refactoring Batch 1 - Recommended Fixes

## Critical Type Safety Fix

### scripts/create-refactor-pr.ts (Line 53)

**Before:**
```typescript
interface RefactorResult {
  // ...
  config: any;  // ❌ No type safety
}
```

**After:**
```typescript
interface RefactorResultConfig {
  severity?: string;
  categories?: string[];
  excludePatterns?: string[];
  provider?: string;
  model?: string;
  autoPR?: boolean;
  prBranch?: string;
  prTitle?: string;
  prBody?: string;
}

interface RefactorResult {
  // ...
  config: RefactorResultConfig;  // ✅ Type safe
}
```

## Console.log Replacement Pattern

### Recommended Logger Utility

Create `scripts/utils/logger.ts`:

```typescript
export class Logger {
  constructor(private verbose: boolean = false) {}

  log(message: string) {
    if (this.verbose) {
      console.log(message);
    }
  }

  error(message: string) {
    console.error(message);
  }

  output(data: string) {
    console.log(data);
  }

  section(title: string) {
    if (this.verbose) {
      console.log(`\n${title}`);
      console.log('='.repeat(title.length));
    }
  }
}
```

### Usage Example

**Before:**
```typescript
if (options.verbose) {
  console.log('Starting analysis...');
}
console.error('Error occurred');
console.log(jsonOutput);
```

**After:**
```typescript
const logger = new Logger(options.verbose);
logger.log('Starting analysis...');
logger.error('Error occurred');
logger.output(jsonOutput);
```

## Function Extraction Pattern

### Long Function Refactoring

**Before (100+ lines):**
```typescript
async function main() {
  // Parse args (20 lines)
  // Validate (15 lines)
  // Run analysis (30 lines)
  // Generate output (25 lines)
  // Handle errors (20 lines)
}
```

**After (<30 lines each):**
```typescript
async function main() {
  const options = parseAndValidateArgs();
  const result = await runAnalysis(options);
  await outputResults(result, options);
}

function parseAndValidateArgs(): ValidatedOptions {
  const options = parseArgs();
  validateOptions(options);
  return options;
}

async function runAnalysis(options: ValidatedOptions): Promise<AnalysisResult> {
  const config = loadConfig(options.config);
  const data = await analyzeProject(options.project, config);
  return processResults(data, config);
}

async function outputResults(result: AnalysisResult, options: ValidatedOptions) {
  const formatted = formatOutput(result);
  await writeOutput(formatted, options);
}
```

## Store Pattern: Zustand Best Practices

### When Duplication Is OK

```typescript
// ✅ GOOD: Each state slice has its own setter (this is Zustand pattern)
setOpportunities: (opportunities) => set({ opportunities }),
setAnalysisStatus: (status) => set({ analysisStatus: status }),
setAnalysisProgress: (progress) => set({ analysisProgress: progress }),
```

### When to Extract

```typescript
// ❌ BAD: Repeated fetch logic
const data1 = await fetch('/api/endpoint1').then(r => r.json());
const data2 = await fetch('/api/endpoint2').then(r => r.json());
const data3 = await fetch('/api/endpoint3').then(r => r.json());

// ✅ GOOD: Extract to utility
const fetchJSON = async (endpoint: string) => {
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return response.json();
};

const data1 = await fetchJSON('/api/endpoint1');
const data2 = await fetchJSON('/api/endpoint2');
const data3 = await fetchJSON('/api/endpoint3');
```

## Type Safety for Stores

### src/stores/refactorStore.ts (Lines 113, 256)

**Before:**
```typescript
selectedScanGroups: new Set(data.wizardPlan.recommendedGroups.map((g: any) => g.id)),
```

**After:**
```typescript
interface WizardPlanGroup {
  id: string;
  name: string;
  // ... other properties
}

interface WizardPlan {
  recommendedGroups: WizardPlanGroup[];
  // ... other properties
}

selectedScanGroups: new Set(data.wizardPlan.recommendedGroups.map((g: WizardPlanGroup) => g.id)),
```

## Automated Quality Checks

Add to `.eslintrc.js`:

```javascript
{
  rules: {
    // Prevent console.log in production code (allow in scripts/)
    'no-console': ['error', { allow: ['warn', 'error'] }],

    // Warn on long functions
    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],

    // Prevent 'any' type
    '@typescript-eslint/no-explicit-any': 'error',

    // Complexity checks
    'complexity': ['warn', 10],
  }
}
```

## Implementation Checklist

- [x] Document all issues
- [x] Create fix recommendations
- [ ] Apply type safety fixes
- [ ] Extract logger utility
- [ ] Refactor long functions
- [ ] Update ESLint rules
- [ ] Run tests
- [ ] Update CI/CD pipeline

---

**Note:** These are recommendations based on automated analysis. Each fix should be reviewed and tested before merging to ensure it doesn't break existing functionality.
