# Backlog Module - File Structure

## Directory Structure

```
src/app/coder/Backlog/
├── lib/                                    # Core business logic and utilities
│   ├── backlogTypes.ts                    # TypeScript type definitions
│   ├── fileOperations.ts                  # File I/O operations
│   ├── codeParser.ts                      # AI response parsing
│   ├── promptBuilder.ts                   # Prompt construction
│   ├── taskOperations.ts                  # API operations
│   ├── backlogUtils.ts                    # General utilities
│   └── index.ts                           # Barrel exports
│
├── prompts/                                # LLM prompt templates
│   ├── backlogTaskPrompt.ts              # Task generation prompts
│   ├── codingTaskPrompt.ts               # Code generation prompts
│   └── index.ts                           # Barrel exports
│
├── backlogComponents/                      # Main generation orchestration
│   ├── generateBacklogTask.ts            # Task generation logic
│   └── generateCodingTask.ts             # Code generation logic
│
├── Backlog.tsx                            # Main backlog list component
├── BacklogDetail.tsx                      # Task detail modal
├── BacklogItem.tsx                        # Individual task card
├── BacklogItemActions.tsx                 # Task action buttons
├── BacklogDescription.tsx                 # Task description display
├── BacklogSection.tsx                     # Section wrapper
├── BacklogTaskInput.tsx                   # Task input form
└── REFACTORING_SUMMARY.md                 # This file
```

## Import Examples

### Using Types
```typescript
import { BacklogTask, GeneratedCode, ImpactedFile } from './lib/backlogTypes';
```

### Using File Operations
```typescript
import { readFileFromProject, readContextFile } from './lib/fileOperations';
```

### Using Task Operations
```typescript
import { updateTaskStatus, startCodingTask, queueCodingBackgroundTask } from './lib/taskOperations';
```

### Using Utilities
```typescript
import { formatRelativeDate, getFilenameFromPath, validateTaskData } from './lib/backlogUtils';
```

### Using Prompts
```typescript
import { generateBacklogTaskPrompt } from './prompts/backlogTaskPrompt';
import { generateCodingTaskPrompt } from './prompts/codingTaskPrompt';
```

### Using Generation Functions
```typescript
import { generateBacklogTask } from './backlogComponents/generateBacklogTask';
import { generateCodingTask } from './backlogComponents/generateCodingTask';
```

## Key Files

### Core Types (`lib/backlogTypes.ts`)
Defines all interfaces and types used throughout the module.

### File Operations (`lib/fileOperations.ts`)
Handles all file reading with proper error handling.

### Code Parser (`lib/codeParser.ts`)
Extracts code from LLM responses using multiple pattern matching strategies.

### Prompt Builder (`lib/promptBuilder.ts`)
Constructs comprehensive prompts for LLM operations.

### Task Operations (`lib/taskOperations.ts`)
Manages all API interactions for tasks.

### Utilities (`lib/backlogUtils.ts`)
General-purpose helper functions.

### Prompts (`prompts/`)
Contains all LLM prompt templates as separate, maintainable files.

### Generation Components (`backlogComponents/`)
Orchestrates the main business logic for task and code generation.
