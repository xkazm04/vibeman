# Context Module File Structure

## Directory Organization

```
src/app/coder/Context/
├── lib/                                    # Core utilities and API operations
│   ├── contextApi.ts                       # API operations (load, save, generate)
│   ├── contextUtils.ts                     # Pure utility functions
│   ├── constants.ts                        # Configuration and constants
│   ├── useContextDetail.ts                 # Context detail routing hook
│   └── index.ts                            # Barrel exports
│
├── ContextFile/                            # Context file management components
│   ├── ContextFileModal.tsx                # Main modal orchestrator (215 lines)
│   ├── ContextFileFooter.tsx               # Stats footer (40 lines) ✨ NEW
│   ├── ContextModalHeader.tsx              # Modal header
│   ├── ContextModalContent.tsx             # Modal content area
│   └── ContextPlaceholder.ts               # Placeholder generation
│
├── ContextDetail/                          # Context detail view components
│   ├── ContextDetailView.tsx               # Main view orchestrator (144 lines)
│   ├── ContextDetailHeader.tsx             # Header with actions (105 lines) ✨ NEW
│   ├── ContextDetailInfo.tsx               # Info panel (65 lines) ✨ NEW
│   ├── ContextDetailTimeline.tsx           # Timeline panel (50 lines) ✨ NEW
│   ├── ContextDetailFiles.tsx              # Files list (45 lines) ✨ NEW
│   ├── ContextDetailRelated.tsx            # Related contexts (55 lines) ✨ NEW
│   ├── GroupDetailView.tsx                 # Group detail view
│   └── index.ts                            # Exports
│
├── ContextGroups/                          # Context group management
│   ├── ContextSection.tsx                  # Group section container
│   ├── GroupManagementModal.tsx            # Group CRUD modal
│   ├── ContextJailCard.tsx                 # Jail card component
│   └── ContextCards.tsx                    # Context cards grid
│
├── ContextMenu/                            # Context menu components
│   ├── ContextMenu.tsx                     # Main context menu
│   ├── EnhancedContextEditModal.tsx        # Edit modal
│   ├── ContextSaveModal.tsx                # Save dialog
│   ├── SelectedFilesList.tsx               # Selected files display
│   └── FileTreeSelector.tsx                # File tree selector
│
├── HorizontalContextBar.tsx                # Main horizontal bar
├── ContextPanel.tsx                        # Context panel
├── ContextList.tsx                         # Context list view
├── ContextCard.tsx                         # Individual context card
├── index.ts                                # Module exports
└── templates/                              # Context templates

```

## Component Descriptions

### Library Files (`lib/`)

#### `contextApi.ts`
**Exports**: API operation functions
- `loadContextFile(contextId): Promise<string>`
- `generateContextFile(options): Promise<string>`
- `generateContextBackground(options): Promise<void>`
- `saveContextFile(folderPath, fileName, content, projectPath): Promise<void>`
- `generateContextWithPrompt(...): Promise<{ success, error? }>`

**Usage**:
```typescript
import { loadContextFile, saveContextFile } from '../lib';

const content = await loadContextFile(contextId);
await saveContextFile('docs', 'context.md', content, projectPath);
```

#### `contextUtils.ts`
**Exports**: Pure utility functions
- Date/Time: `formatDate()`, `calculateDaysSince()`
- Icons: `getGroupIcon()`
- Files: `calculateTotalFiles()`, `getUniqueFilePaths()`, `extractFileName()`, `truncatePath()`
- Layout: `getGridLayout()`, `getDisplayFilePaths()`
- Statistics: `calculateGroupStats()`
- Sorting/Filtering: `sortContextsByDate()`, `filterContextsByGroup()`, `getRelatedContexts()`
- Validation: `validateContextName()`, `isContextNameDuplicate()`
- Markdown: `getMarkdownStats()`
- Colors: `getColorWithOpacity()`

**Usage**:
```typescript
import { formatDate, calculateDaysSince, getGroupIcon } from '../lib';

const formatted = formatDate(new Date(), 'long');
const days = calculateDaysSince(context.createdAt);
const Icon = getGroupIcon(group.name);
```

#### `constants.ts`
**Exports**: Configuration constants
- `GROUP_ICON_MAPPING`: Icon selection patterns
- `ICON_OPTIONS`: Available icons array
- `DATE_FORMAT_OPTIONS`: Date format configs
- `GRID_LAYOUT_CONFIG`: Responsive grid classes
- `ANIMATION_CONFIG`: Animation settings
- `MODAL_CONSTANTS`: Modal configurations
- `FILE_DISPLAY_CONFIG`: File display settings
- `CONTEXT_MENU_ACTIONS`: Action type constants

**Usage**:
```typescript
import { ICON_OPTIONS, ANIMATION_CONFIG, CONTEXT_MENU_ACTIONS } from '../lib';

// Use icon options in select
{ICON_OPTIONS.map(opt => <option key={opt.name}>{opt.name}</option>)}

// Use animation config
<motion.div transition={{ ...ANIMATION_CONFIG.SPRING }} />

// Use action constants
if (action === CONTEXT_MENU_ACTIONS.DELETE) { ... }
```

### ContextFile Components

#### `ContextFileModal.tsx` (Refactored)
**Props**:
```typescript
interface ContextFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: Context;
}
```
**Responsibilities**: Orchestrates modal, manages state, handles API calls via lib/

#### `ContextFileFooter.tsx` ✨ NEW
**Props**:
```typescript
interface ContextFileFooterProps {
  markdownContent: string;
  previewMode: 'edit' | 'preview';
}
```
**Responsibilities**: Display markdown stats, keyboard hints

### ContextDetail Components

#### `ContextDetailView.tsx` (Refactored)
**Props**:
```typescript
interface ContextDetailViewProps {
  contextId: string;
  onClose: () => void;
}
```
**Responsibilities**: Orchestrates detail view, manages state, composes sub-components

#### `ContextDetailHeader.tsx` ✨ NEW
**Props**:
```typescript
interface ContextDetailHeaderProps {
  contextGroup: ContextGroup | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
```
**Responsibilities**: Navigation, group info display, action buttons

#### `ContextDetailInfo.tsx` ✨ NEW
**Props**:
```typescript
interface ContextDetailInfoProps {
  context: Context;
  contextGroup: ContextGroup | null;
}
```
**Responsibilities**: Display basic context information

#### `ContextDetailTimeline.tsx` ✨ NEW
**Props**:
```typescript
interface ContextDetailTimelineProps {
  context: Context;
}
```
**Responsibilities**: Display creation and update timestamps

#### `ContextDetailFiles.tsx` ✨ NEW
**Props**:
```typescript
interface ContextDetailFilesProps {
  context: Context;
}
```
**Responsibilities**: Display file paths grid

#### `ContextDetailRelated.tsx` ✨ NEW
**Props**:
```typescript
interface ContextDetailRelatedProps {
  groupContexts: Context[];
  contextGroup: ContextGroup | null;
  allGroups: ContextGroup[];
}
```
**Responsibilities**: Display related contexts in same group

## Import Patterns

### From lib/
```typescript
// Import utilities
import { formatDate, calculateDaysSince, getGroupIcon } from '../lib';

// Import API functions
import { loadContextFile, saveContextFile } from '../lib';

// Import constants
import { ICON_OPTIONS, ANIMATION_CONFIG } from '../lib';

// Import everything
import * as ContextLib from '../lib';
```

### Component Imports
```typescript
// Import detail components
import ContextDetailHeader from './ContextDetailHeader';
import ContextDetailInfo from './ContextDetailInfo';
import ContextDetailTimeline from './ContextDetailTimeline';

// Or from index
import { ContextDetailHeader, ContextDetailInfo } from './';
```

## Type Definitions

### Core Types (from stores)
```typescript
interface Context {
  id: string;
  name: string;
  description?: string;
  filePaths: string[];
  groupId: string | null;
  projectId: string;
  hasContextFile?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ContextGroup {
  id: string;
  name: string;
  color: string;
  projectId: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### API Types (from lib/contextApi.ts)
```typescript
interface GenerateContextOptions {
  context: Context;
  onProgress?: (status: string) => void;
  signal?: AbortSignal;
}

interface BackgroundGenerationOptions {
  contextId: string;
  contextName: string;
  filePaths: string[];
  projectPath: string;
  projectId: string;
}
```

### Utility Return Types
```typescript
// From calculateGroupStats
interface GroupStats {
  totalContexts: number;
  totalFiles: number;
  uniqueFiles: number;
  averageFilesPerContext: number;
}

// From getDisplayFilePaths
interface DisplayPaths {
  displayed: string[];
  remaining: number;
}

// From getMarkdownStats
interface MarkdownStats {
  lines: number;
  characters: number;
  words: number;
}

// From validateContextName
interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

## Usage Examples

### Example 1: Using lib/ in a component
```typescript
import React from 'react';
import { formatDate, getGroupIcon, calculateDaysSince } from '../lib';

function MyComponent({ context, group }) {
  const Icon = getGroupIcon(group.name);
  const created = formatDate(context.createdAt, 'long');
  const age = calculateDaysSince(context.createdAt);
  
  return (
    <div>
      <Icon className="w-6 h-6" style={{ color: group.color }} />
      <p>Created: {created}</p>
      <p>Age: {age} days</p>
    </div>
  );
}
```

### Example 2: API Operations
```typescript
import { loadContextFile, saveContextFile } from '../lib';

async function handleLoad(contextId: string) {
  try {
    const content = await loadContextFile(contextId);
    setMarkdown(content);
  } catch (error) {
    console.error('Failed to load:', error);
  }
}

async function handleSave(content: string) {
  try {
    await saveContextFile('docs', 'context.md', content, projectPath);
    console.log('Saved successfully');
  } catch (error) {
    console.error('Failed to save:', error);
  }
}
```

### Example 3: Using Constants
```typescript
import { ICON_OPTIONS, DATE_FORMAT_OPTIONS, CONTEXT_MENU_ACTIONS } from '../lib';

// Icon selector
<select>
  {ICON_OPTIONS.map(opt => (
    <option key={opt.name} value={opt.name}>{opt.name}</option>
  ))}
</select>

// Date formatting
const formatted = new Intl.DateTimeFormat('en-US', DATE_FORMAT_OPTIONS.LONG).format(date);

// Action handling
if (action === CONTEXT_MENU_ACTIONS.DELETE) {
  handleDelete();
}
```

### Example 4: Composing Detail Components
```typescript
import React from 'react';
import ContextDetailHeader from './ContextDetailHeader';
import ContextDetailInfo from './ContextDetailInfo';
import ContextDetailTimeline from './ContextDetailTimeline';

function ContextDetailView({ context, group, onClose }) {
  return (
    <div>
      <ContextDetailHeader
        contextGroup={group}
        onClose={onClose}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <ContextDetailInfo context={context} contextGroup={group} />
        <ContextDetailTimeline context={context} />
      </div>
    </div>
  );
}
```

## Best Practices

1. **Always import from lib/ barrel exports**
   ```typescript
   ✅ import { formatDate, getGroupIcon } from '../lib';
   ❌ import { formatDate } from '../lib/contextUtils';
   ```

2. **Use constants instead of magic values**
   ```typescript
   ✅ if (action === CONTEXT_MENU_ACTIONS.DELETE)
   ❌ if (action === 'delete')
   ```

3. **Prefer utility functions over inline logic**
   ```typescript
   ✅ const days = calculateDaysSince(date);
   ❌ const days = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
   ```

4. **Use API functions from lib/**
   ```typescript
   ✅ await saveContextFile(folder, file, content, path);
   ❌ await fetch('/api/disk/save-context-file', { ... });
   ```

5. **Component composition over monolithic components**
   ```typescript
   ✅ <ContextDetailInfo /> + <ContextDetailTimeline />
   ❌ All logic in single 300+ line component
   ```

## File Size Reference

| File | Lines | Category | Status |
|------|-------|----------|--------|
| contextApi.ts | ~150 | lib | ✅ Complete |
| contextUtils.ts | ~250 | lib | ✅ Complete |
| constants.ts | ~130 | lib | ✅ Complete |
| ContextFileModal.tsx | 215 | Component | ✅ Refactored |
| ContextFileFooter.tsx | 40 | Component | ✅ New |
| ContextDetailView.tsx | 144 | Component | ✅ Refactored |
| ContextDetailHeader.tsx | 105 | Component | ✅ New |
| ContextDetailInfo.tsx | 65 | Component | ✅ New |
| ContextDetailTimeline.tsx | 50 | Component | ✅ New |
| ContextDetailFiles.tsx | 45 | Component | ✅ New |
| ContextDetailRelated.tsx | 55 | Component | ✅ New |

## Next Steps

Components still to be refactored:
- GroupDetailView.tsx → Break into Header, Stats, Contexts components
- ContextSection.tsx → Extract Header and Empty components
- GroupManagementModal.tsx → Extract Header, Form, List components
- ContextMenu.tsx → Extract Menu List and Item components
- EnhancedContextEditModal.tsx → Extract Form and FileManager
- HorizontalContextBar.tsx → Extract Header and Groups grid
